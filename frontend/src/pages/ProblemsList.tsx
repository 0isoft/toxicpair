import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useApi } from "../lib/api";
import type { Problem } from "../lib/types";

export default function ProblemsList() {
  const api = useApi();
  const { data, isLoading, error } = useQuery({
    queryKey: ["problems"],
    queryFn: () => api<Problem[]>("/problems"),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-xl font-semibold mb-4">Problems</h2>
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-600">Failed to load.</p>}
      <ul className="divide-y">
        {data?.map(p => (
          <li key={p.id} className="py-3 flex items-center justify-between">
            <div>
              <Link to={`/problems/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
              <div className="text-xs text-gray-500">{p.difficulty}</div>
            </div>
            {/* Attempt/Passed badges: to be added later */}
          </li>
        ))}
      </ul>
    </main>
  );
}
