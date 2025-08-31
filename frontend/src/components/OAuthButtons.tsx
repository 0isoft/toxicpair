// OAuthButtons.tsx
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../lib/firebase";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function OAuthButtons() {
  const { loginWithFirebaseIdToken } = useAuth();
  const nav = useNavigate();

  async function handle(provider: "google" | "github") {
    try {
      const prov = provider === "google" ? googleProvider : githubProvider;
      const cred = await signInWithPopup(auth, prov);
      const idToken = await cred.user.getIdToken(true);
      await loginWithFirebaseIdToken(idToken);
      nav("/problems");
    } catch (e: any) {
      console.error("OAuth error", e?.code, e?.message, e?.customData);
      alert(`OAuth failed: ${e?.code || "unknown"}\n${e?.message || ""}`);
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={() => handle("google")} className="btn w-full">Continue with Google</button>
      <button onClick={() => handle("github")} className="btn w-full">Continue with GitHub</button>
    </div>
  );
}
