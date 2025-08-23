import vm from "node:vm";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

type TestCase = { input: unknown[]; expected: unknown };

function deepEqual(a: any, b: any): boolean {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

export async function runAllTests(
  code: string,
  language: string, //can be js,python. cpp will be handled later
  tests: TestCase[],
  perTestMs = 2000
): Promise<{ passed: number; total: number; logs: string[] }> {
  const logs: string[] = [];
  let passed = 0;

  if (language === "javascript" || language === "js") {
    // ---- Run inside Node VM ----
    const context: any = {
      module: { exports: {} },
      exports: {},
      console: { log: (...args: any[]) => logs.push(args.join(" ")) }
    };
    vm.createContext(context);

    const script = new vm.Script(code);
    script.runInContext(context, { timeout: 1000 });

    const solution =
      context.module?.exports?.default ??
      context.module?.exports ??
      context.exports?.default;

    if (typeof solution !== "function") {
      throw new Error("Export your solution as a function (module.exports = function... or export default ...)");
    }

    for (const tc of tests) {
      const started = Date.now();
      const res = await Promise.race([
        Promise.resolve().then(() => solution(...(tc.input || []))),
        new Promise((_, rej) => setTimeout(() => rej(new Error("Time limit exceeded")), perTestMs)),
      ]);
      const elapsed = Date.now() - started;
      if (deepEqual(res, tc.expected)) passed++;
      else logs.push(`Expected ${JSON.stringify(tc.expected)}, got ${JSON.stringify(res)}`);
      logs.push(`Test ran in ${elapsed}ms`);
    }
  }

  else if (language === "python") {
    for (const tc of tests) {
      const argsJson = JSON.stringify(tc.input ?? []);
  
      // Build a flat, left-justified Python program (no leading indentation).
      const py =
        `${code}\n` +
        [
          'if __name__ == "__main__":',
          '    import sys, json',
          '    try:',
          '        args = json.loads(sys.argv[1]) if len(sys.argv) > 1 else []',
          '        out = solution(*args)',
          '        print(json.dumps(out))', // exactly one JSON line as the final output
          '    except Exception as e:',
          '        print(json.dumps({"__error__": str(e)}))',
        ].join('\n');
  
      try {
        // Send code via stdin (real newlines) and pass args as argv[1]
        // Note: JSON never includes single quotes, so wrapping args in single quotes is safe.
        const cmd = `python3 - '${argsJson}' <<'PY'\n${py}\nPY`;
        const { stdout, stderr } = await execAsync(cmd, { timeout: perTestMs });
  
        if (stderr?.trim()) logs.push(`PY STDERR: ${stderr.trim().slice(0, 500)}`);
  
        const lastLine =
          (stdout || '')
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .pop() || '';
  
        let output: any;
        try { output = JSON.parse(lastLine); } catch { output = lastLine; }
  
        if (output && typeof output === 'object' && '__error__' in output) {
          logs.push(`Python error: ${String((output as any).__error__)}`);
        }
  
        if (deepEqual(output, tc.expected)) {
          passed++;
        } else {
          logs.push(`Expected ${JSON.stringify(tc.expected)}, got ${JSON.stringify(output)}`);
        }
      } catch (err: any) {
        logs.push(`Python exec error: ${String(err.message).slice(0, 500)}`);
        if (err.stdout) logs.push(`PY STDOUT: ${String(err.stdout).slice(0, 500)}`);
        if (err.stderr) logs.push(`PY STDERR: ${String(err.stderr).slice(0, 500)}`);
      }
    }
  }
  


  else if (language === "cpp" || language === "c++") {
    // ---- Run C++ code ----
    // Expect user code to have a main() that prints the result
    const fs = await import("node:fs/promises");
    const path = "/tmp/submission.cpp";
    const bin = "/tmp/submission.out";
    await fs.writeFile(path, code);

    try {
      await execAsync(`g++ ${path} -o ${bin}`);
    } catch (err: any) {
      throw new Error("Compilation failed:\n" + err.stderr);
    }

    for (const tc of tests) {
      const inputJson = JSON.stringify(tc.input);
      try {
        const { stdout } = await execAsync(`${bin} '${inputJson}'`, { timeout: perTestMs });
        const output = JSON.parse(stdout.trim());
        if (deepEqual(output, tc.expected)) passed++;
        else logs.push(`Expected ${JSON.stringify(tc.expected)}, got ${JSON.stringify(output)}`);
      } catch (err: any) {
        logs.push(`Runtime error: ${err.message}`);
      }
    }
  }

  else {
    throw new Error(`Unsupported language: ${language}`);
  }

  return { passed, total: tests.length, logs };
}
