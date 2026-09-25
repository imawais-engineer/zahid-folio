import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in | Alpha Insights" },
      { name: "description", content: "Sign in to manage the Alpha Insights portfolio." },
      { property: "og:title", content: "Admin sign in | Alpha Insights" },
      { property: "og:description", content: "Sign in to manage the Alpha Insights portfolio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ t: error.message, err: true });
      else nav({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (error) setMsg({ t: error.message, err: true });
      else setMsg({ t: "Account created. Check your email to confirm, then sign in." });
    }
    setBusy(false);
  }

  return (
    <div className="adm">
      <form className="auth-box" onSubmit={submit}>
        <h1 style={{ margin: 0 }}>Portfolio Admin</h1>
        <p className="hint">{mode === "in" ? "Sign in to manage portfolio projects." : "The first account created becomes the site administrator."}</p>
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <label>Password</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
        <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
          <button className="abtn wine" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>
          <button type="button" className="abtn ghost" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Create account" : "Back to sign in"}
          </button>
        </div>
        {msg && <div className={`msg ${msg.err ? "err" : ""}`}>{msg.t}</div>}
      </form>
    </div>
  );
}
