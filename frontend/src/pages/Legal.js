import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Legal() {
    return (_jsxs("main", { className: "legalPage", children: [_jsx("header", { className: "legal-hero", children: _jsx("h1", { children: "Legal stuff" }) }), _jsxs("section", { className: "legal-card", children: [_jsx("h2", { children: "Who We Are" }), _jsxs("p", { children: ["This site is run by Octavian Gurlui, acting as the data controller under the GDPR.", " ", " Contact:", _jsx("a", { href: "mailto:octavian.gurlui@gmail.com", className: "legal-link", children: "octavian.gurlui@gmail.com" }), "."] })] }), _jsxs("section", { className: "legal-card", children: [_jsx("h2", { children: "What Data We Collect" }), _jsx("p", { children: "We only collect the data necessary to make the site function:" }), _jsxs("ul", { children: [_jsx("li", { children: "Account info (username, email, authentication tokens)." }), _jsx("li", { children: "Problem attempts (submitted code, logs, test results)." }), _jsx("li", { children: "Chat messages with AI personas (to persist conversations)." })] }), _jsx("p", { children: "No ads, no trackers, no analytics scripts." })] }), _jsxs("section", { className: "legal-card", children: [_jsx("h2", { children: "How We Use Data" }), _jsxs("p", { children: ["Your data is used strictly for:", _jsx("li", { children: "Authenticating accounts" }), _jsx("li", { children: "Running and storing code submissions" }), _jsx("li", { children: "Providing AI assistance (via the OpenAI API)" }), _jsx("li", { children: "Keeping the site stable and secure" }), "We do not sell or share your data. The only third party involved is OpenAI, which processes messages you send to the AI. We process your data on the basis of contract necessity (to provide service), consent (you can withdraw at any time) and legitimate interest (site stability and security)."] })] }), _jsxs("section", { className: "legal-card", children: [_jsx("h2", { children: "Cookies" }), _jsx("p", { children: "Cookies are used solely for authentication (session refresh). Blocking cookies may prevent login and basic functionality." })] }), _jsxs("section", { className: "legal-card", children: [_jsx("h2", { children: "AI Disclaimer" }), _jsx("p", { children: "AI personas are tuned to be work-safe, but they are powered by large language models. Their output may be unpredictable, incomplete, or incorrect. Do not rely on them for professional or production use." })] }), _jsxs("section", { className: "legal-card", children: [_jsx("h2", { children: "Sandbox Rules" }), _jsx("p", { children: "Please don\u2019t submit harmful or malicious code, attempt to bypass sandbox restrictions, or abuse the system. Accounts engaged in abuse may be limited or removed." })] }), _jsxs("section", { className: "legal-card", children: [_jsx("h2", { children: "Your Rights (GDPR)" }), _jsxs("p", { children: ["As an EU user, you have the right to access, correct, or delete your personal data; request a copy; or withdraw consent. To exercise these rights, contact us at", " ", _jsx("a", { href: "mailto:octavian.gurlui@gmail.com", className: "legal-link", children: "octavian.gurlui@gmail.com" }), "."] })] }), _jsxs("section", { className: "legal-card", children: [_jsx("h2", { children: "Liability & Warranty" }), _jsx("p", { children: "This is an experimental parody project, provided \u201Cas is.\u201D We make no guarantees regarding accuracy, uptime, or fitness for purpose. By using this site, you accept that code execution, AI responses, and outcomes may be flawed. We are not liable for damages resulting from use or misuse of the site." })] }), _jsxs("section", { className: "legal-card", children: [_jsx("h2", { children: "Changes" }), _jsx("p", { children: "We may update these terms and policies from time to time. Significant changes will be announced on the site." })] }), _jsxs("section", { className: "legal-card", children: [_jsx("h2", { children: "Bugs and suggestions" }), _jsx("p", { children: "This site is experimental, and things may break. If you find a bug, security issue, or just have an idea to improve things, please let us know." })] })] }));
}
const styles = `
.legalWrap {
    min-height: 100vh;
    background: #f7f7fb;     /* light page bg */
    color: #111;             /* default text black */
  }
  
  /* Optional centered column; add <div class="legalPage"> around content if you want this layout */
  .legalPage {
    max-width: 820px;
    margin: 0 auto;
    padding: 24px 16px;
  }
  
  /* Hero */
  .legal-hero h1 {
    margin: 0 0 6px 0;
    font-size: 28px;
    font-weight: 900;
    color: #111;
  }
  .legal-hero p {
    margin: 0 0 14px 0;
    color: #444;             /* muted, still dark */
  }
  
  /* Cards – light gray with dark text */
  .legal-card {
    background: #f2f3f5;     /* light gray card */
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 16px;
    margin-top: 12px;
  }
  .legal-card h2 {
    margin: 0 0 6px 0;
    font-size: 16px;
    font-weight: 800;
    color: #111;
  }
  .legal-card p {
    margin: 0;
    color: #111;             /* black text inside cards */
    line-height: 1.6;
  }
  
  /* Links */
  .legal-link {
    color: #0b5fff;          /* readable blue on light bg */
    text-decoration: underline;
  }
  .legal-link:hover { text-decoration: none; }
`;
