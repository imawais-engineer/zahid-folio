import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accessLabel, CFO_PACK_SLUG, publicProjectsQuery, uniqueValues, type Project } from "@/lib/projects";
import heroImg from "@/assets/zahid-hero-clean.jpg";
import aboutImg from "@/assets/zahid-about.jpg";

const EMAIL = "mailto:zahid@alphainsights.consulting";

export function Brandmark() {
  return (
    <svg className="brandmark" viewBox="0 0 72 72" aria-hidden>
      <path d="M8 58 29 10h9L18 58H8Zm25 0 15-34 16 34H53l-4-10H35l-4 10H20Zm5-18h8l-4-10-4 10Z" />
      <path d="M56 11h8v28h-8z" />
    </svg>
  );
}

function CorporateMark({ company, qualification, kind }: { company: string; qualification: string; kind: string }) {
  return (
    <div className={`corporate-mark ${kind}`}>
      <span className="corporate-symbol" aria-hidden="true"><i /><i /><i /></span>
      <span className="corporate-copy"><strong>{company}</strong><small>{qualification}</small></span>
    </div>
  );
}

export function Landing({ showPhoto }: { showPhoto: boolean }) {
  const [navOpen, setNavOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: projects = [], isLoading } = useQuery(publicProjectsQuery);
  const openProject = projects.find((p) => p.id === openId) ?? null;
  const cfoPack = projects.find((p) => p.slug === CFO_PACK_SLUG);

  return (
    <>
      <header className="site-header" id="top">
        <a className="brand" href="#top">
          <Brandmark />
          <span>
            <strong>ALPHA INSIGHTS</strong>
            <small>FINANCE · MODELLING · ADVISORY</small>
          </span>
        </a>
        <button className="menu-toggle" aria-label="Open navigation" aria-expanded={navOpen} onClick={() => setNavOpen((o) => !o)}>
          ☰
        </button>
        <nav className={`nav ${navOpen ? "open" : ""}`} onClick={() => setNavOpen(false)}>
          <a href="#help">How I Help</a>
          <a href="#work">Work</a>
          <a href="#experience">Experience</a>
          <a href="#proof">Testimonials</a>
          <a href="#about">About</a>
          <a className="btn small" href={EMAIL}>Discuss a Project</a>
        </nav>
      </header>
      <main>
        <section className={`hero ${showPhoto ? "" : "no-portrait"}`}>
          <div className="hero-copy">
            <p className="eyebrow gold">FINANCIAL CLARITY. BETTER DECISIONS.</p>
            <h1>
              Strategic finance for <em>real business impact.</em>
            </h1>
            <h2>
              Chaudhary Zahid Ali <span>ACCA · CMA · MBA</span>
            </h2>
            <p className="hero-services">
              FP&amp;A <b>•</b> Financial Modelling <b>•</b> Management Reporting <b>•</b> Corporate Finance
            </p>
            <p className="lede">
              I help leadership teams turn complex financial data into clear, actionable insights that improve
              visibility, strengthen performance and support better decisions.
            </p>
            <div className="actions">
              <a className="btn goldbtn" href="#work">View My Work →</a>
              <a className="btn outline" href={EMAIL}>Discuss a Project</a>
            </div>
          </div>
          {showPhoto && (
            <div className="hero-portrait">
              <img src={heroImg} alt="Chaudhary Zahid Ali" />
            </div>
          )}
        </section>

        <section className="cred">
          <div><strong>15+</strong><span>Years Finance Experience</span></div>
          <div><strong>10+</strong><span>Years GCC Experience</span></div>
          <div><strong>ACCA · CMA · MBA</strong><span>Professional Qualifications</span></div>
          <div><strong>Excel · Power BI</strong><span>Decision-Support Tools</span></div>
        </section>

        <section className="section light" id="help">
          <div className="section-head split">
            <div>
              <p className="eyebrow">HOW I CAN HELP YOUR BUSINESS</p>
              <h2>From data to decisions.</h2>
              <p>Practical, commercially focused finance support built around the decisions management actually needs to make.</p>
            </div>
            <div className="promise">
              <strong>Clear numbers.</strong><strong>Confident decisions.</strong><strong>Stronger business.</strong>
            </div>
          </div>
          <div className="service-grid">
            {[
              ["FP&A & Reporting", "Management reporting, budgets, rolling forecasts, KPI packs and variance analysis that make performance easier to understand and act on."],
              ["Financial Modelling", "Integrated models, cash-flow forecasts, scenarios and sensitivities designed to test assumptions before committing resources."],
              ["Corporate Finance", "Valuation, acquisition/LBO modelling, feasibility studies and investment appraisal using NPV, IRR, ROI and payback analysis."],
              ["CFO Advisory", "Flexible senior finance support across planning, liquidity, controls, performance management and executive decision support."],
            ].map(([t, d], i) => (
              <article key={t}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="trusted">
          <p className="eyebrow">EXPERIENCE ACROSS LEADING ORGANISATIONS</p>
          <div className="wordmarks logo-row">
            <CorporateMark kind="pwc-mark" company="PwC" qualification="Audit & Assurance" />
            <CorporateMark kind="panda-corporate-mark" company="Panda" qualification="Panda Retail Company" />
            <CorporateMark kind="alamar-mark" company="Alamar Foods" qualification="Domino's Master Franchisee" />
            <CorporateMark kind="sixt-mark" company="SIXT · Samara" qualification="Mobility & Leasing" />
            <CorporateMark kind="petronas-mark" company="United Fuel Co." qualification="PETRONAS Partner" />
          </div>
          <p className="fine">
            Career experience includes PwC, Panda, Alamar Foods (master franchisee of Domino’s Pizza), SIXT/Samara, and
            United Fuel Company in partnership with PETRONAS.
          </p>
        </section>

        <section className="section dark" id="work">
          <div className="section-head">
            <p className="eyebrow gold">SELECTED WORK</p>
            <h2>Real models. Real business impact.</h2>
            <p>
              Each case study is built around a business question—not just an Excel file. Open a project to see the
              challenge, approach, key capabilities and interactive model area.
            </p>
          </div>
          <Portfolio projects={projects} loading={isLoading} onOpen={setOpenId} />
          {cfoPack && (
            <div className="cfo-pack">
              <div>
                <p className="eyebrow gold">FEATURED RESOURCE</p>
                <h3>{cfoPack.title}</h3>
                <p>
                  A concise executive view of how I approach reporting, forecasting, liquidity, performance, investment
                  decisions and management decision support.
                </p>
              </div>
              <button className="btn goldbtn" onClick={() => setOpenId(cfoPack.id)}>Preview Capability Pack →</button>
            </div>
          )}
        </section>

        <section className="section light" id="experience">
          <div className="section-head split">
            <div>
              <p className="eyebrow">PROFESSIONAL EXPERIENCE</p>
              <h2>A track record of improving finance visibility.</h2>
            </div>
            <p>From Big Four assurance to retail FP&amp;A, multi-country reporting, finance-function buildout and mobility-sector planning.</p>
          </div>
          <div className="timeline">
            {[
              ["PwC", "2006–2009", "Supervising Senior, Audit & Assurance"],
              ["Panda", "2010–2014 · 2017–2021", "Planning, Reporting & Operational Finance"],
              ["PETRONAS partnership", "2014–2015", "Head of Accounting & Finance / Fractional CFO"],
              ["Domino's / Alamar", "2015–2017", "Group Reporting Manager"],
              ["SIXT / Samara", "2024–2025", "FP&A & Reporting Manager"],
            ].map(([b, s, p]) => (
              <article key={b}><b>{b}</b><span>{s}</span><p>{p}</p></article>
            ))}
          </div>
          <div className="impact">
            <div><strong>4 weeks</strong><span>reduction in group reporting time through automation and standardisation</span></div>
            <div><strong>Finance function</strong><span>built from the ground up across controls, reporting, budgeting, cash flow and ERP</span></div>
            <div><strong>Decision support</strong><span>through modelling, scenario analysis, dashboards and capital appraisal</span></div>
          </div>
        </section>

        <section className="section burgundy" id="proof">
          <div className="section-head">
            <p className="eyebrow gold">CLIENT FEEDBACK</p>
            <h2>Trusted for clarity, professionalism and finance depth.</h2>
          </div>
          <div className="testimonials">
            {[
              ["Zahid provided exceptional service and maintained outstanding work ethics and professionalism throughout the entirety of the project.", "Upwork client · SaaS Startup Financial Analyst & Investor Presentation"],
              ["Chaudhry went above and beyond in a crunched time allocation for my project.", "Upwork client · Financial Analysis & Budgetary Review"],
              ["The freelancer demonstrated a high level of professionalism, expertise, and attention to detail throughout the evaluation process.", "Upwork client · Business Valuation"],
            ].map(([q, c]) => (
              <blockquote key={c}><div>★★★★★</div><p>“{q}”</p><cite>{c}</cite></blockquote>
            ))}
          </div>
        </section>

        <section className={`section light about ${showPhoto ? "" : "no-photo"}`} id="about">
          {showPhoto && <img src={aboutImg} alt="Zahid Ali portrait" />}
          <div>
            <p className="eyebrow">ABOUT ZAHID</p>
            <h2>Finance experience with an operator's perspective.</h2>
            <p>
              I am an ACCA- and CMA-qualified finance professional with 15+ years across FP&amp;A, business performance,
              management reporting, financial modelling, audit and finance transformation. My work has spanned retail,
              food &amp; beverage franchising, mobility, fuel &amp; energy and advisory environments.
            </p>
            <p>
              My focus is straightforward: make financial information useful—so leadership can see what is happening,
              understand why, and decide what to do next.
            </p>
            <div className="quals"><span>ACCA · United Kingdom</span><span>CMA · USA</span><span>MBA Executive · Finance</span></div>
          </div>
        </section>

        <section className="contact" id="contact">
          <div>
            <p className="eyebrow gold">LET'S WORK TOGETHER</p>
            <h2>Have a finance challenge in mind?</h2>
            <p>Tell me what you are trying to solve. I’ll respond with a practical view of how I can help.</p>
          </div>
          <div className="contact-links">
            <a className="btn goldbtn" href={EMAIL}>Email Zahid</a>
            <a href="https://www.linkedin.com/in/chaudhryzahidali/" target="_blank" rel="noreferrer">LinkedIn ↗</a>
            <a href="https://www.upwork.com/freelancers/chaudhryz2" target="_blank" rel="noreferrer">Upwork ↗</a>
            <small>General enquiries: contact@alphainsights.consulting</small>
          </div>
        </section>
      </main>
      <footer>
        <a className="brand" href="#top">
          <Brandmark />
          <span><strong>ALPHA INSIGHTS</strong><small>BETTER INSIGHTS. SMARTER DECISIONS.</small></span>
        </a>
        <span>© 2026 Alpha Insights</span>
      </footer>
      {openProject && <ProjectModal p={openProject} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Portfolio({ projects, loading, onOpen }: { projects: Project[]; loading: boolean; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [pf, setPf] = useState("all");
  const [cf, setCf] = useState("all");
  const [inf, setInf] = useState("all");
  const pool = useMemo(() => projects.filter((p) => p.slug !== CFO_PACK_SLUG), [projects]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return pool
      .filter((p) => pf === "all" || p.platforms.includes(pf))
      .filter((p) => cf === "all" || p.capabilities.includes(cf))
      .filter((p) => inf === "all" || p.industries.includes(inf))
      .filter(
        (p) =>
          !s ||
          [p.title, p.short, ...p.platforms, ...p.capabilities, ...p.industries, ...p.tags, p.challenge, p.approach, p.value]
            .join(" ")
            .toLowerCase()
            .includes(s),
      );
  }, [pool, q, pf, cf, inf]);

  const sel = (id: string, label: string, all: string, val: string, set: (v: string) => void, opts: string[]) => (
    <div className="filter-group">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={val} onChange={(e) => set(e.target.value)}>
        <option value="all">{all}</option>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <div className="portfolio-tools" aria-label="Portfolio filters">
        <div className="filter-group search-group">
          <label htmlFor="portfolioSearch">Search / type your own</label>
          <input id="portfolioSearch" type="search" placeholder="e.g. working capital, SaaS, Power BI" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {sel("platformFilter", "Platform", "All platforms", pf, setPf, uniqueValues(pool, "platforms"))}
        {sel("capabilityFilter", "Capability", "All capabilities", cf, setCf, uniqueValues(pool, "capabilities"))}
        {sel("industryFilter", "Industry", "All industries", inf, setInf, uniqueValues(pool, "industries"))}
        <button className="clear-filters" type="button" onClick={() => { setQ(""); setPf("all"); setCf("all"); setInf("all"); }}>
          Clear filters
        </button>
        <span className="portfolio-count">{loading ? "Loading…" : `${list.length} project${list.length === 1 ? "" : "s"}`}</span>
      </div>
      <div className="portfolio-grid">
        {!loading && list.length === 0 && (
          <div className="no-results">No portfolio items match these filters yet. Try clearing one or more filters.</div>
        )}
        {list.map((p, i) => (
          <article
            key={p.id}
            className={`project ${p.featured ? "featured" : ""}`}
            tabIndex={0}
            onClick={() => onOpen(p.id)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(p.id)}
          >
            <div className="project-visual">
              {p.thumbnail_url ? (
                <img className="thumb" src={p.thumbnail_url} alt={p.title} />
              ) : (
                <div className="mini-dashboard"><i /><i /><i /><i /></div>
              )}
              <span className={`access-badge ${p.access}`}>{accessLabel(p.access)}</span>
            </div>
            <div className="project-body">
              <div className="project-meta">
                <span>{p.platforms.join(" + ")}</span>
                {p.industries[0] && <span>{p.industries[0]}</span>}
              </div>
              <span className="eyebrow gold">{String(i + 1).padStart(2, "0")}</span>
              <h3>{p.title}</h3>
              <p>{p.short}</p>
              <span className="project-links">
                <span>Quick view →</span>
                {p.slug && <Link to="/projects/$slug" params={{ slug: p.slug }} onClick={(e) => e.stopPropagation()}>View Full Case Study →</Link>}
              </span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function ProjectModal({ p, onClose }: { p: Project; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", k);
    };
  }, [onClose]);
  const note =
    p.access === "request"
      ? "Selected screenshots can be public while the full model is shared privately."
      : p.access === "preview"
        ? "Selected model views can be shown without exposing the underlying workbook."
        : "The live OneDrive / Excel Online or Power BI model is embedded alongside.";
  return (
    <div className="modal open" aria-hidden="false">
      <div className="backdrop" onClick={onClose} />
      <article className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <div className="modal-hero">
          <div className="modal-kicker">
            <p className="eyebrow gold">CASE STUDY</p>
            <span className={`access-badge ${p.access}`}>{accessLabel(p.access)}</span>
          </div>
          <h2 id="modalTitle">{p.title}</h2>
          <p>{p.short}</p>
          <div className="modal-meta"><span>{p.platforms.join(" + ")}</span><span>{p.industries.join(" · ")}</span></div>
        </div>
        <div className="modal-grid">
          <div>
            <h3>Business challenge</h3><p>{p.challenge}</p>
            <h3>Approach</h3><p>{p.approach}</p>
            <h3>Business value</h3><p>{p.value}</p>
            <h3>Capabilities</h3>
            <div>{[...p.capabilities, ...p.tags].map((t) => <span key={t} className="tag">{t}</span>)}</div>
            <div className="access-note"><strong>{accessLabel(p.access)}</strong><span>{note}</span></div>
            {p.slug && <Link className="btn goldbtn" style={{ marginTop: 18 }} to="/projects/$slug" params={{ slug: p.slug }}>View Full Case Study →</Link>}
          </div>
          <div>
            <div className="model-frame">
              {p.model_url ? (
                <iframe src={p.model_url} title={p.title} allowFullScreen />
              ) : p.thumbnail_url ? (
                <img src={p.thumbnail_url} alt={p.title} style={{ maxWidth: "100%", borderRadius: 6 }} />
              ) : (
                <div>
                  <strong>{p.access === "interactive" ? "Interactive model area" : "Portfolio preview area"}</strong>
                  <p>{p.access === "interactive" ? "The live model link will appear here once added." : "Screenshots or selected views will be shown here."}</p>
                </div>
              )}
            </div>
            {p.model_url && (
              <a className="btn goldbtn" style={{ marginTop: 12 }} href={p.model_url} target="_blank" rel="noreferrer">Open Full Screen ↗</a>
            )}
            {p.screenshots.length > 0 && (
              <div className="screenshot-strip">
                {p.screenshots.map((s) => (
                  <a key={s} href={s} target="_blank" rel="noreferrer"><img src={s} alt={`${p.title} screenshot`} /></a>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
