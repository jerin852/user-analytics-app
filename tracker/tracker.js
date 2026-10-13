
(() => {
  "use strict";

  const API_URL = "/api/events";
  const SESSION_KEY = "user_analytics_session_id";

  function createSessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return "session-" + Date.now() + "-" +
      Math.random().toString(36).slice(2, 10);
  }

  function getSessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);

      if (!id) {
        id = createSessionId();
        sessionStorage.setItem(SESSION_KEY, id);
      }

      return id;
    } catch {
      return createSessionId();
    }
  }

  const sessionId = getSessionId();

  function sendEvent(eventType, details = {}) {
    const payload = {
      eventType,
      event: eventType,
      sessionId,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
      details,
      ...details
    };

    try {
      return fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).then(response => {
        if (!response.ok) {
          console.error(
            "Analytics event failed:",
            eventType,
            response.status
          );
        }

        return response;
      }).catch(error => {
        console.error("Analytics API unavailable:", error.message);
      });
    } catch (error) {
      console.error("Could not send analytics event:", error);
      return Promise.resolve();
    }
  }

  // Public function used by demo.html.
  window.trackDemoEvent = function (eventType, details = {}) {
    return sendEvent(eventType, details);
  };

  // Track the page view once per page load.
  function trackPageView() {
    sendEvent("page_view", {
      title: document.title,
      referrer: document.referrer || ""
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackPageView, {
      once: true
    });
  } else {
    trackPageView();
  }

  // Track regular clicks without replacing the site's own click handlers.
  document.addEventListener("click", event => {
    const target = event.target instanceof Element
      ? event.target
      : null;

    if (!target) return;

    const element = target.closest(
      "a, button, [data-track-click]"
    );

    if (!element) return;

    // Demo actions already emit their own named analytics events.
    // Avoid recording those same actions as generic clicks too.
    if (element.hasAttribute("onclick")) return;

    if (element.matches("a") && element.getAttribute("href")) {
      const href = element.getAttribute("href");

      if (href.startsWith("javascript:")) return;
    }

    sendEvent("click", {
      elementTag: element.tagName.toLowerCase(),
      elementText: (element.innerText || element.getAttribute("aria-label") || "")
        .trim()
        .slice(0, 120),
      target: element.getAttribute("data-track-click") || ""
    });
  }, true);

  // Other pages can use this method to send analytics events.
  window.userAnalytics = {
    track: sendEvent,
    getSessionId: () => sessionId
  };
})();
