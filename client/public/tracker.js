(function () {
  const API_URL = "http://localhost:5000/api/events";
  const SESSION_KEY = "user_analytics_session_id";

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "session-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = createId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  function sectionFor(target) {
    const section = target.closest("[data-section-id], section[id], main[id], article[id], [data-section]");
    if (!section) return null;
    return section.getAttribute("data-section-id") || section.id || section.getAttribute("data-section") || null;
  }

  function sendEvent(eventType, target, extra) {
    const element = target && target.tagName ? target.tagName.toLowerCase() : null;
    const rect = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    const x = extra && Number.isFinite(extra.clientX) ? extra.clientX / Math.max(window.innerWidth, 1) : null;
    const y = extra && Number.isFinite(extra.clientY) ? extra.clientY / Math.max(window.innerHeight, 1) : null;
    const payload = {
      eventType,
      sessionId,
      page: window.location.pathname,
      element,
      sectionId: target ? (sectionFor(target) || target.id || null) : null,
      x: x === null ? null : Math.min(1, Math.max(0, x)),
      y: y === null ? null : Math.min(1, Math.max(0, y)),
      timestamp: new Date().toISOString()
    };

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch((error) => console.warn("Analytics event was not sent:", error.message));
  }

  document.addEventListener("DOMContentLoaded", function () {
    sendEvent("page_view", document.body, null);
  });

  document.addEventListener("click", function (event) {
    const target = event.target.closest("button, a, input, select, [role='button'], [data-track]");
    if (!target) return;
    const action = target.getAttribute("data-track") || "";
    let eventType = "click";
    if (action.startsWith("add-to-cart")) eventType = "add_to_cart";
    else if (action.startsWith("view-") || action.startsWith("product-")) eventType = "product_click";
    else if (action === "demo-checkout") eventType = "checkout_click";
    sendEvent(eventType, target, event);
  }, true);

  let searchTimer;
  document.addEventListener("input", function (event) {
    const target = event.target;
    if (!target.matches("[data-track='product-search'], input[type='search']")) return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      sendEvent("search", target, null);
    }, 700);
  }, true);
})();
