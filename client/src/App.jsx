
import React, { useCallback, useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000";
const DEMO_URL = `${API}/shop`;

function getDashboardSessionId() {
  const key = "user_analytics_dashboard_session";

  try {
    let id = sessionStorage.getItem(key);

    if (!id) {
      id =
        window.crypto?.randomUUID?.() ||
        `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      sessionStorage.setItem(key, id);
    }

    return id;
  } catch {
    return `session-${Date.now()}`;
  }
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}

function getEventName(item) {
  return (
    item?.eventType ||
    item?.event ||
    item?.type ||
    "unknown_event"
  );
}

function getEventDetails(item) {
  const details = item?.details;

  if (details && typeof details === "object") {
    return details;
  }

  return {};
}

function formatDetails(item) {
  const details = getEventDetails(item);

  const parts = [
    details.productName && `Product: ${details.productName}`,
    details.category && `Category: ${details.category}`,
    details.quantity !== undefined && `Quantity: ${details.quantity}`,
    details.total !== undefined && `Total: ₹${details.total}`,
    details.orderId && `Order: ${details.orderId}`,
    details.paymentMethod && `Payment: ${details.paymentMethod}`,
    details.paymentStatus && `Status: ${details.paymentStatus}`,
    details.query && `Search: ${details.query}`,
    details.label && `Action: ${details.label}`
  ].filter(Boolean);

  return parts.join(" · ") || JSON.stringify(details);
}

function MetricCard({ title, value, subtitle, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>

      <div className="stat-value">{value ?? 0}</div>
      <div className="stat-caption">{subtitle}</div>
    </div>
  );
}

function EmptyState({ children = "No data available yet." }) {
  return <div className="empty-state">{children}</div>;
}

function EventTable({ events }) {
  if (!events.length) {
    return (
      <EmptyState>
        No activities recorded yet. Open Demo Store and perform some actions.
      </EmptyState>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Activity Details</th>
            <th>Page</th>
            <th>Session ID</th>
            <th>Timestamp</th>
          </tr>
        </thead>

        <tbody>
          {events.map((item, index) => (
            <tr key={item.id || item._id || `${getEventName(item)}-${index}`}>
              <td>
                <strong>{getEventName(item)}</strong>
              </td>
              <td>{formatDetails(item)}</td>
              <td>{item.page || "—"}</td>
              <td>
                <span className="pill">
                  {item.sessionId || "—"}
                </span>
              </td>
              <td>{formatDate(item.timestamp || item.createdAt)}</td>
            </tr>
          ))}
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

  const [dashboardSessionId] = useState(getDashboardSessionId);

  const openDemo = useCallback(() => {
    setShowDemo(true);
    setActiveTab("demo");
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const [statsResponse, eventsResponse, sessionsResponse] =
        await Promise.all([
          fetch(`${API}/api/events/stats`),
          fetch(`${API}/api/events?limit=500`),
          fetch(`${API}/api/sessions`)
        ]);

      if (!statsResponse.ok || !eventsResponse.ok || !sessionsResponse.ok) {
        throw new Error(
          "Dashboard API request failed. Check whether the backend is running."
        );
      }

      const statsData = await statsResponse.json();
      const eventsData = await eventsResponse.json();
      const sessionsData = await sessionsResponse.json();

      setStats(statsData || {});

      const eventList = Array.isArray(eventsData)
        ? eventsData
        : eventsData.events || eventsData.data || [];

      const sessionList = Array.isArray(sessionsData)
        ? sessionsData
        : sessionsData.sessions || sessionsData.data || [];

      // Newest events first.
      eventList.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const dateB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setEvents(eventList);
      setSessions(sessionList);
      setError("");
    } catch (err) {
      setError(
        `${err.message}. Make sure the backend is running at ${API}.`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();

    const intervalId = setInterval(refreshDashboard, 3000);

    return () => clearInterval(intervalId);
  }, [refreshDashboard]);

  // Receive the Back-to-Dashboard message from demo.html inside the iframe.
  useEffect(() => {
    function handleDemoMessage(event) {
      if (event.origin !== API) return;

      if (event.data?.type === "RETURN_TO_DASHBOARD") {
        setActiveTab("overview");
        refreshDashboard();
      }
    }

    window.addEventListener("message", handleDemoMessage);

    return () => {
      window.removeEventListener("message", handleDemoMessage);
    };
  }, [refreshDashboard]);

  const filteredEvents = events.filter((item) => {
    const details = formatDetails(item);

    const searchableText = [
      getEventName(item),
      item.page || "",
      item.sessionId || "",
      details
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search.toLowerCase());
  });

  const filteredSessions = sessions.filter((session) => {
    const searchableText = [
      session.sessionId || "",
      ...(session.pages || []),
      ...(session.eventTypes || [])
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search.toLowerCase());
  });

  const pageViews =
    stats.pageViews ??
    events.filter((item) => getEventName(item) === "page_view").length;

  const clicks =
    stats.clicks ??
    events.filter((item) => getEventName(item) === "click").length;

  const totalEvents = stats.totalEvents ?? events.length;

  const totalSessions = stats.totalSessions ?? sessions.length;

  const tabItems = [
    { id: "overview", label: "Overview" },
    { id: "sessions", label: "Sessions View" },
    { id: "events", label: "Recent Events" },
    { id: "timestamps", label: "Timestamps" },
    { id: "demo", label: "Demo Store" }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="dashboard-brand">
            <div className="brand-icon">📊</div>
            <div>
              <h1>User Analytics Dashboard</h1>
              <p className="panel-subtitle">
                Monitor shopping activity in real time
              </p>
            </div>
          </div>

          <div className="header-actions">
            <span className="dashboard-status">
              <span className="status-dot" />
              {error ? "Connection issue" : "Live monitoring"}
            </span>

            <button
              className="secondary-button"
              onClick={refreshDashboard}
            >
              ↻ Refresh
            </button>

            <button
              className="primary-button"
              onClick={openDemo}
            >
              🛍️ Open Demo Store
            </button>
          </div>
        </header>

        {error && (
          <div className="error-state">
            <strong>Backend connection problem</strong>
            <p>{error}</p>
          </div>
        )}

        <section className="stats-grid">
          <MetricCard
            title="Total Events"
            value={totalEvents}
            subtitle="Recorded activities"
            icon="📈"
          />

          <MetricCard
            title="Sessions"
            value={totalSessions}
            subtitle="Tracked sessions"
            icon="👥"
          />

          <MetricCard
            title="Page Views"
            value={pageViews}
            subtitle="Pages visited"
            icon="👁️"
          />

          <MetricCard
            title="Clicks"
            value={clicks}
            subtitle="Recorded clicks"
            icon="🖱️"
          />
        </section>

        <nav className="dashboard-tabs" aria-label="Dashboard views">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => {
                if (tab.id === "demo") {
                  openDemo();
                } else {
                  setActiveTab(tab.id);
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="tab-content">
          {loading && events.length === 0 && (
            <div className="panel">
              <EmptyState>Loading analytics data...</EmptyState>
            </div>
          )}

          {activeTab === "overview" && (
            <>
              <div className="section-header">
                <div>
                  <h2>Analytics Overview</h2>
                  <p className="panel-subtitle">
                    Your latest activities and session information
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={openDemo}
                >
                  Start Shopping Demo →
                </button>
              </div>

              <section className="panel">
                <div className="panel-header">
                  <h3>Recent Activities</h3>
                  <button
                    className="secondary-button"
                    onClick={() => setActiveTab("events")}
                  >
                    View All
                  </button>
                </div>

                <EventTable events={events.slice(0, 10)} />
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h3>Recent Sessions</h3>
                  <button
                    className="secondary-button"
                    onClick={() => setActiveTab("sessions")}
                  >
                    Sessions View
                  </button>
                </div>

                {sessions.length === 0 ? (
                  <EmptyState>No sessions recorded yet.</EmptyState>
                ) : (
                  <div className="content-grid">
                    {sessions.slice(0, 6).map((session, index) => (
                      <div
                        className="session-card"
                        key={session.sessionId || index}
                      >
                        <strong>
                          Session {session.sessionId || index + 1}
                        </strong>

                        <div className="session-metrics">
                          <span>
                            Events: {session.eventCount ?? session.events?.length ?? 0}
                          </span>

                          <span>
                            Pages: {session.pageCount ?? session.pages?.length ?? 0}
                          </span>
                        </div>

                        <p className="panel-subtitle">
                          Last seen: {formatDate(session.lastSeen)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === "sessions" && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Sessions View</h2>
                  <p className="panel-subtitle">
                    Explore grouped user sessions
                  </p>
                </div>

                <input
                  className="filter-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sessions..."
                />
              </div>

              {filteredSessions.length === 0 ? (
                <EmptyState>No matching sessions found.</EmptyState>
              ) : (
                <div className="content-grid">
                  {filteredSessions.map((session, index) => (
                    <article
                      className="session-card"
                      key={session.sessionId || index}
                    >
                      <h3>{session.sessionId || `Session ${index + 1}`}</h3>

                      <div className="session-metrics">
                        <span>
                          Events: {session.eventCount ?? session.events?.length ?? 0}
                        </span>

                        <span>
                          Page views: {session.pageCount ?? session.pages?.length ?? 0}
                        </span>
                      </div>

                      <p>
                        <strong>First seen:</strong>{" "}
                        {formatDate(session.firstSeen)}
                      </p>

                      <p>
                        <strong>Last seen:</strong>{" "}
                        {formatDate(session.lastSeen)}
                      </p>

                      <p>
                        <strong>Pages:</strong>{" "}
                        {(session.pages || []).join(", ") || "—"}
                      </p>

                      <p>
                        <strong>Event types:</strong>{" "}
                        {(session.eventTypes || []).join(", ") || "—"}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "events" && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Recent Events</h2>
                  <p className="panel-subtitle">
                    Search page views, cart actions and payment events
                  </p>
                </div>

                <input
                  className="filter-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search events..."
                />
              </div>

              <EventTable events={filteredEvents} />
            </section>
          )}

          {activeTab === "timestamps" && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Activity Timeline</h2>
                  <p className="panel-subtitle">
                    Activities arranged from newest to oldest
                  </p>
                </div>

                <input
                  className="filter-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search timeline..."
                />
              </div>

              {filteredEvents.length === 0 ? (
                <EmptyState>No matching activity found.</EmptyState>
              ) : (
                <div className="timestamp-list">
                  {filteredEvents.map((item, index) => (
                    <div
                      className="timestamp-item"
                      key={item.id || item._id || index}
                    >
                      <div className="timeline-marker" />

                      <div>
                        <strong>{getEventName(item)}</strong>
                        <p>{formatDetails(item)}</p>
                        <p className="timestamp-time">
                          {formatDate(item.timestamp || item.createdAt)}
                        </p>
                        <p className="panel-subtitle">
                          Session: {item.sessionId || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "demo" && showDemo && (
            <section
              className="panel"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <div
                className="panel-header"
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap"
                }}
              >
                <div>
                  <h2>ShopEase Demo Store</h2>
                  <p className="panel-subtitle">
                    Shop, checkout and return here to view your activities.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => {
                    setActiveTab("overview");
                    refreshDashboard();
                  }}
                >
                  View Analytics
                </button>
              </div>

              <iframe
                title="ShopEase Demo Store"
                src={`${DEMO_URL}?sessionId=${encodeURIComponent(
                  dashboardSessionId
                )}`}
                style={{
                  display: "block",
                  width: "100%",
                  height: "78vh",
                  minHeight: 620,
                  border: 0,
                  background: "#f5f7fb"
                }}
              />
            </section>
          )}
        </main>

        <footer style={{ padding: "24px 0", textAlign: "center" }}>
          <p className="panel-subtitle">
            User Analytics Dashboard · Auto-refreshes every 3 seconds
          </p>
        </footer>
      </div>
    </div>
  );
}
