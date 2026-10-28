require("dns").setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, "public");

const FRONTEND_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://user-analytics-app-tan.vercel.app"
];

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || FRONTEND_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(express.static(PUBLIC_DIR));

// Supported analytics event types
const EVENT_TYPES = [
  "page_view",
  "click",
  "product_view",
  "product_click",
  "product_search",
  "category_filter",
  "product_sort",
  "add_to_cart",
  "remove_from_cart",
  "cart_quantity_update",
  "cart_open",
  "offer_view",
  "coupon_applied",
  "coupon_failed",
  "checkout_started",
  "checkout_completed",
  "checkout_blocked",
  "checkout_click",
  "buy_now",
  "search",
  "click_offer",
  "wishlist_add"
];

// MongoDB event schema
const eventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: EVENT_TYPES,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  page: {
    type: String,
    default: "/"
  },
  element: {
    type: String,
    default: null
  },
  sectionId: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  x: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  y: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  strict: true
});

const Event =
  mongoose.models.Event ||
  mongoose.model("Event", eventSchema);

// Temporary memory storage if MongoDB is unavailable.
// Data in memory will be lost when the server restarts.
let memoryEvents = [];
let databaseMode = "memory fallback";

function cleanEvent(doc) {
  const item =
    typeof doc.toObject === "function"
      ? doc.toObject()
      : { ...doc };

  return {
    ...item,
    id: String(item._id || item.id || ""),
    event: item.eventType,
    type: item.eventType,
    timestamp: item.timestamp || item.createdAt
  };
}

// Save event to MongoDB or temporary memory
async function saveEvent(data) {
  if (mongoose.connection.readyState === 1) {
    const saved = await Event.create(data);
    return cleanEvent(saved);
  }

  const now = new Date();

  const saved = {
    ...data,
    _id: `memory-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`,
    createdAt: now,
    updatedAt: now
  };

  memoryEvents.push(saved);

  if (memoryEvents.length > 10000) {
    memoryEvents = memoryEvents.slice(-10000);
  }

  return cleanEvent(saved);
}

// Get analytics events
async function getEvents(filter = {}, limit = 500) {
  if (mongoose.connection.readyState === 1) {
    const docs = await Event.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return docs.map(cleanEvent);
  }

  let items = memoryEvents.filter((event) => {
    if (filter.page && event.page !== filter.page) {
      return false;
    }

    if (
      filter.eventType &&
      filter.eventType.$ne &&
      event.eventType === filter.eventType.$ne
    ) {
      return false;
    }

    if (filter.x && filter.x.$ne === null && event.x == null) {
      return false;
    }

    if (filter.y && filter.y.$ne === null && event.y == null) {
      return false;
    }

    return true;
  });

  return items
    .sort(
      (a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    )
    .slice(0, limit)
    .map(cleanEvent);
}

// Group events into sessions
function makeSessions(events) {
  const grouped = new Map();

  for (const event of events) {
    if (!event.sessionId) continue;

    let session = grouped.get(event.sessionId);

    const time = new Date(
      event.timestamp || event.createdAt || Date.now()
    );

    if (!session) {
      session = {
        sessionId: event.sessionId,
        eventCount: 0,
        pageCount: 0,
        pages: [],
        eventTypes: [],
        firstSeen: time,
        lastSeen: time
      };

      grouped.set(event.sessionId, session);
    }

    session.eventCount += 1;

    if (event.eventType === "page_view") {
      session.pageCount += 1;
    }

    if (
      event.page &&
      !session.pages.includes(event.page)
    ) {
      session.pages.push(event.page);
    }

    if (
      event.eventType &&
      !session.eventTypes.includes(event.eventType)
    ) {
      session.eventTypes.push(event.eventType);
    }

    if (time < new Date(session.firstSeen)) {
      session.firstSeen = time;
    }

    if (time > new Date(session.lastSeen)) {
      session.lastSeen = time;
    }
  }

  return [...grouped.values()]
    .map((session) => ({
      ...session,
      totalEvents: session.eventCount,
      firstActivity: session.firstSeen,
      lastActivity: session.lastSeen
    }))
    .sort(
      (a, b) =>
        new Date(b.lastSeen) - new Date(a.lastSeen)
    )
    .slice(0, 100);
}

// Home route
app.get("/", (_req, res) => {
  res.send(
    "User Analytics API is running. Demo store: /shop"
  );
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : databaseMode,
    time: new Date().toISOString()
  });
});

// Demo Store route
app.get("/shop", (_req, res) => {
  res.sendFile(
    path.join(PUBLIC_DIR, "demo.html"),
    (error) => {
      if (error && !res.headersSent) {
        res.status(404).send(
          "Demo page not found. Add server/public/demo.html."
        );
      }
    }
  );
});

app.get("/demo.html", (_req, res) => {
  res.sendFile(
    path.join(PUBLIC_DIR, "demo.html"),
    (error) => {
      if (error && !res.headersSent) {
        res.status(404).send(
          "Demo page not found. Add server/public/demo.html."
        );
      }
    }
  );
});

