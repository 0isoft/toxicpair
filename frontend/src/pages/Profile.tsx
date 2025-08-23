import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import type { User, AttemptSummary } from "../lib/types";
import { Link } from "react-router-dom";


export default function Profile() {
  const { token } = useAuth();
  const api = useApi();

  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/me"),
    enabled: !!token,
  });

  const sumQ = useQuery({
    queryKey: ["attempts-summary"],
    queryFn: () => api<AttemptSummary[]>("/attempts/summary"),
    enabled: !!token,
  });

  if (!token) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h2 className="text-2xl font-semibold mb-2">Profile</h2>
        <p className="text-sm text-gray-600">
          You’re not logged in. <Link to="/login" className="underline">Log in</Link> to view your profile.
        </p>
      </main>
    );
  }

  const me = meQ.data ?? null;
  const rows = sumQ.data ?? [];
  const succeeded = rows.filter(r => r.status === "PASSED");
  const attemptedNotSucceeded = rows.filter(r => r.status !== "PASSED");

  const meErr = !!meQ.error;
  const sumErr = !!sumQ.error;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      <section>
      <h2 className="text-2xl font-semibold mb-4">Profile</h2>
  {meQ.isLoading && <p>Loading profile…</p>}
  {meErr && <p className="text-red-600">Couldn’t load profile info.</p>}
  {me && (
  <div className="rounded border p-4 grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm">
    <div><span className="text-gray-500">ID:</span> {me.id}</div>
    <div><span className="text-gray-500">Email:</span> {me.email}</div>
    <div><span className="text-gray-500">Created:</span> {new Date(me.createdAt).toLocaleString()}</div>
    <div>
      <span className="text-gray-500">Role:</span>{" "}
      <span className={`px-2 py-0.5 rounded text-xs ${
        me.role === "ADMIN" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-800"
      }`}>
        {me.role}
      </span>
    </div>
  </div>
)}
</section>

      <section>
      <h3 className="text-lg font-semibold mb-3">Succeeded problems</h3>
  {sumQ.isLoading && <p>Loading attempts…</p>}
  {sumErr && <p className="text-red-600">Couldn’t load attempts summary.</p>}
         
          <ul className="divide-y border rounded">
            {succeeded.map(r => (
              <li key={r.problemId} className="px-3 py-2 flex items-center justify-between text-sm">
                <div>
                  <Link to={`/problems/${r.problemId}`} className="font-medium hover:underline">
                    {r.problem.title}
                  </Link>
                  <div className="text-gray-500">
                    {r.problem.difficulty} • last attempt {new Date(r.submittedAt).toLocaleString()}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs bg-green-600 text-white">PASSED</span>
              </li>
            ))}
          </ul>
        
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Attempted (not yet passed)</h3>
        {attemptedNotSucceeded.length === 0 ? (
          <p className="text-sm text-gray-600">All clear.</p>
        ) : (
          <ul className="divide-y border rounded">
            {attemptedNotSucceeded.map(r => (
              <li key={r.problemId} className="px-3 py-2 flex items-center justify-between text-sm">
                <div>
                  <Link to={`/problems/${r.problemId}`} className="font-medium hover:underline">
                    {r.problem.title}
                  </Link>
                  <div className="text-gray-500">
                    {r.problem.difficulty} • last attempt {new Date(r.submittedAt).toLocaleString()}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-white">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
