import { Link } from "react-router-dom";

export default function Splash() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Welcome to ToxicPair</h1>
      <p className="text-gray-600 mb-6">Browse coding problems. Log in to submit solutions.</p>
      <div className="flex gap-3">
        <Link to="/problems" className="px-4 py-2 rounded bg-gray-900 text-white">Browse Problems</Link>
        <Link to="/login" className="px-4 py-2 rounded border">Log in</Link>
      </div>
    </main>
  );
}
