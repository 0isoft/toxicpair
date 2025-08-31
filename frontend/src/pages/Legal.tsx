import React from "react";
export default function Legal() {
    return (
      <main className="legalPage">
        <header className="legal-hero">
          <h1>Legal stuff</h1>
        </header>
  
        <section className="legal-card">
          <h2>Who We Are</h2>
          <p>
            This site is run by Octavian Gurlui, acting as the data controller under the GDPR.{" "} Contact: 
            <a href="mailto:octavian.gurlui@gmail.com" className="legal-link">
              octavian.gurlui@gmail.com
            </a>.
          </p>
        </section>
  
        <section className="legal-card">
          <h2>What Data We Collect</h2>
          <p>
            We only collect the data necessary to make the site function:
          </p>
          <ul>
            <li>Account info (username, email, authentication tokens).</li>
            <li>Problem attempts (submitted code, logs, test results).</li>
            <li>Chat messages with AI personas (to persist conversations).</li>
          </ul>
          <p>No ads, no trackers, no analytics scripts.</p>
        </section>
  
        <section className="legal-card">
          <h2>How We Use Data</h2>
          <p>
          Your data is used strictly for:
          <li>Authenticating accounts</li>
          <li>Running and storing code submissions</li>
          <li>Providing AI assistance (via the OpenAI API)</li>
          <li>Keeping the site stable and secure</li>
          We do not sell or share your data. The only third party involved is OpenAI, which processes messages you send to the AI. We process your data on the basis of contract necessity (to provide service), consent (you can withdraw at any time) and legitimate interest (site stability and security).
        
          </p>
        </section>

    
  
        <section className="legal-card">
          <h2>Cookies</h2>
          <p>
            Cookies are used solely for authentication (session refresh). 
            Blocking cookies may prevent login and basic functionality.
          </p>
        </section>
  
        <section className="legal-card">
          <h2>AI Disclaimer</h2>
          <p>
            AI personas are tuned to be work-safe, but they are powered by large 
            language models. Their output may be unpredictable, incomplete, or incorrect. 
            Do not rely on them for professional or production use.
          </p>
        </section>
  
        <section className="legal-card">
          <h2>Sandbox Rules</h2>
          <p>
            Please don’t submit harmful or malicious code, attempt to bypass 
            sandbox restrictions, or abuse the system. Accounts engaged in abuse 
            may be limited or removed.
          </p>
        </section>
  
        <section className="legal-card">
          <h2>Your Rights (GDPR)</h2>
          <p>
            As an EU user, you have the right to access, correct, or delete your 
            personal data; request a copy; or withdraw consent. To exercise these rights, 
            contact us at{" "}
            <a href="mailto:octavian.gurlui@gmail.com" className="legal-link">
              octavian.gurlui@gmail.com
            </a>.
          </p>
        </section>
  
        <section className="legal-card">
          <h2>Liability & Warranty</h2>
          <p>
            This is an experimental parody project, provided “as is.” 
            We make no guarantees regarding accuracy, uptime, or fitness for purpose. 
            By using this site, you accept that code execution, AI responses, 
            and outcomes may be flawed. We are not liable for damages resulting 
            from use or misuse of the site.
          </p>
        </section>
  
        <section className="legal-card">
          <h2>Changes</h2>
          <p>
            We may update these terms and policies from time to time. 
            Significant changes will be announced on the site.
          </p>
        </section>
        
        <section className="legal-card">
          <h2>Bugs and suggestions</h2>
          <p>
          This site is experimental, and things may break.
If you find a bug, security issue, or just have an idea to improve things, please let us know.
          </p>
        </section>

      </main>
    );
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