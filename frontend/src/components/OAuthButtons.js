import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// OAuthButtons.tsx
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../lib/firebase";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";
export default function OAuthButtons() {
    const { loginWithFirebaseIdToken } = useAuth();
    const nav = useNavigate();
    async function handle(provider) {
        try {
            const prov = provider === "google" ? googleProvider : githubProvider;
            const cred = await signInWithPopup(auth, prov);
            const idToken = await cred.user.getIdToken(true);
            await loginWithFirebaseIdToken(idToken);
            nav("/problems");
        }
        catch (e) {
            console.error("OAuth error", e?.code, e?.message, e?.customData);
            alert(`OAuth failed: ${e?.code || "unknown"}\n${e?.message || ""}`);
        }
    }
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("button", { onClick: () => handle("google"), className: "btn w-full", children: "Continue with Google" }), _jsx("button", { onClick: () => handle("github"), className: "btn w-full", children: "Continue with GitHub" })] }));
}
