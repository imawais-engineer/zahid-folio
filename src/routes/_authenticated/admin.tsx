import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { projectsQuery, uniqueValues, type Project } from "@/lib/projects";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Portfolio CMS | Alpha Insights" },
      { name: "description", content: "Manage Alpha Insights portfolio projects." },
      { property: "og:title", content: "Portfolio CMS | Alpha Insights" },
      { property: "og:description", content: "Manage Alpha Insights portfolio projects." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Draft = Omit<Project, "id" | "created_at" | "updated_at"> & { id?: string };

const empty = (priority: number): Draft => ({
  slug: null, title: "", short: "", platforms: [], capabilities: [], industries: [], tags: [],
  access: "interactive", thumbnail_url: null, screenshots: [], model_url: "", challenge: "",
  approach: "", value: "", priority, featured: false,
});

function AdminPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { user } = Route.useRouteContext();
  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
  });
  const { data: projects = [] } = useQuery(projectsQuery);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["projects"] });

  async function reorder(ordered: Project[]) {
    const n = ordered.length;
    await Promise.all(
      ordered.map((p, i) => {
        const pr = (n - i) * 10;
        return p.priority === pr ? null : supabase.from("projects").update({ priority: pr }).eq("id", p.id);
      }),
    );
    await refresh();
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= projects.length) return;
    const arr = [...projects];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    reorder(arr);
  }

  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const arr = [...projects];
    const from = arr.findIndex((p) => p.id === dragId);
    const [item] = arr.splice(from, 1);
    arr.splice(arr.findIndex((p) => p.id === targetId), 0, item);
    reorder(arr);
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim()) return setMsg({ t: "Title is required.", err: true });
    setBusy(true);
    const { id, ...row } = draft;
    const payload = { ...row, title: row.title.trim(), model_url: row.model_url?.trim() || null };
    const res = id
      ? await supabase.from("projects").update(payload).eq("id", id).select().single()
      : await supabase.from("projects").insert(payload).select().single();
    setBusy(false);
    if (res.error) return setMsg({ t: res.error.message, err: true });
    setMsg({ t: "Saved — the live portfolio is updated." });
    setDraft({ ...res.data });
    refresh();
  }

  async function remove() {
    if (!draft?.id || !confirm(`Delete "${draft.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", draft.id);
    if (error) return setMsg({ t: error.message, err: true });
    setDraft(null);
    setMsg({ t: "Project deleted." });
    refresh();
  }

  async function upload(files: FileList | null): Promise<string[]> {
    if (!files?.length) return [];
    setBusy(true);
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const path = `${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("portfolio").upload(path, f, { contentType: f.type });
      if (up.error) { setMsg({ t: up.error.message, err: true }); continue; }
      const s = await supabase.storage.from("portfolio").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (s.data) urls.push(s.data.signedUrl);
    }
    setBusy(false);
    return urls;
  }

  if (roleLoading) return <div className="adm"><p style={{ padding: 40 }}>Loading…</p></div>;
  if (!isAdmin)
    return (
      <div className="adm">
        <div className="auth-box">
          <h1 style={{ margin: 0 }}>No admin access</h1>
          <p>This account ({user.email}) is not an administrator.</p>
          <button className="abtn wine" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div className="adm">
      <div className="adm-top">
        <strong style={{ fontFamily: "Libre Caslon Display, serif", letterSpacing: ".07em" }}>ALPHA INSIGHTS · PORTFOLIO CMS</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/" target="_blank">View site ↗</Link>
          <button onClick={signOut}>Sign out</button>
        </div>
      </div>
      <div className="adm-wrap">
        <div className="adm-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Projects</h2>
            <button className="abtn" onClick={() => { setMsg(null); setDraft(empty((projects[0]?.priority ?? 0) + 10)); }}>+ New</button>
          </div>
          <p className="hint">Drag to reorder, or use ↑ ↓. Top = shown first.</p>
          <ul className="adm-list">
            {projects.map((p, i) => (
              <li
                key={p.id}
                draggable
                onDragStart={() => setDragId(p.id)}
                onDragOver={(e) => { e.preventDefault(); setOverId(p.id); }}
                onDragLeave={() => setOverId(null)}
                onDrop={() => { drop(p.id); setDragId(null); setOverId(null); }}
                className={`${draft?.id === p.id ? "active" : ""} ${overId === p.id ? "over" : ""}`}
              >
                <span className="t" onClick={() => { setMsg(null); setDraft({ ...p }); }}>
                  {p.featured && "★ "}{p.title}
                </span>
                <button onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                <button onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="adm-card">
          {!draft ? (
            <p className="hint">Select a project to edit, or create a new one.</p>
          ) : (
            <>
              <h2>{draft.id ? "Edit project" : "New project"}</h2>
              <label>Project title</label>
              <input value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />
              <div className="row">
                <TagField label="Platform" value={draft.platforms} options={uniqueValues(projects, "platforms")} onChange={(v) => set("platforms", v)} />
                <div>
                  <label>Access status</label>
                  <select value={draft.access} onChange={(e) => set("access", e.target.value)}>
                    <option value="interactive">Interactive</option>
                    <option value="preview">Preview only</option>
                    <option value="request">Available on request</option>
                  </select>
                </div>
              </div>
              <div className="row">
                <TagField label="Capability" value={draft.capabilities} options={uniqueValues(projects, "capabilities")} onChange={(v) => set("capabilities", v)} />
                <TagField label="Industry" value={draft.industries} options={uniqueValues(projects, "industries")} onChange={(v) => set("industries", v)} />
              </div>
              <TagField label="Additional tags" value={draft.tags} options={uniqueValues(projects, "tags")} onChange={(v) => set("tags", v)} />

              <div className="row">
                <div>
                  <label>Homepage thumbnail</label>
                  <input type="file" accept="image/*" onChange={async (e) => { const [u] = await upload(e.target.files); if (u) set("thumbnail_url", u); e.target.value = ""; }} />
                  {draft.thumbnail_url && (
                    <div className="thumbs"><div><img src={draft.thumbnail_url} alt="" /><button onClick={() => set("thumbnail_url", null)}>×</button></div></div>
                  )}
                </div>
                <div>
                  <label>Additional screenshots</label>
                  <input type="file" accept="image/*" multiple onChange={async (e) => { const u = await upload(e.target.files); set("screenshots", [...draft.screenshots, ...u]); e.target.value = ""; }} />
                  <div className="thumbs">
                    {draft.screenshots.map((s) => (
                      <div key={s}><img src={s} alt="" /><button onClick={() => set("screenshots", draft.screenshots.filter((x) => x !== s))}>×</button></div>
                    ))}
                  </div>
                </div>
              </div>

              <label>OneDrive / Excel Online / Power BI embed URL</label>
              <input type="url" placeholder="https://..." value={draft.model_url ?? ""} onChange={(e) => set("model_url", e.target.value)} />
              <label>Short description</label>
              <input value={draft.short} onChange={(e) => set("short", e.target.value)} maxLength={300} />
              <label>Business challenge</label>
              <textarea value={draft.challenge} onChange={(e) => set("challenge", e.target.value)} />
              <label>Approach</label>
              <textarea value={draft.approach} onChange={(e) => set("approach", e.target.value)} />
              <label>Business value</label>
              <textarea value={draft.value} onChange={(e) => set("value", e.target.value)} />
              <div className="row">
                <div>
                  <label>Display priority (higher shows first)</label>
                  <input type="number" value={draft.priority} onChange={(e) => set("priority", Number(e.target.value) || 0)} />
                </div>
                <div>
                  <label>Featured</label>
                  <label style={{ fontWeight: 400, display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={draft.featured} onChange={(e) => set("featured", e.target.checked)} /> Show as a large featured card
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                <button className="abtn" onClick={save} disabled={busy}>{busy ? "Working…" : "Save project"}</button>
                <button className="abtn ghost" onClick={() => setDraft(null)}>Cancel</button>
                {draft.id && <button className="abtn wine" onClick={remove} style={{ marginLeft: "auto" }}>Delete</button>}
              </div>
            </>
          )}
          {msg && <div className={`msg ${msg.err ? "err" : ""}`}>{msg.t}</div>}
        </div>
      </div>
    </div>
  );
}

function TagField({ label, value, options, onChange }: { label: string; value: string[]; options: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const id = `dl-${label.replace(/\W/g, "")}`;
  const add = (t: string) => {
    const v = t.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setText("");
  };
  return (
    <div>
      <label>{label}</label>
      <input
        list={id}
        value={text}
        placeholder={`Select or type a new ${label.toLowerCase()}`}
        onChange={(e) => {
          const v = e.target.value;
          if (options.includes(v)) add(v);
          else setText(v);
        }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(text); } }}
        onBlur={() => text && add(text)}
      />
      <datalist id={id}>{options.filter((o) => !value.includes(o)).map((o) => <option key={o} value={o} />)}</datalist>
      <div className="chips">
        {value.map((t) => <span key={t} className="chip" onClick={() => onChange(value.filter((x) => x !== t))}>{t} ×</span>)}
      </div>
      <div className="hint">Press Enter to add a new one. Click a tag to remove.</div>
    </div>
  );
}
