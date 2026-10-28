
import React, { useCallback, useEffect, useState } from "react";

const API = "https://user-analytics-app-xm4s.onrender.com";

const styles = `
* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  min-height: 100%;
  width: 100%;
}

body {
  background: #0b1020;
  color: #f1f5f9;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
  font-size: 14px;
}

button, input {
  font: inherit;
}

button {
  cursor: pointer;
}

button:focus-visible, input:focus-visible {
  outline: 2px solid #818cf8;
  outline-offset: 3px;
}

.dashboard {
  min-height: 100vh;
  width: 100%;
  background: #0b1020;
}

.container {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 28px 32px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 30px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #4f46e5;
  font-size: 24px;
}

.brand h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 750;
  letter-spacing: -.5px;
}

.subtitle {
  margin: 6px 0 0;
  color: #94a3b8;
  line-height: 1.6;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #a7f3d0;
  margin-right: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 10px 16px;
  border: 1px solid #334155;
  border-radius: 10px;
  color: #e2e8f0;
  background: #172033;
  font-weight: 650;
  transition: background .2s, transform .2s;
}

.btn:hover {
  background: #263249;
}

.btn:active {
  transform: scale(.98);
}

.btn-primary {
  color: white;
  background: #6258ed;
  border-color: #6258ed;
}

.btn-primary:hover {
  background: #4f46e5;
}

.btn:disabled {
  opacity: .6;
  cursor: wait;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin: 0 0 22px;
}

.section-heading h2 {
  margin: 0;
  font-size: 27px;
  letter-spacing: -.5px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  min-width: 0;
  padding: 23px;
  border: 1px solid #26334b;
  border-radius: 16px;
  background: #141c30;
}

.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.stat-label {
  color: #a5b4cc;
  font-weight: 550;
}

.stat-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #252b4c;
  font-size: 19px;
}

.stat-value {
  margin-top: 20px;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -1px;
  overflow-wrap: anywhere;
}

.stat-note {
  margin-top: 8px;
  color: #8190aa;
  font-size: 12px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  margin-bottom: 25px;
  background: #141c30;
  border: 1px solid #26334b;
  border-radius: 13px;
}

.tab {
  padding: 11px 16px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #a5b4cc;
  font-weight: 650;
}

.tab:hover {
  background: #202b43;
  color: white;
}

.tab.active {
  background: #6258ed;
  color: white;
}

.panel {
  min-width: 0;
  margin-bottom: 24px;
  padding: 24px;
  border: 1px solid #26334b;
  border-radius: 16px;
  background: #141c30;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 22px;
}

.panel-header h3 {
  margin: 0;
  font-size: 19px;
}

.panel-header p {
  margin: 7px 0 0;
}

.search-input {
  width: min(300px, 100%);
  min-height: 42px;
  padding: 10px 14px;
  border: 1px solid #334155;
  border-radius: 10px;
  background: #0b1020;
  color: #f1f5f9;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

thead {
  background: #202a40;
}

th, td {
  padding: 15px 16px;
  border-bottom: 1px solid #29354b;
  white-space: nowrap;
}

th {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
}

td {
  color: #e2e8f0;
  font-size: 13px;
}

tbody tr:hover {
  background: #1a253a;
}

.event-name {
  font-weight: 700;
  color: #c4b5fd;
}

.pill {
  display: inline-block;
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  padding: 5px 9px;
  border-radius: 7px;
  background: #252b4c;
  color: #c7d2fe;
  font-size: 11px;
}

.empty {
  padding: 36px 16px;
  text-align: center;
  color: #94a3b8;
  line-height: 1.8;
}

.error {
  margin-bottom: 22px;
  padding: 16px;
  border: 1px solid #7f1d1d;
  border-radius: 12px;
  background: #351923;
  color: #fecaca;
  line-height: 1.6;
}

.info {
  margin-bottom: 20px;
  color: #94a3b8;
  font-size: 12px;
}

.session-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.session-card {
  min-width: 0;
  padding: 18px;
  border: 1px solid #334155;
  border-radius: 12px;
  background: #10182a;
}

.session-card h4 {
  margin: 0 0 16px;
  overflow-wrap: anywhere;
  color: #c4b5fd;
}

.session-card p {
  color: #a5b4cc;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.timeline {
  display: grid;
  gap: 0;
}

.timeline-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 14px;
  padding-bottom: 25px;
}

.timeline-dot {
  width: 11px;
  height: 11px;
  margin-top: 5px;
  border-radius: 50%;
  background: #818cf8;
  box-shadow: 0 0 0 5px #252b4c;
}

.timeline-item strong {
  color: #e0e7ff;
}

.timeline-item p {
  margin: 7px 0;
  color: #a5b4cc;
  overflow-wrap: anywhere;
}

.footer {
  padding: 18px 0 6px;
  color: #64748b;
  text-align: center;
  font-size: 12px;
}

.demo-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  width: 100%;
  height: 100%;
  background: #f5f7fb;
}

.demo-screen iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

@media (max-width: 1050px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .session-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .container {
    padding: 24px;
  }
}

@media (max-width: 640px) {
  .container {
    padding: 16px;
  }

  .header {
    align-items: flex-start;
  }

  .brand h1 {
    font-size: 19px;
  }

  .header-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .status {
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-card {
    padding: 18px;
  }

  .stat-value {
    font-size: 29px;
  }

  .section-heading h2 {
    font-size: 23px;
  }

  .tabs {
    gap: 5px;
  }

  .tab {
    padding: 10px;
    font-size: 12px;
  }

  .panel {
    padding: 16px;
  }

  .session-grid {
    grid-template-columns: 1fr;
  }

  .panel-header {
    align-items: flex-start;
  }

  .search-input {
    width: 100%;
  }
}
`;

