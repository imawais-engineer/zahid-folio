import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { projectsQuery, slugify, uniqueValues, type Project } from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Portfolio CMS | Alpha Insights" },
      { name: "description", content: "Manage Alpha Insights portfolio projects." },
      { property: "og:title", content: "Portfolio CMS | Alpha Insights" },
      { property: "og:description", content: "Manage Alpha Insights portfolio projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Draft = Omit<Project, "id" | "created_at" | "updated_at"> & { id?: string; updated_at?: string };

const empty = (priority: number): Draft => ({
  slug: null, title: "", short: "", platforms: [], capabilities: [], industries: [], tags: [],
  access: "interactive", thumbnail_url: null, screenshots: [], model_url: "", challenge: "",
  approach: "", value: "", priority, featured: false, is_template: false,
  public_enabled: true,
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
  const [slugTouched, setSlugTouched] = useState(false);
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
    // optimistic UI
    qc.setQueryData(projectsQuery.queryKey, ordered.map((p, i) => ({ ...p, priority: (n - i) * 10 })));
    const results = await Promise.all(
      ordered.map((p, i) => {
        const pr = (n - i) * 10;
        return p.priority === pr ? null : supabase.from("projects").update({ priority: pr }).eq("id", p.id).select("id, priority, updated_at").single();
      }),
    );
    const failed = results.find((r) => r?.error);
    if (failed?.error) setMsg({ t: `Reorder failed: ${failed.error.message}`, err: true });
    else setMsg({ t: "Order updated on the live portfolio." });
    // keep the open draft in sync so a later save isn't flagged as a conflict
    const mine = results.find((r) => r?.data && r.data.id === draft?.id)?.data;
    if (mine) setDraft((d) => (d ? { ...d, priority: mine.priority, updated_at: mine.updated_at } : d));
    await refresh();
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= projects.length) return;
    const arr = [...projects];
    const current = arr[idx];
    const adjacent = arr[j];
    if (!current || !adjacent) return;
    arr[idx] = adjacent;
    arr[j] = current;
    reorder(arr);
  }

  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const arr = [...projects];
    const from = arr.findIndex((p) => p.id === dragId);
    const [item] = arr.splice(from, 1);
    if (item) arr.splice(arr.findIndex((p) => p.id === targetId), 0, item);
    reorder(arr);
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim()) return setMsg({ t: "Title is required.", err: true });
    setBusy(true);
    const { id, updated_at, ...row } = draft;
    const payload = {
      ...row,
      title: row.title.trim(),
      slug: slugify(row.slug?.trim() || row.title),
      model_url: row.model_url?.trim() || null,
    };
    let res;
    if (id) {
      // Only update if nobody else changed the row since it was opened (no silent overwrites)
      let q = supabase.from("projects").update(payload).eq("id", id);
      if (updated_at) q = q.eq("updated_at", updated_at);
      res = await q.select().maybeSingle();
      if (!res.error && !res.data) {
        setBusy(false);
        return setMsg({ t: "This project was changed elsewhere since you opened it. Re-open it from the list to load the latest version, then re-apply your edits.", err: true });
      }
    } else {
      res = await supabase.from("projects").insert(payload).select().single();
    }
    setBusy(false);
    if (res.error) {
      const m = res.error.code === "23505" ? "That slug is already used by another project — choose a different one." : res.error.message;
      return setMsg({ t: `Save failed: ${m}`, err: true });
    }
    if (!res.data) return;
    setMsg({
      t: res.data.public_enabled
        ? `Saved “${res.data.title}” — it is enabled on the public site.`
        : `Saved “${res.data.title}” — it remains private and CMS-only.`,
    });
    setDraft({ ...res.data });
    setSlugTouched(true);
    refresh();
  }

  async function remove() {
    if (!draft?.id || !confirm(`Delete "${draft.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", draft.id);
    if (error) return setMsg({ t: `Delete failed: ${error.message}`, err: true });
    setMsg({ t: `Deleted “${draft.title}”.` });
    setDraft(null);
    refresh();
  }

  async function setPublicVisibility(project: Project, enabled: boolean) {
    setBusy(true);
    const { data, error } = await supabase
      .from("projects")
      .update({ public_enabled: enabled })
      .eq("id", project.id)
      .eq("updated_at", project.updated_at)
      .select()
      .maybeSingle();
    setBusy(false);
    if (error) return setMsg({ t: `Visibility update failed: ${error.message}`, err: true });
    if (!data) {
      await refresh();
      return setMsg({ t: "This project changed elsewhere. The latest version has been loaded; please try again.", err: true });
    }
    qc.setQueryData<Project[]>(projectsQuery.queryKey, (current) =>
      current?.map((item) => (item.id === data.id ? data : item)),
    );
    setDraft((current) =>
      current?.id === data.id
        ? { ...current, public_enabled: data.public_enabled, updated_at: data.updated_at }
        : current,
    );
    setMsg({
      t: enabled
        ? `“${data.title}” is now enabled and available on the public site.`
        : `“${data.title}” is disabled. It remains editable here but is no longer publicly accessible.`,
    });
  }

  async function upload(files: FileList | null): Promise<string[]> {
    if (!files?.length) return [];
    setBusy(true);
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) {
        setMsg({ t: `“${f.name}” is not an image and was not uploaded.`, err: true });
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        setMsg({ t: `“${f.name}” is larger than 10 MB and was not uploaded.`, err: true });
        continue;
      }
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
          <Button className="cms-button primary" onClick={signOut}><LogOut /> Sign out</Button>
        </div>
      </div>
    );

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div className="adm">
      <div className="adm-top">
        <div className="cms-brand"><strong>ALPHA INSIGHTS</strong><span>Portfolio CMS</span></div>
        <div className="cms-top-actions">
          <Button asChild variant="outline" className="cms-button top"><Link to="/" target="_blank"><ExternalLink /> View site</Link></Button>
          <Button variant="outline" className="cms-button top" onClick={signOut}><LogOut /> Sign out</Button>
        </div>
      </div>
      <div className="adm-wrap">
        <div className="adm-card">
          <div className="cms-card-heading">
            <div><p className="cms-kicker">Portfolio library</p><h2>Projects</h2></div>
            <Button className="cms-button gold" onClick={() => { setMsg(null); setSlugTouched(false); setDraft(empty((projects[0]?.priority ?? 0) + 10)); }}><Plus /> New project</Button>
          </div>
          <div className="cms-summary"><span><strong>{projects.length}</strong> total</span><span><strong>{projects.filter((p) => p.public_enabled).length}</strong> public</span><span><strong>{projects.filter((p) => !p.public_enabled).length}</strong> disabled</span></div>
          <p className="hint">Drag to reorder, or use the arrow controls. Public visibility takes effect immediately.</p>
          <ul className="adm-list">
            {projects.map((p, i) => (
              <li
                key={p.id}
                draggable
                onDragStart={() => setDragId(p.id)}
                onDragOver={(e) => { e.preventDefault(); setOverId(p.id); }}
                onDragLeave={() => setOverId(null)}
                onDrop={() => { drop(p.id); setDragId(null); setOverId(null); }}
                className={`${draft?.id === p.id ? "active" : ""} ${overId === p.id ? "over" : ""} ${p.public_enabled ? "" : "disabled-project"}`}
              >
                <GripVertical className="drag-grip" aria-hidden="true" />
                <button type="button" className="project-select" onClick={() => { setMsg(null); setSlugTouched(true); setDraft({ ...p }); }}>
                  <span>{p.featured && "★ "}{p.title}</span>
                  <small className={`visibility-pill ${p.public_enabled ? "enabled" : "disabled"}`}>{p.public_enabled ? <><Eye /> Public</> : <><EyeOff /> Disabled</>}</small>
                  {p.is_template && <small className="template-badge">Template</small>}
                </button>
                <div className="list-actions">
                  <Button size="icon" variant="outline" onClick={() => setPublicVisibility(p, !p.public_enabled)} disabled={busy} aria-label={p.public_enabled ? `Disable ${p.title}` : `Enable ${p.title}`} title={p.public_enabled ? "Disable public view" : "Enable public view"}>{p.public_enabled ? <EyeOff /> : <Eye />}</Button>
                  <Button size="icon" variant="outline" onClick={() => move(i, -1)} disabled={i === 0 || busy} aria-label={`Move ${p.title} up`} title="Move up"><ArrowUp /></Button>
                  <Button size="icon" variant="outline" onClick={() => move(i, 1)} disabled={i === projects.length - 1 || busy} aria-label={`Move ${p.title} down`} title="Move down"><ArrowDown /></Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="adm-card">
          {!draft ? (
            <div className="cms-empty"><Eye /><h2>Select a project</h2><p>Choose a project to edit its details and public visibility.</p></div>
          ) : (
            <>
               <div className="editor-heading"><div><p className="cms-kicker">{draft.id ? "Portfolio entry" : "Create entry"}</p><h2>{draft.id ? "Edit project" : "New project"}</h2></div><span className={`visibility-pill large ${draft.public_enabled ? "enabled" : "disabled"}`}>{draft.public_enabled ? <><Eye /> Public</> : <><EyeOff /> Disabled</>}</span></div>
               <div className={`visibility-control ${draft.public_enabled ? "enabled" : "disabled"}`}>
                 <div><strong>{draft.public_enabled ? "Public view enabled" : "Public view disabled"}</strong><span>{draft.public_enabled ? "This project is available on the website and at its direct link." : "This project remains editable here but is hidden from every public page and direct link."}</span></div>
                 <div className="visibility-action"><span>{draft.public_enabled ? "Enabled" : "Disabled"}</span><Switch checked={draft.public_enabled} disabled={busy} onCheckedChange={(checked) => {
                   const saved = projects.find((project) => project.id === draft.id);
                   if (saved) void setPublicVisibility(saved, checked);
                   else set("public_enabled", checked);
                 }} aria-label="Enable or disable public view" /></div>
               </div>
              {draft.is_template && <div className="template-notice"><strong>Template / Sample</strong><span>This starter project is a blueprint. Edit it with the real model and attachments, or delete it when ready.</span></div>}
               <Label>Project title</Label>
               <Input value={draft.title} maxLength={200} onChange={(e) => { const v = e.target.value; setDraft((d) => d ? { ...d, title: v, slug: slugTouched ? d.slug : slugify(v) } : d); }} />
               <Label>URL slug</Label>
               <div className="input-action-row">
                 <Input value={draft.slug ?? ""} maxLength={200} placeholder="auto-generated from title" onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
                 <Button type="button" variant="outline" className="cms-button" onClick={() => { setSlugTouched(false); set("slug", slugify(draft.title)); }}><RotateCcw /> Auto</Button>
              </div>
              <div className="hint">Page address: /projects/{slugify(draft.slug || draft.title) || "…"}</div>
              <div className="row">
                <TagField label="Platform" value={draft.platforms} options={uniqueValues(projects, "platforms")} onChange={(v) => set("platforms", v)} />
                <div>
                   <Label>Access status</Label>
                   <Select value={draft.access} onValueChange={(value) => set("access", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="interactive">Interactive</SelectItem><SelectItem value="preview">Preview only</SelectItem><SelectItem value="request">Available on request</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div className="row">
                <TagField label="Capability" value={draft.capabilities} options={uniqueValues(projects, "capabilities")} onChange={(v) => set("capabilities", v)} />
                <TagField label="Industry" value={draft.industries} options={uniqueValues(projects, "industries")} onChange={(v) => set("industries", v)} />
              </div>
              <TagField label="Additional tags" value={draft.tags} options={uniqueValues(projects, "tags")} onChange={(v) => set("tags", v)} />

              <div className="row">
                <div>
                   <Label>Homepage thumbnail</Label>
                   <label className="upload-control"><ImagePlus /><span><strong>Choose an image</strong><small>JPG, PNG or WebP · Max 10 MB</small></span><input type="file" accept="image/*" onChange={async (e) => { const [u] = await upload(e.target.files); if (u) set("thumbnail_url", u); e.target.value = ""; }} /></label>
                  {draft.thumbnail_url && (
                     <div className="thumbs"><div><img src={draft.thumbnail_url} alt="Homepage thumbnail preview" /><button onClick={() => set("thumbnail_url", null)} aria-label="Remove thumbnail"><X /></button></div></div>
                  )}
                </div>
                <div>
                   <Label>Additional screenshots</Label>
                   <label className="upload-control"><ImagePlus /><span><strong>Add screenshots</strong><small>Multiple images supported</small></span><input type="file" accept="image/*" multiple onChange={async (e) => { const u = await upload(e.target.files); set("screenshots", [...draft.screenshots, ...u]); e.target.value = ""; }} /></label>
                  <div className="thumbs">
                    {draft.screenshots.map((s) => (
                       <div key={s}><img src={s} alt="Screenshot preview" /><button onClick={() => set("screenshots", draft.screenshots.filter((x) => x !== s))} aria-label="Remove screenshot"><X /></button></div>
                    ))}
                  </div>
                </div>
              </div>

               <Label>OneDrive / Excel Online / Power BI embed URL</Label>
               <Input type="url" placeholder="https://..." value={draft.model_url ?? ""} onChange={(e) => set("model_url", e.target.value)} />
               <Label>Short description</Label>
               <Input value={draft.short} onChange={(e) => set("short", e.target.value)} maxLength={300} />
               <Label>Business challenge</Label>
               <Textarea value={draft.challenge} onChange={(e) => set("challenge", e.target.value)} />
               <Label>Approach</Label>
               <Textarea value={draft.approach} onChange={(e) => set("approach", e.target.value)} />
               <Label>Business value</Label>
               <Textarea value={draft.value} onChange={(e) => set("value", e.target.value)} />
              <div className="row">
                <div>
                   <Label>Display priority (higher shows first)</Label>
                   <Input type="number" value={draft.priority} onChange={(e) => set("priority", Number(e.target.value) || 0)} />
                </div>
                <div>
                   <Label>Featured presentation</Label>
                   <div className="switch-row"><span>Show as a large featured card</span><Switch checked={draft.featured} onCheckedChange={(checked) => set("featured", checked)} aria-label="Featured project" /></div>
                </div>
              </div>
               <div className="switch-row"><span><strong>Template / Sample</strong><small>Mark this as starter content</small></span><Switch checked={draft.is_template} onCheckedChange={(checked) => set("is_template", checked)} aria-label="Template or sample project" /></div>
               <div className="editor-actions">
                 <Button className="cms-button gold" onClick={save} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Save />}{busy ? "Working…" : "Save project"}</Button>
                 <Button variant="outline" className="cms-button" onClick={() => setDraft(null)}><X /> Cancel</Button>
                 {draft.id && <Button variant="destructive" className="cms-button delete" onClick={remove}><Trash2 /> Delete</Button>}
              </div>
            </>
          )}
           {msg && <div role={msg.err ? "alert" : "status"} className={`msg ${msg.err ? "err" : ""}`}>{msg.err ? <X /> : <Check />}{msg.t}</div>}
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
      <Label>{label}</Label>
      <Input
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
        {value.map((t) => <Button type="button" key={t} variant="outline" className="chip" onClick={() => onChange(value.filter((x) => x !== t))}>{t}<X /></Button>)}
      </div>
      <div className="hint">Press Enter to add a new one. Click a tag to remove.</div>
    </div>
  );
}
