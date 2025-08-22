import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Problem, Attempt } from "../lib/types";

function langStub(lang: string) {
  switch (lang) {
    case "javascript":
    case "js":
      return `// Export a function named "solution"
module.exports = function solution(/* args */) {
  // TODO: implement
  return null;
};`;
    case "python":
      return `# Define a function named "solution"
def solution(*args):
    # TODO: implement
    return None`;
    case "cpp":
      return `#include <bits/stdc++.h>
using namespace std;
// Expect JSON on argv[1], print JSON on stdout
int main(int argc, char** argv) {
  // TODO: parse argv[1] if needed and print a JSON result
  cout << "null";
  return 0;
}`;
    default:
      return "";
  }
}

export default function ProblemDetail() {
  const { id } = useParams();
  const api = useApi();
  const { token } = useAuth();
  const qc = useQueryClient();

  // ----- Problem data -----
  const { data: problem, isLoading, error } = useQuery({
    queryKey: ["problem", id],
    queryFn: () => api<Problem>(`/problems/${id}`),
    enabled: !!id,
  });

  // ----- Attempts list (only if logged in) -----
  const { data: attempts, isLoading: loadingAttempts } = useQuery({
    queryKey: ["attempts", id],
    queryFn: () => api<Attempt[]>(`/attempts?problemId=${id}`),
    enabled: !!token && !!id,
  });

  // ----- Editor state -----
  const [language, setLanguage] = useState<"javascript" | "python" | "cpp">("javascript");
  const [code, setCode] = useState<string>(() => langStub("javascript"));
  const [note, setNote] = useState<string | null>(null);

  function onChangeLanguage(next: "javascript" | "python" | "cpp") {
    setLanguage(next);
    // If the editor is empty or still equals previous stub, replace with new stub
    setCode((prev) => prev.trim() ? prev : langStub(next));
  }

  // ----- Submit attempt -----
  const submit = useMutation({
    mutationFn: async () => {
      const body = { problemId: Number(id), language, code };
      return api<Attempt>("/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onMutate: () => setNote(null),
    onSuccess: (res) => {
      setNote(`Submitted: ${res.status} (${res.passedCount}/${res.totalCount}) in ${res.runtimeMs ?? 0} ms`);
      // refresh attempts list
      qc.invalidateQueries({ queryKey: ["attempts", id] });
    },
    onError: (err: any) => setNote(err?.message || "Submission failed"),
  });

  const latest = useMemo(() => (attempts && attempts[0]) || null, [attempts]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Problem header */}
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-600">Failed to load problem.</p>}
      {problem && (
        <>
          <h2 className="text-2xl font-semibold">{problem.title}</h2>
          <div className="text-sm text-gray-500 mb-4">{problem.difficulty}</div>
          {problem.description && (
            <p className="mb-4 whitespace-pre-wrap">{problem.description}</p>
          )}
          {problem.examples && (
            <details className="mb-6">
              <summary className="cursor-pointer text-sm text-gray-700">Examples</summary>
              <pre className="bg-gray-50 border rounded p-3 text-sm overflow-auto">
                {JSON.stringify(problem.examples, null, 2)}
              </pre>
            </details>
          )}

          {/* Editor & Submit */}
          <section className="mt-6">
            {!token ? (
              <p className="text-sm text-gray-600">
                Log in to submit a solution.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700">Language</label>
                  <select
                    value={language}
                    onChange={(e) => onChangeLanguage(e.target.value as any)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>

                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={12}
                  spellCheck={false}
                  className="w-full font-mono text-sm border rounded p-3"
                  placeholder="Write your solution here…"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => submit.mutate()}
                    disabled={submit.isPending}
                    className="px-4 py-2 rounded bg-gray-900 text-white"
                  >
                    {submit.isPending ? "Running…" : "Run tests"}
                  </button>
                  {note && <span className="text-sm text-gray-700">{note}</span>}
                </div>
              </div>
            )}
          </section>

          {/* Attempts */}
          <section className="mt-10">
            <h3 className="text-lg font-semibold mb-3">Your attempts</h3>
            {!token && <p className="text-sm text-gray-600">Log in to see your attempts.</p>}
            {token && loadingAttempts && <p>Loading attempts…</p>}
            {token && attempts && attempts.length === 0 && <p className="text-sm text-gray-600">No attempts yet.</p>}
            {token && attempts && attempts.length > 0 && (
              <ul className="divide-y border rounded">
                {attempts.map((a) => (
                  <li key={a.id} className="px-3 py-2 text-sm flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.status}</div>
                      <div className="text-gray-500">
                        {a.language} • {a.passedCount}/{a.totalCount} • {a.runtimeMs ?? 0} ms
                      </div>
                    </div>
                    <div className="text-gray-500">{new Date(a.submittedAt).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}

            {token && latest && (
              <div className="mt-3 text-sm">
                Latest: <span className="font-medium">{latest.status}</span> ({latest.passedCount}/{latest.totalCount})
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
