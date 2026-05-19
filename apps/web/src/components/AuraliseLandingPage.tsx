export function AuraliseLandingPage() {
  const githubUrl = "https://github.com/Whauv/Auralize";
  const liveAppUrl = "https://auralizee.vercel.app/";

  return (
    <main className="aur2-root">
      <div className="aur2-bg-layer" aria-hidden="true" />
      <div className="aur2-bg-trails" aria-hidden="true">
        <svg viewBox="0 0 1600 980" preserveAspectRatio="xMidYMid slice">
          <path className="aur2-trail strong" d="M-42 186 C 178 118, 348 282, 562 234 C 792 186, 972 342, 1190 290 C 1340 254, 1452 334, 1644 284" />
          <path className="aur2-trail soft" d="M-30 358 C 200 290, 392 430, 632 386 C 870 346, 1042 500, 1242 452 C 1392 420, 1492 500, 1672 466" />
          <path className="aur2-trail strong" d="M-72 590 C 160 530, 352 670, 596 620 C 842 570, 1002 716, 1250 662 C 1420 628, 1522 704, 1702 674" />
          <path className="aur2-trail soft" d="M-94 760 C 168 684, 358 822, 594 758 C 826 692, 1000 824, 1220 772 C 1352 740, 1464 810, 1588 784" />
          <circle className="aur2-dot a" cx="562" cy="234" r="3.2" />
          <circle className="aur2-dot b" cx="1190" cy="290" r="2.8" />
          <circle className="aur2-dot a" cx="632" cy="386" r="3.1" />
          <circle className="aur2-dot b" cx="1242" cy="452" r="2.8" />
          <circle className="aur2-dot a" cx="596" cy="620" r="3.2" />
          <circle className="aur2-dot b" cx="1250" cy="662" r="2.8" />
        </svg>
      </div>
      <div className="aur2-bg-grain" aria-hidden="true" />

      <header className="aur2-header">
        <div className="aur2-shell aur2-topbar">
          <div className="aur2-brand">
            <div>
              <p className="aur2-brand-title">Auralize</p>
              <p className="aur2-brand-sub">Music Listening Behavior Analytics Platform</p>
            </div>
          </div>
          <nav className="aur2-nav">
            <a href="#overview">Overview</a>
            <a href="#why">Why Auralize exists</a>
            <a href="#how">How Auralize works</a>
            <a href="#install">Install</a>
            <a href="#stack">Built with</a>
            <a href="#links">Links</a>
          </nav>
          <div className="aur2-actions">
            <a className="aur2-btn" href={githubUrl} target="_blank" rel="noreferrer">
              View source on GitHub
            </a>
            <a className="aur2-btn aur2-btn-primary" href={liveAppUrl} target="_blank" rel="noreferrer">
              Open Auralize product
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="aur2-shell aur2-hero">
          <div className="aur2-hero-title">
            <p className="aur2-kicker">Listening Intelligence</p>
            <h1>Upload your history, paste a profile, or switch to live scrobbles.</h1>
          </div>

          <div className="aur2-hero-support">
            <p className="aur2-body">Use Google Takeout for YouTube Music-only analytics, switch to the unified YouTube tab to include music plays from the main YouTube app too, upload Apple Music activity exports, paste a YouTube Music profile link for a lightweight public preview, or use Last.fm Live Mode for a fresh snapshot of your listening identity.</p>
            <div className="aur2-chip-row">
              <span className="aur2-chip">Recap-ready</span>
              <span className="aur2-chip">Music passport</span>
              <span className="aur2-chip">Unified YouTube mode</span>
              <span className="aur2-chip">Apple Music import</span>
            </div>
            <div className="aur2-cta-row">
              <a className="aur2-btn aur2-btn-primary" href={liveAppUrl} target="_blank" rel="noreferrer">
                Open Auralize product
              </a>
              <a className="aur2-btn" href={githubUrl} target="_blank" rel="noreferrer">
                View source on GitHub
              </a>
            </div>
          </div>
        </section>

        <section id="overview" className="aur2-shell aur2-band">
          <div className="aur2-section-head">
            <p className="aur2-kicker">Overview</p>
            <h2>One product, multiple music sources, one explainable identity layer.</h2>
            <p>
              Auralize lets users upload or connect listening history from YouTube Music, unified
              YouTube + Music, Apple Music exports, Last.fm Live Mode, and profile previews, then
              turns it into behavior-level insights and share-ready outputs.
            </p>
          </div>
          <div className="aur2-interesting">
            <article>
              <h3>What it does</h3>
              <p>Transforms raw history into top songs, artists, moods, genres, trends, and recaps.</p>
            </article>
            <article>
              <h3>Who it is for</h3>
              <p>Music lovers, data-curious users, and creators who want meaningful recap storytelling.</p>
            </article>
            <article>
              <h3>What users get</h3>
              <p>Dashboard analytics, compare mode, session saving, and export/share passport surfaces.</p>
            </article>
            <article>
              <h3>Trust layer</h3>
              <p>Data quality review and source breakdown to explain what was used or excluded.</p>
            </article>
          </div>
        </section>

        <section id="why" className="aur2-shell aur2-band">
          <div className="aur2-section-head">
            <p className="aur2-kicker">Why Auralize exists</p>
            <h2>Listening logs are rich, but hard to interpret without structure.</h2>
            <p>Auralize turns raw watch and scrobble history into a narrative of behavior: what changed, what stayed stable, where moods shifted, which genres took over, and how identity evolved over time.</p>
          </div>
          <div className="aur2-why-grid">
            <div>
              <p className="aur2-body">The project solves a practical gap: users can export data from multiple sources, but they rarely get meaningful interpretation without manual analysis. Auralize closes that gap by combining ingestion, enrichment, and visualization into one flow.</p>
            </div>
            <aside className="aur2-note-rail">
              <p><strong>Problem:</strong> raw data is fragmented and noisy.</p>
              <p><strong>Approach:</strong> source-aware parsing + normalized analytics.</p>
              <p><strong>Outcome:</strong> portable dashboards, recap views, and a music identity lens.</p>
            </aside>
          </div>
        </section>

        <section id="how" className="aur2-shell aur2-band">
          <div className="aur2-section-head">
            <p className="aur2-kicker">How Auralize works</p>
            <h2>From upload to explainable insight.</h2>
            <p>The app accepts multiple source modes, processes entries, enriches them, and renders structured outputs for exploration and sharing.</p>
          </div>
          <div className="aur2-flow-wrap">
            <div className="aur2-flow-step"><p>Input</p><strong>Google Takeout / YouTube + Music / Apple Music / Last.fm Live Mode</strong></div>
            <div className="aur2-flow-step"><p>Ingestion</p><strong>File validation, source detection, upload orchestration</strong></div>
            <div className="aur2-flow-step"><p>Processing</p><strong>Parsing, normalization, source tagging, artist/title cleanup</strong></div>
            <div className="aur2-flow-step"><p>Analytics</p><strong>Timeframe filters, trend extraction, genre/mood/stat synthesis</strong></div>
            <div className="aur2-flow-step"><p>Output</p><strong>Dashboard, recap-ready views, music passport, share surfaces</strong></div>
          </div>
        </section>

        <section id="install" className="aur2-shell aur2-band">
          <div className="aur2-section-head">
            <p className="aur2-kicker">Install</p>
            <h2>Run Auralize locally in a few steps.</h2>
            <p>
              If you want to self-host or contribute, clone the repository and run both the API and
              web app.
            </p>
          </div>
          <div className="aur2-stack-grid">
            <div className="aur2-stack-col">
              <h3>1. Clone and install</h3>
              <ul>
                <li>Clone the repo and open the project root.</li>
                <li>Install frontend dependencies in <code>apps/web</code>.</li>
                <li>Create a Python virtual environment in <code>apps/api</code>.</li>
              </ul>
            </div>
            <div className="aur2-stack-col">
              <h3>2. Configure environment</h3>
              <ul>
                <li>Create <code>apps/api/.env</code> from <code>.env.example</code>.</li>
                <li>Set <code>YOUTUBE_API_KEY</code> and optional <code>LASTFM_API_KEY</code>.</li>
                <li>Set <code>VITE_API_BASE_URL=http://localhost:8000</code> for web.</li>
              </ul>
            </div>
            <div className="aur2-stack-col">
              <h3>3. Start services</h3>
              <ul>
                <li>Run API: <code>uvicorn app.main:app --reload</code> in <code>apps/api</code>.</li>
                <li>Run web: <code>npm run dev</code> in <code>apps/web</code>.</li>
                <li>Open <code>http://localhost:5173</code>.</li>
              </ul>
            </div>
            <div className="aur2-stack-col">
              <h3>Alternative</h3>
              <ul>
                <li>Use Docker Compose from repo root.</li>
                <li>Launch both API and web with one command.</li>
                <li>Great for first-time setup consistency.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="stack" className="aur2-shell aur2-band">
          <div className="aur2-section-head">
            <p className="aur2-kicker">Built with</p>
            <h2>Frontend, backend, data, and visualization stack.</h2>
          </div>
          <div className="aur2-stack-grid">
            <div className="aur2-stack-col">
              <h3>Frontend</h3>
              <ul>
                <li>React + TypeScript</li>
                <li>Component-driven UI composition</li>
                <li>Responsive layout and motion layers</li>
              </ul>
            </div>
            <div className="aur2-stack-col">
              <h3>Backend</h3>
              <ul>
                <li>FastAPI service architecture</li>
                <li>Job-based analysis endpoints</li>
                <li>Cache-aware response orchestration</li>
              </ul>
            </div>
            <div className="aur2-stack-col">
              <h3>Data Processing</h3>
              <ul>
                <li>Source-aware parsers</li>
                <li>Normalization + enrichment pipeline</li>
                <li>Quality summary and anomaly checks</li>
              </ul>
            </div>
            <div className="aur2-stack-col">
              <h3>Visualization</h3>
              <ul>
                <li>Interactive dashboard patterns</li>
                <li>Genre and mood trend views</li>
                <li>Share/export presentation surfaces</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="story" className="aur2-shell aur2-band">
          <div className="aur2-section-head">
            <p className="aur2-kicker">Project creation story</p>
            <h2>From idea to production-ready experience.</h2>
          </div>
          <div className="aur2-timeline">
            <article className="aur2-time-item">
              <p className="t">Phase 1</p>
              <h3>Problem discovery</h3>
              <p>Started from a simple question: "What does my listening history actually say about me?" Existing exports gave data, not interpretation.</p>
            </article>
            <article className="aur2-time-item">
              <p className="t">Phase 2</p>
              <h3>Source strategy</h3>
              <p>Designed ingestion across multiple ecosystems so users could analyze behavior beyond a single platform format.</p>
            </article>
            <article className="aur2-time-item">
              <p className="t">Phase 3</p>
              <h3>Analytics model</h3>
              <p>Built filters and derived features around timeframe, mood, genre, recurrence, and trend shifts to make output meaningful.</p>
            </article>
            <article className="aur2-time-item">
              <p className="t">Phase 4</p>
              <h3>UX + trust layer</h3>
              <p>Added quality review and source breakdown so users can understand what was used, inferred, or excluded.</p>
            </article>
          </div>
        </section>

        <section className="aur2-shell aur2-band">
          <div className="aur2-section-head">
            <p className="aur2-kicker">What makes it interesting</p>
            <h2>Technical decisions with product-level impact.</h2>
          </div>
          <div className="aur2-interesting">
            <article><h3>Source-aware ingestion</h3><p>Different input modes are handled intentionally, not as one flat parser path.</p></article>
            <article><h3>Timeframe intelligence</h3><p>Behavior is reframed across windows so users can compare identity shifts over time.</p></article>
            <article><h3>Data quality visibility</h3><p>The trust layer surfaces usable vs ignored entries and source confidence context.</p></article>
            <article><h3>Shareable outcomes</h3><p>Insights are not trapped in raw charts; they are packaged for recap and profile sharing workflows.</p></article>
          </div>
        </section>

        <section id="links" className="aur2-shell aur2-band aur2-final-cta">
          <p className="aur2-kicker">Links</p>
          <h2>Jump straight to the two things users need.</h2>
          <div className="aur2-cta-row">
            <a className="aur2-btn aur2-btn-primary" href={liveAppUrl} target="_blank" rel="noreferrer">
              Open product
            </a>
            <a className="aur2-btn" href={githubUrl} target="_blank" rel="noreferrer">
              GitHub repository
            </a>
          </div>
        </section>
      </main>

      <footer className="aur2-footer">
        <div className="aur2-shell">Auralize</div>
      </footer>
    </main>
  );
}
