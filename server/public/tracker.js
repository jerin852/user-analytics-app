
(function () {
  "use strict";

  const API_URL =
    "https://user-analytics-app-xm4s.onrender.com/api/events";

  const SESSION_KEY = "user_analytics_session_id";
  let searchTimer = null;

  function createId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return (
      "session-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2)
    );
  }

  function getSessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);

      if (!id) {
        id = createId();
        sessionStorage.setItem(SESSION_KEY, id);
      }

      return id;
    } catch (error) {
      return createId();
    }
  }

  const sessionId = getSessionId();

  function sectionFor(target) {
    if (!target || typeof target.closest !== "function") {
      return null;
    }

    const section = target.closest(
      "[data-section-id], section[id], main[id], article[id], [data-section]"
    );

    if (!section) return null;

    return (
      section.getAttribute("data-section-id") ||
      section.id ||
      section.getAttribute("data-section") ||
      null
    );
  }

  async function sendEvent(eventType, target, extra) {
    const element =
      target && target.tagName
        ? target.tagName.toLowerCase()
        : null;

    const sectionId = target
      ? sectionFor(target) || target.id || null
      : null;

    let x = null;
    let y = null;

    if (
      extra &&
      Number.isFinite(extra.clientX) &&
      Number.isFinite(extra.clientY)
    ) {
      x = extra.clientX / Math.max(window.innerWidth, 1);
      y = extra.clientY / Math.max(window.innerHeight, 1);

      x = Math.min(1, Math.max(0, x));
      y = Math.min(1, Math.max(0, y));
    }

    const payload = {
      eventType,
      sessionId,
      page: window.location.pathname,
      element,
      sectionId,
      x,
      y,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        keepalive: true
      });

      if (!response.ok) {
        console.warn(
          "Analytics event failed:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.warn(
        "Analytics event was not sent:",
        error.message
      );
    }
  }

  function trackPageView() {
    sendEvent("page_view", document.body, null);
  }

  function handleClick(event) {
    const originalTarget = event.target;

    if (!originalTarget || typeof originalTarget.closest !== "function") {
      return;
    }

    const target = originalTarget.closest(
      "button, a, input, select, [role='button'], [data-track]"
    );

    if (!target) return;

    const action = target.getAttribute("data-track") || "";
    let eventType = "click";

    if (action.startsWith("add-to-cart")) {
      eventType = "add_to_cart";
    } else if (
      action.startsWith("view-") ||
      action.startsWith("product-")
    ) {
      eventType = "product_click";
    } else if (action === "demo-checkout") {
      eventType = "checkout_click";
    }

    sendEvent(eventType, target, event);
  }

  function handleInput(event) {
    const target = event.target;

    if (!target || typeof target.matches !== "function") {
      return;
    }

    if (
      !target.matches(
        "[data-track='product-search'], input[type='search']"
      )
    ) {
      return;
    }

    clearTimeout(searchTimer);

    searchTimer = setTimeout(function () {
      sendEvent("search", target, null);
    }, 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      trackPageView,
      { once: true }
    );
  } else {
    trackPageView();
  }

  document.addEventListener("click", handleClick, true);
  document.addEventListener("input", handleInput, true);
})();
