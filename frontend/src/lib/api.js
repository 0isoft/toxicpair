import { useAuth } from "./auth";
const API = import.meta.env.VITE_API_BASE;
export function useApi() {
    const { token, refresh } = useAuth();
    return async function request(path, init = {}, triedRefresh = false) {
        // Attach Authorization if we have a token
        const headers = new Headers(init.headers);
        if (token)
            headers.set("Authorization", `Bearer ${token}`);
        const res = await fetch(`${API}${path}`, {
            ...init,
            headers,
            // credentials aren’t required for bearer endpoints, but harmless
            credentials: init.credentials ?? "include",
        });
        if (res.status === 401 && !triedRefresh) {
            const newToken = await refresh();
            if (!newToken) {
                // still unauthorized
                const msg = await res.text().catch(() => "Unauthorized");
                throw new Error(msg || "Unauthorized");
            }
            // Retry once with the **new** token immediately
            const headers2 = new Headers(init.headers);
            headers2.set("Authorization", `Bearer ${newToken}`);
            const res2 = await fetch(`${API}${path}`, {
                ...init,
                headers: headers2,
                credentials: init.credentials ?? "include",
            });
            if (!res2.ok) {
                const text = await res2.text().catch(() => "");
                throw new Error(text || `HTTP ${res2.status}`);
            }
            return res2.json();
        }
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || `HTTP ${res.status}`);
        }
        return res.json();
    };
}