// Receive and save analytics events
app.post("/api/events", async (req, res) => {
  try {
    const body = req.body || {};

    const eventType =
      body.eventType || body.event || body.type;

    const {
      sessionId,
      page,
      element,
      sectionId,
      details,
      x,
      y,
      timestamp
    } = body;

    if (!EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        error: "Invalid eventType",
        allowed: EVENT_TYPES
      });
    }

    if (
      typeof sessionId !== "string" ||
      !sessionId.trim()
    ) {
      return res.status(400).json({
        error: "sessionId is required"
      });
    }

    const parsedTimestamp = timestamp
      ? new Date(timestamp)
      : new Date();

    if (Number.isNaN(parsedTimestamp.getTime())) {
      return res.status(400).json({
        error: "Invalid timestamp"
      });
    }

    let safeDetails = {};

    if (
      details &&
      typeof details === "object"
    ) {
      const serialized = JSON.stringify(details);

      if (serialized.length > 8000) {
        return res.status(400).json({
          error: "details exceeds 8000 characters"
        });
      }

      safeDetails = JSON.parse(serialized);
    }

    const event = await saveEvent({
      eventType,
      sessionId: sessionId.trim().slice(0, 128),
      page:
        typeof page === "string"
          ? page.slice(0, 500)
          : "/",
      element:
        typeof element === "string"
          ? element.slice(0, 120)
          : null,
      sectionId:
        typeof sectionId === "string"
          ? sectionId.slice(0, 200)
          : null,
      details: safeDetails,
      x:
        Number.isFinite(x) && x >= 0 && x <= 1
          ? x
          : null,
      y:
        Number.isFinite(y) && y >= 0 && y <= 1
          ? y
          : null,
      timestamp: parsedTimestamp
    });

    res.status(201).json({
      success: true,
      event
    });
  } catch (error) {
    console.error(
      "POST /api/events failed:",
      error.message
    );

    res.status(500).json({
      error: "Failed to save event"
    });
  }
});

// Dashboard statistics
app.get("/api/events/stats", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const [
        totalEvents,
        pageViews,
        clicks,
        sessionIds
      ] = await Promise.all([
        Event.countDocuments(),
        Event.countDocuments({
          eventType: "page_view"
        }),
        Event.countDocuments({
          eventType: "click"
        }),
        Event.distinct("sessionId")
      ]);

      return res.json({
        totalEvents,
        totalSessions: sessionIds.length,
        pageViews,
        clicks
      });
    }

    const events = memoryEvents;

    res.json({
      totalEvents: events.length,
      totalSessions: new Set(
        events.map((event) => event.sessionId)
      ).size,
      pageViews: events.filter(
        (event) => event.eventType === "page_view"
      ).length,
      clicks: events.filter(
        (event) => event.eventType === "click"
      ).length
    });
  } catch (error) {
    console.error("Stats failed:", error.message);

    res.status(500).json({
      error: "Failed to fetch stats"
    });
  }
});

// Recent events
app.get("/api/events", async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      500
    );

    const filter = {};

    if (
      typeof req.query.page === "string" &&
      req.query.page
    ) {
      filter.page = req.query.page;
    }

    res.json(await getEvents(filter, limit));
  } catch (error) {
    console.error(
      "Events fetch failed:",
      error.message
    );

    res.status(500).json({
      error: "Failed to fetch events"
    });
  }
});

// Session analytics
app.get("/api/sessions", async (_req, res) => {
  try {
    let sessions;

    if (mongoose.connection.readyState === 1) {
      const events = await Event.find()
        .sort({ timestamp: -1 })
        .limit(10000)
        .lean();

      sessions = makeSessions(
        events.map(cleanEvent)
      );
    } else {
      sessions = makeSessions(
        memoryEvents.map(cleanEvent)
      );
    }

    res.json(sessions);
  } catch (error) {
    console.error(
      "Sessions failed:",
      error.message
    );

    res.status(500).json({
      error: "Failed to fetch sessions"
    });
  }
});

// Click heatmap
app.get("/api/events/heatmap", async (req, res) => {
  try {
    const filter = {
      eventType: { $ne: "page_view" },
      x: { $ne: null },
      y: { $ne: null }
    };

    if (
      typeof req.query.page === "string" &&
      req.query.page
    ) {
      filter.page = req.query.page;
    }

    res.json(await getEvents(filter, 1000));
  } catch (error) {
    console.error(
      "Heatmap failed:",
      error.message
    );

    res.status(500).json({
      error: "Failed to fetch heatmap"
    });
  }
});

// Start server; use memory storage if MongoDB is unavailable
async function startServer() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(
        process.env.MONGODB_URI,
        { serverSelectionTimeoutMS: 8000 }
      );

      databaseMode = "connected";
      console.log("MongoDB connected");
    } catch (error) {
      databaseMode = "memory fallback";

      console.error(
        "MongoDB connection failed; using temporary memory storage:",
        error.message
      );
    }
  } else {
    console.warn(
      "MONGODB_URI is missing; using temporary memory storage."
    );
  }

  app.listen(PORT, () => {
    console.log(`Analytics API running on port ${PORT}`);
    console.log("Demo store route: /shop");
  });
}

startServer();