const getSessionId = () => {
  const key = "user_analytics_dashboard_session";

  try {
    let id = sessionStorage.getItem(key);

    if (!id) {
      id = window.crypto?.randomUUID?.() ||
        `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      sessionStorage.setItem(key, id);
    }

    return id;
  } catch {
    return `session-${Date.now()}`;
  }
};

const getEventName = (event) =>
  event?.eventType || event?.event || event?.type || "unknown_event";

const getTime = (event) =>
  event?.timestamp || event?.createdAt || event?.time || null;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString();
};

const extractList = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

function MetricCard({ title, value, icon, note }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}

function EventTable({ events }) {
  if (!events.length) {
    return (
      <div className="empty">
        No activities recorded yet.
        <br />
        Open the Demo Store and perform some actions.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Event Type</th>
            <th>Page</th>
            <th>Element / Details</th>
            <th>Session ID</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => {
            const details =
              event.details && typeof event.details === "object"
                ? JSON.stringify(event.details)
                : event.element || event.details || "—";

            return (
              <tr key={event._id || event.id || `${getEventName(event)}-${index}`}>
                <td>
                  <span className="event-name">{getEventName(event)}</span>
                </td>
                <td>{event.page || "—"}</td>
                <td>{String(details)}</td>
                <td>
                  <span className="pill">{event.sessionId || "—"}</span>
                </td>
                <td>{formatDate(getTime(event))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showDemo, setShowDemo] = useState(false);

  const [stats, setStats] = useState({});
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sessionId] = useState(getSessionId);

  const refreshDashboard = useCallback(async () => {
    try {
      const endpoints = [
        `${API}/api/events/stats`,
        `${API}/api/events?limit=500`,
        `${API}/api/sessions`
      ];

      const responses = await Promise.all(
        endpoints.map(async (url) => {
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`${url} returned HTTP ${response.status}`);
          }

          return response.json();
        })
      );

      const [statsData, eventsData, sessionsData] = responses;

      const eventList = extractList(eventsData, "events");
      const sessionList = extractList(sessionsData, "sessions");

      eventList.sort((a, b) => {
        const dateA = new Date(getTime(a) || 0).getTime();
        const dateB = new Date(getTime(b) || 0).getTime();
        return dateB - dateA;
      });

      setStats(statsData || {});
      setEvents(eventList);
      setSessions(sessionList);
      setError("");
    } catch (err) {
      setError(
        `${err.message}. Check that the backend is running at ${API} and that the API routes are available.`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();

    const timer = window.setInterval(refreshDashboard, 10000);

    return () => window.clearInterval(timer);
  }, [refreshDashboard]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== API) return;

      if (event.data?.type === "RETURN_TO_DASHBOARD") {
        setShowDemo(false);
        setActiveTab("overview");
        refreshDashboard();
      }
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [refreshDashboard]);

  const pageViews =
    stats.pageViews ??
    stats.totalPageViews ??
    events.filter((event) =>
      ["page_view", "pageview", "page view"].includes(
        getEventName(event).toLowerCase()
      )
    ).length;

  const clicks =
    stats.clicks ??
    stats.totalClicks ??
    events.filter((event) =>
      getEventName(event).toLowerCase().includes("click")
    ).length;

  const totalEvents =
    stats.totalEvents ?? stats.total ?? events.length;

  const totalSessions =
    stats.totalSessions ?? stats.sessions ?? sessions.length;

  const filteredEvents = events.filter((event) => {
    const text = [
      getEventName(event),
      event.page,
      event.element,
      event.sessionId,
      JSON.stringify(event.details || {})
    ].join(" ").toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const filteredSessions = sessions.filter((session) => {
    const text = [
      session.sessionId,
      ...(Array.isArray(session.pages) ? session.pages : []),
      ...(Array.isArray(session.eventTypes) ? session.eventTypes : [])
    ].join(" ").toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const tabs = [
    { id: "overview", label: "▦ Overview" },
    { id: "events", label: "◉ All Events" },
    { id: "sessions", label: "◎ Sessions" },
    { id: "timestamps", label: "◷ Timestamps" }
  ];

  if (showDemo) {
    return (
      <>
        <style>{styles}</style>
        <div className="demo-screen">
          <iframe
            title="ShopEase Demo Store"
            src={`${API}/shop?sessionId=${encodeURIComponent(sessionId)}`}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{
              position: "fixed",
              left: 12,
              bottom: 12,
              zIndex: 10000
            }}
            onClick={() => {
              setShowDemo(false);
              refreshDashboard();
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <div className="dashboard">
        <main className="container">
          <header className="header">
            <div className="brand">
              <div className="brand-icon">📊</div>
              <div>
                <h1>InsightFlow</h1>
                <p className="subtitle">User Analytics Dashboard</p>
              </div>
            </div>

            <div className="header-actions">
              <div className="status">
                <span
                  className="status-dot"
                  style={{ background: error ? "#f87171" : "#34d399" }}
                />
                {error ? "Connection Issue" : "Live Monitoring"}
              </div>

              <button
                className="btn"
                type="button"
                onClick={refreshDashboard}
                disabled={loading}
              >
                ↻ Refresh
              </button>

              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setShowDemo(true)}
              >
                🛍 Open Demo Store
              </button>
            </div>
          </header>

          {error && (
            <div className="error">
              <strong>Backend connection problem</strong>
              <div>{error}</div>
            </div>
          )}

          <section className="section-heading">
            <div>
              <h2>Overview Dashboard</h2>
              <p className="subtitle">
                Your website activity at a glance.
              </p>
            </div>
          </section>

          <section className="stats-grid">
            <MetricCard
              title="Total Events"
              value={totalEvents}
              icon="📈"
              note="Live recorded data"
            />
            <MetricCard
              title="Page Views"
              value={pageViews}
              icon="👁"
              note="Pages visited"
            />
            <MetricCard
              title="Clicks & Interactions"
              value={clicks}
              icon="🖱"
              note="User interactions"
            />
            <MetricCard
              title="Sessions"
              value={totalSessions}
              icon="👥"
              note="Tracked sessions"
            />
          </section>

          <nav className="tabs" aria-label="Analytics navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearch("");
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === "overview" && (
            <>
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Activity Breakdown</h3>
                    <p className="subtitle">
                      Summary of the tracked visitor activity
                    </p>
                  </div>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setActiveTab("events")}
                  >
                    View All →
                  </button>
                </div>

                <div className="stats-grid" style={{ marginBottom: 0 }}>
                  <div>
                    <strong>{pageViews}</strong>
                    <p className="subtitle">Page Views</p>
                  </div>
                  <div>
                    <strong>{clicks}</strong>
                    <p className="subtitle">Clicks & Interactions</p>
                  </div>
                  <div>
                    <strong>{totalSessions}</strong>
                    <p className="subtitle">Sessions</p>
                  </div>
                  <div>
                    <strong>
                      {stats.demoCheckouts ?? stats.completedCheckouts ?? 0}
                    </strong>
                    <p className="subtitle">Demo Checkouts Completed</p>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Recent Activity</h3>
                    <p className="subtitle">
                      Latest events received from the tracking system
                    </p>
                  </div>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setActiveTab("events")}
                  >
                    View all →
                  </button>
                </div>

                {loading && events.length === 0 ? (
                  <div className="empty">Loading analytics data...</div>
                ) : (
                  <EventTable events={events.slice(0, 10)} />
                )}
              </section>
            </>
          )}

          {activeTab === "events" && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>All Events</h3>
                  <p className="subtitle">
                    Search and review recorded activities
                  </p>
                </div>
                <input
                  className="search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search events..."
                />
              </div>

              <EventTable events={filteredEvents} />
            </section>
          )}

          {activeTab === "sessions" && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Sessions</h3>
                  <p className="subtitle">
                    Review grouped visitor sessions
                  </p>
                </div>
                <input
                  className="search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sessions..."
                />
              </div>

              {filteredSessions.length === 0 ? (
                <div className="empty">
                  {loading ? "Loading sessions..." : "No sessions found."}
                </div>
              ) : (
                <div className="session-grid">
                  {filteredSessions.map((session, index) => (
                    <article
                      className="session-card"
                      key={session.sessionId || session._id || index}
                    >
                      <h4>{session.sessionId || `Session ${index + 1}`}</h4>
                      <p>Events: {session.eventCount ?? session.events?.length ?? 0}</p>
                      <p>Pages: {session.pageCount ?? session.pages?.length ?? 0}</p>
                      <p>First seen: {formatDate(session.firstSeen)}</p>
                      <p>Last seen: {formatDate(session.lastSeen)}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "timestamps" && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Activity Timeline</h3>
                  <p className="subtitle">
                    Events ordered from newest to oldest
                  </p>
                </div>
                <input
                  className="search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search timeline..."
                />
              </div>

              {filteredEvents.length === 0 ? (
                <div className="empty">No activities found.</div>
              ) : (
                <div className="timeline">
                  {filteredEvents.map((event, index) => (
                    <article
                      className="timeline-item"
                      key={event._id || event.id || index}
                    >
                      <div className="timeline-dot" />
                      <div>
                        <strong>{getEventName(event)}</strong>
                        <p>Page: {event.page || "—"}</p>
                        <p>Session: {event.sessionId || "—"}</p>
                        <p>{formatDate(getTime(event))}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <footer className="footer">
            InsightFlow · MERN Stack User Analytics · Auto-refresh every 10 seconds
          </footer>
        </main>
      </div>
    </>
  );
}
