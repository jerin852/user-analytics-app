
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";
const DEMO_URL = "http://localhost:5000/shop";

const menus = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "pages", label: "Page Views", icon: "◉" },
  { id: "clicks", label: "Click Activities", icon: "⌁" },
  { id: "events", label: "All Events", icon: "◷" },
  { id: "sessions", label: "Sessions", icon: "◎" },
  { id: "timestamps", label: "Timestamps", icon: "◷" },
];

function titleCase(value = "") {
  return value.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function App() {
  const [active, setActive] = useState("overview");
  const [stats, setStats] = useState({
    totalEvents: 0,
    pageViews: 0,
    clicks: 0,
  });
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError("");

      const responses = await Promise.all([
        fetch(`${API}/events/stats`),
        fetch(`${API}/events?limit=500`),
        fetch(`${API}/sessions`),
      ]);

      if (responses.some(response => !response.ok)) {
        throw new Error("Could not load analytics from the server.");
      }

      const [summary, eventData, sessionData] = await Promise.all(
        responses.map(response => response.json())
      );

      setStats({
        totalEvents: summary.totalEvents ?? 0,
        pageViews: summary.pageViews ?? 0,
        clicks: summary.clicks ?? 0,
      });

      setEvents(Array.isArray(eventData) ? eventData : eventData.events ?? []);
      setSessions(
        Array.isArray(sessionData) ? sessionData : sessionData.sessions ?? []
      );
    } catch (err) {
      setError(err.message || "Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, [loadData]);

  const pageEvents = events.filter(event => event.eventType === "page_view");
  const clickEvents = events.filter(event => event.eventType !== "page_view");

  const visibleEvents = (
    active === "pages"
      ? pageEvents
      : active === "clicks"
        ? clickEvents
        : events
  ).filter(event => {
    const text = [
      event.eventType,
      event.page,
      event.element,
      event.sessionId,
      JSON.stringify(event.details ?? {}),
    ].join(" ").toLowerCase();

    return text.includes(search.toLowerCase());
  });

  function openDemo() {
    window.open(DEMO_URL, "_blank", "noopener,noreferrer");
  }

  function renderEventsTable(rows) {
    if (loading) return <div className="empty-state">Loading analytics...</div>;

    if (!rows.length) {
      return (
        <div className="empty-state">
          <div className="empty-symbol">◷</div>
          <h3>No matching activity</h3>
          <p>Open the demo store and interact with it to collect events.</p>
          <button className="primary-button" onClick={openDemo}>
            Open Demo Store ↗
          </button>
        </div>
      );
    }

    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Event Type</th>
              <th>Page</th>
              <th>Element</th>
              <th>Session ID</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event, index) => (
              <tr key={event._id || `${event.sessionId}-${index}`}>
                <td>
                  <span className={`event-pill ${event.eventType || "unknown"}`}>
                    {titleCase(event.eventType || "unknown")}
                  </span>
                </td>
                <td>{event.page || "—"}</td>
                <td>{event.element || event.sectionId || "—"}</td>
                <td className="mono">
                  {event.sessionId
                    ? `${event.sessionId.slice(0, 16)}…`
                    : "—"}
                </td>
                <td>{formatDate(event.timestamp || event.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderOverview() {
    const recentEvents = events.slice(0, 8);
    const paymentCount = events.filter(
      event => event.eventType === "checkout_completed"
    ).length;

    const activityTypes = [
      ["Page Views", stats.pageViews, "blue"],
      ["Clicks & Interactions", stats.clicks, "orange"],
      ["Sessions", sessions.length, "green"],
      ["Demo Checkouts Completed", paymentCount, "pink"],
    ];

    return (
      <>
        <section className="metric-grid">
          <Metric title="Total Events" value={stats.totalEvents} color="purple" icon="◈" />
          <Metric title="Page Views" value={stats.pageViews} color="blue" icon="◉" />
          <Metric title="Clicks & Interactions" value={stats.clicks} color="orange" icon="⌁" />
          <Metric title="Sessions" value={sessions.length} color="green" icon="◎" />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Activity Breakdown</h2>
              <p>Summary of the tracked visitor activity</p>
            </div>
          </div>
          <div className="breakdown-grid">
            {activityTypes.map(([label, value, color]) => (
              <div className="breakdown-item" key={label}>
                <div className={`breakdown-bar ${color}`}>
                  <span style={{ width: `${stats.totalEvents ? Math.min(100, (Number(value) / stats.totalEvents) * 100) : 0}%` }} />
                </div>
                <strong>{Number(value).toLocaleString()}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest events received from the tracking script</p>
            </div>
            <button className="text-button" onClick={() => setActive("events")}>
              View all →
            </button>
          </div>
          {renderEventsTable(recentEvents)}
        </section>
      </>
    );
  }

  function renderSessions() {
    if (loading) return <section className="panel empty-state">Loading sessions...</section>;

    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Visitor Sessions</h2>
            <p>Each row represents a session that has recorded events</p>
          </div>
          <span className="count-chip">{sessions.length} sessions</span>
        </div>
        {sessions.length === 0 ? (
          <div className="empty-state">No sessions yet. Open the demo store first.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Total Events</th>
                  <th>Page Views</th>
                  <th>Interactions</th>
                  <th>First Activity</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => (
                  <tr key={session._id}>
                    <td className="mono">{session._id}</td>
                    <td>{session.totalEvents ?? 0}</td>
                    <td>{session.pageViews ?? 0}</td>
                    <td>{session.clicks ?? 0}</td>
                    <td>{formatDate(session.firstActivity)}</td>
                    <td>{formatDate(session.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  const headings = {
    overview: ["Overview Dashboard", "Your website activity at a glance."],
    pages: ["Page Views", "Every recorded page-view event."],
    clicks: ["Click Activities", "Clicks and other tracked interactions."],
    events: ["All Events", "Search and inspect recorded analytics events."],
    sessions: ["Visitor Sessions", "Review individual visitor sessions."],
    timestamps: ["Event Timeline", "Review events by their recorded timestamps."],
  };

  const [heading, description] = headings[active];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">IF</div>
          <div>
            <strong>InsightFlow</strong>
            <span>USER ANALYTICS</span>
          </div>
        </div>

        <div className="side-label">ANALYTICS MENU</div>
        <nav className="side-nav">
          {menus.map(item => (
            <button
              key={item.id}
              className={`nav-button ${active === item.id ? "selected" : ""}`}
              onClick={() => {
                setActive(item.id);
                setSearch("");
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {active === item.id && <span className="nav-arrow">›</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="online-dot" />
          <span>Analytics API</span>
          <strong>LOCAL</strong>
        </div>
      </aside>

      <main className="main-area">
        <header className="page-header">
          <div>
            <div className="breadcrumb">WORKSPACE / ANALYTICS</div>
            <h1>{heading}</h1>
            <p>{description}</p>
          </div>
          <div className="header-buttons">
            <button className="secondary-button" onClick={loadData}>↻ Refresh</button>
            <button className="primary-button" onClick={openDemo}>Open Demo Store ↗</button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <strong>Backend connection issue</strong>
            <span>{error} Ensure the Node server and MongoDB are running.</span>
          </div>
        )}

        {active === "overview" && renderOverview()}

        {(active === "pages" || active === "clicks" || active === "events" || active === "timestamps") && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {active === "pages" ? "Page View Records"
                    : active === "clicks" ? "Interaction Records"
                      : active === "timestamps" ? "Chronological Activity"
                        : "All Recorded Events"}
                </h2>
                <p>
                  {active === "pages" ? `${pageEvents.length} page views loaded`
                    : active === "clicks" ? `${clickEvents.length} interactions loaded`
                      : `${events.length} events loaded`}
                </p>
              </div>
              <span className="count-chip">{visibleEvents.length} shown</span>
            </div>

            <div className="filter-row">
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search event, page, element or session ID..."
                aria-label="Search analytics events"
              />
            </div>

            {renderEventsTable(
              active === "timestamps"
                ? [...visibleEvents].sort(
                    (a, b) =>
                      new Date(b.timestamp || b.createdAt || 0) -
                      new Date(a.timestamp || a.createdAt || 0)
                  )
                : visibleEvents
            )}
          </section>
        )}

        {active === "sessions" && renderSessions()}

        <footer className="page-footer">
          <span>InsightFlow · User Analytics</span>
          <span>Auto-refresh every 10 seconds</span>
        </footer>
      </main>
    </div>
  );
}

function Metric({ title, value, color, icon }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <span className={`metric-icon ${color}`}>{icon}</span>
      </div>
      <strong>{Number(value).toLocaleString()}</strong>
      <span className="metric-caption">Live recorded data</span>
      <div className={`metric-accent ${color}`} />
    </article>
  );
}

export default App;
