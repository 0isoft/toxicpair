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
      const inputJson = JSON.stringify(tc.input ?? []);
  
      // NO leading spaces in this template
      const py = `${code}
  import json, sys
  args = json.loads('${inputJson}')
  out = solution(*args)
  print(json.dumps(out))
  `;
  
      try {
        const { stdout } = await execAsync(
          // Safe single-quoted heredoc: shell won't expand anything
          `python3 - <<'PY'\n${py}\nPY`,
          { timeout: perTestMs }
        );
  
        const text = stdout.trim();
        let output: any;
        try { output = JSON.parse(text); } catch { output = text; }
  
        if (deepEqual(output, tc.expected)) passed++;
        else logs.push(`Expected ${JSON.stringify(tc.expected)}, got ${JSON.stringify(output)}`);
      } catch (err: any) {
        logs.push(`Python error: ${String(err.message).slice(0, 500)}`);
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
