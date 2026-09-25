import { createFileRoute, Link } from "@tanstack/react-router";
import { Brandmark } from "@/components/site/Landing";

const EMAIL = "mailto:zahid@alphainsights.consulting?subject=Fractional%20CFO%20enquiry";

export const Route = createFileRoute("/fractional-cfo")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Fractional CFO Services | Alpha Insights" },
      {
        name: "description",
        content:
          "Fractional CFO services by Chaudhary Zahid Ali (ACCA, CMA, MBA): senior finance leadership on a flexible basis — planning, liquidity, controls, reporting and executive decision support.",
      },
      { property: "og:title", content: "Fractional CFO Services | Alpha Insights" },
      {
        property: "og:description",
        content:
          "Senior finance leadership on a flexible basis: planning, liquidity, controls, reporting and executive decision support — without the cost of a full-time CFO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FractionalCfoPage,
});

function FractionalCfoPage() {
  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/">
          <Brandmark />
          <span>
            <strong>ALPHA INSIGHTS</strong>
            <small>FINANCE · MODELLING · ADVISORY</small>
          </span>
        </Link>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/" hash="work">Portfolio</Link>
          <a className="btn small" href={EMAIL}>Discuss a Project</a>
        </nav>
      </header>
      <main>
        <section className="section light">
          <div className="section-head">
            <p className="eyebrow">FRACTIONAL CFO SERVICES</p>
            <h1>Senior finance leadership, without the full-time cost.</h1>
            <p className="lede">
              A fractional CFO gives your business experienced finance leadership on a flexible basis — the
              judgement, structure and decision support of a seasoned CFO, scaled to what you actually need.
            </p>
          </div>
          <p>
            I am Chaudhary Zahid Ali, an ACCA- and CMA-qualified finance professional with 15+ years across
            FP&amp;A, management reporting, financial modelling and finance transformation. I served as Head of
            Accounting &amp; Finance / Fractional CFO for United Fuel Company in partnership with PETRONAS, where I
            built the finance function from the ground up — controls, reporting, budgeting, cash flow and ERP.
          </p>
        </section>

        <section className="section dark">
          <div className="section-head">
            <p className="eyebrow gold">WHAT A FRACTIONAL CFO DELIVERS</p>
            <h2>Practical support across the finance agenda.</h2>
          </div>
          <div className="service-grid">
            {[
              ["Planning & Forecasting", "Budgets, rolling forecasts and scenario planning that give leadership a clear view of where the business is heading."],
              ["Liquidity & Cash Flow", "13-week cash-flow visibility, working-capital management and funding readiness so there are no surprises."],
              ["Controls & Reporting", "Management accounts, KPI packs, month-end discipline and internal controls that make performance easy to see and trust."],
              ["Executive Decision Support", "Investment appraisal, board-ready analysis and commercial insight behind the decisions that matter most."],
            ].map(([t, d], i) => (
              <article key={t}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section light">
          <div className="section-head">
            <p className="eyebrow">WHO THIS SUITS</p>
            <h2>Built for growing businesses.</h2>
          </div>
          <p>
            A fractional CFO engagement fits companies that have outgrown basic bookkeeping but are not ready — or
            do not need — a full-time CFO: founder-led businesses preparing to raise or invest, multi-location
            operators needing tighter reporting, and leadership teams that want a senior finance voice in the room
            for the decisions that shape the business.
          </p>
          <p>
            Engagements are flexible: a few days a month, a defined project, or interim cover while you hire. The
            goal is always the same — clear numbers, confident decisions and a stronger business.
          </p>
        </section>

        <section className="contact">
          <div>
            <p className="eyebrow gold">LET'S TALK</p>
            <h2>Explore whether a fractional CFO is right for you.</h2>
            <p>Tell me about your business and what you are trying to solve. I’ll respond with a practical view.</p>
          </div>
          <div className="contact-links">
            <a className="btn goldbtn" href={EMAIL}>Email Zahid</a>
            <Link to="/">Back to Home →</Link>
          </div>
        </section>
      </main>
      <footer>
        <Link className="brand" to="/">
          <Brandmark />
          <span><strong>ALPHA INSIGHTS</strong><small>BETTER INSIGHTS. SMARTER DECISIONS.</small></span>
        </Link>
        <span>© 2026 Alpha Insights</span>
      </footer>
    </>
  );
}
