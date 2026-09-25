import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getProjectBySlug } from "@/lib/projects.functions";
import { accessLabel } from "@/lib/projects";
import { Brandmark } from "@/components/site/Landing";

const EMAIL = "mailto:zahid@alphainsights.consulting";

const projectQuery = (slug: string) =>
  queryOptions({ queryKey: ["project", slug], queryFn: () => getProjectBySlug({ data: { slug } }) });

export const Route = createFileRoute("/projects/$slug")({
  loader: async ({ params, context }) => {
    const p = await context.queryClient.ensureQueryData(projectQuery(params.slug));
    if (!p) throw notFound();
    return { title: p.title, short: p.short, image: p.thumbnail_url };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Project not found | Alpha Insights" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.title} | Alpha Insights Case Study`;
    const desc = loaderData.short || "Finance case study by Chaudhary Zahid Ali, Alpha Insights.";
    const img = loaderData.image?.startsWith("https://") ? loaderData.image : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  component: ProjectPage,
  notFoundComponent: () => (
    <Shell>
      <section className="section light" style={{ textAlign: "center" }}>
        <h2>Case study not found</h2>
        <p>This project may have been renamed or removed.</p>
        <Link className="btn" to="/" hash="work">Back to portfolio</Link>
      </section>
    </Shell>
  ),
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <Shell>
        <section className="section light" style={{ textAlign: "center" }}>
          <h2>This case study didn't load</h2>
          <p>{error.message}</p>
          <button className="btn" onClick={() => router.invalidate()}>Try again</button>
        </section>
      </Shell>
    );
  },
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/">
          <Brandmark />
          <span><strong>ALPHA INSIGHTS</strong><small>FINANCE · MODELLING · ADVISORY</small></span>
        </Link>
        <nav className="nav" style={{ display: "flex" }}>
          <Link to="/" className="hide-sm">Home</Link>
          <Link to="/" hash="work">Portfolio</Link>
          <a className="btn small hide-sm" href={EMAIL}>Discuss a Project</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <Link className="brand" to="/"><Brandmark /><span><strong>ALPHA INSIGHTS</strong><small>BETTER INSIGHTS. SMARTER DECISIONS.</small></span></Link>
        <span>© 2026 Alpha Insights</span>
      </footer>
    </>
  );
}

function ProjectPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(projectQuery(slug));
  const [lightbox, setLightbox] = useState<number | null>(null);
  if (!p) return null;
  const gallery = [...(p.thumbnail_url ? [p.thumbnail_url] : []), ...p.screenshots];
  const note =
    p.access === "request"
      ? "The full model is shared privately on request. Selected views are shown below."
      : p.access === "preview"
        ? "Selected model views are shown without exposing the underlying workbook."
        : p.model_url ? "Explore the live model alongside." : "The live model link will be connected here shortly.";

  return (
    <Shell>
      <section className="modal-hero case-hero">
        <p className="crumbs"><Link to="/">Home</Link> / <Link to="/" hash="work">Portfolio</Link> / <span>{p.title}</span></p>
        <div className="modal-kicker" style={{ paddingRight: 0 }}>
          <p className="eyebrow gold">CASE STUDY</p>
          <span className={`access-badge ${p.access}`}>{accessLabel(p.access)}</span>
        </div>
        <h1>{p.title}</h1>
        <p className="case-lede">{p.short}</p>
        <div className="modal-meta">
          {p.platforms.map((t) => <span key={t}>{t}</span>)}
          {p.industries.map((t) => <span key={t}>{t}</span>)}
        </div>
      </section>

      <section className="modal-grid case-grid">
        <div>
          <h3>Business challenge</h3><p>{p.challenge}</p>
          <h3>Approach</h3><p>{p.approach}</p>
          <h3>Business value</h3><p>{p.value}</p>
          <h3>Capabilities</h3>
          <div>{p.capabilities.map((t) => <span key={t} className="tag">{t}</span>)}</div>
          {p.tags.length > 0 && (<><h3>Skills</h3><div>{p.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div></>)}
          <div className="access-note"><strong>{accessLabel(p.access)}</strong><span>{note}</span></div>
          <a className="btn goldbtn" style={{ marginTop: 20 }} href={`${EMAIL}?subject=${encodeURIComponent(`Enquiry: ${p.title}`)}`}>Discuss a Similar Project →</a>
        </div>
        <div>
          <div className="model-frame">
            {p.model_url ? (
              <iframe src={p.model_url} title={`${p.title} — interactive model`} allowFullScreen />
            ) : gallery[0] ? (
              <button className="plain" onClick={() => setLightbox(0)}><img src={gallery[0]} alt={p.title} style={{ maxWidth: "100%", borderRadius: 6 }} /></button>
            ) : (
              <div>
                <div className="mini-dashboard" style={{ position: "relative", inset: "auto", height: 200, marginBottom: 18 }}><i /><i /><i /><i /></div>
                <strong>{p.access === "interactive" ? "Interactive model area" : "Portfolio preview area"}</strong>
                <p>{p.access === "request" ? "Available on request — get in touch for a walkthrough." : "Model views will appear here."}</p>
              </div>
            )}
          </div>
          {p.model_url && (
            <a className="btn outline" style={{ marginTop: 12, color: "var(--wine)" }} href={p.model_url} target="_blank" rel="noreferrer">Open Full Screen ↗</a>
          )}
          {gallery.length > 0 && (
            <>
              <h3>Screenshots</h3>
              <div className="screenshot-strip">
                {gallery.map((s, i) => (
                  <button key={s} className="plain" onClick={() => setLightbox(i)} aria-label={`Open screenshot ${i + 1}`}>
                    <img src={s} alt={`${p.title} screenshot ${i + 1}`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="contact">
        <div>
          <p className="eyebrow gold">LET'S WORK TOGETHER</p>
          <h2>Need something like this for your business?</h2>
          <p>Tell me what you are trying to solve. I’ll respond with a practical view of how I can help.</p>
        </div>
        <div className="contact-links">
          <a className="btn goldbtn" href={EMAIL}>Discuss a Project</a>
          <Link to="/" hash="work">← Back to all work</Link>
        </div>
      </section>

      {lightbox !== null && gallery[lightbox] && (
        <Lightbox images={gallery} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </Shell>
  );
}

function Lightbox({ images, index, onChange, onClose }: { images: string[]; index: number; onChange: (i: number) => void; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onChange((index + 1) % images.length);
      if (e.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", k);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", k); };
  }, [index, images.length, onChange, onClose]);
  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button className="close" aria-label="Close" onClick={onClose}>×</button>
      {images.length > 1 && <button className="lb-nav prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); onChange((index - 1 + images.length) % images.length); }}>‹</button>}
      <img src={images[index]} alt={`Screenshot ${index + 1}`} onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && <button className="lb-nav next" aria-label="Next" onClick={(e) => { e.stopPropagation(); onChange((index + 1) % images.length); }}>›</button>}
      <span className="lb-count">{index + 1} / {images.length}</span>
    </div>
  );
}
