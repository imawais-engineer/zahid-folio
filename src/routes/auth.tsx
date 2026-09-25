import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Admin sign in | Alpha Insights" },
      { name: "description", content: "Secure sign in for the Alpha Insights portfolio administrator." },
      { property: "og:title", content: "Admin sign in | Alpha Insights" },
      { property: "og:description", content: "Secure sign in for the Alpha Insights portfolio administrator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg({ t: "Email or password is incorrect.", err: true });
    else nav({ to: "/admin" });
    setBusy(false);
  }

  return (
    <div className="adm">
      <form className="auth-box" onSubmit={submit}>
        <h1 style={{ margin: 0 }}>Portfolio Admin</h1>
        <p className="hint">Authorized administrators only.</p>
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <label>Password</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <div style={{ marginTop: 20 }}>
          <button className="abtn wine" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </div>
        {msg && <div className={`msg ${msg.err ? "err" : ""}`}>{msg.t}</div>}
      </form>
    </div>
  );
}
