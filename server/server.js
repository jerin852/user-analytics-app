
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, "public");

// ========================================
// 1. CORS CONFIGURATION
// Must be before API routes and middleware
// ========================================
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Handle preflight requests.
app.options(/.*/, cors(corsOptions));

// ========================================
// 2. BODY PARSING AND STATIC FILES
// ========================================
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use(express.static(PUBLIC_DIR));

// ========================================
// 3. MONGODB EVENT SCHEMA
// ========================================
const eventSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true, index: true },
    event: { type: String },
    sessionId: { type: String, index: true },
    page: { type: String, default: "/" },
    timestamp: { type: Date, default: Date.now, index: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    userAgent: { type: String, default: "" },
  },
  {
    versionKey: false,
    strict: false,
  }
);

const Event =
  mongoose.models.Event || mongoose.model("Event", eventSchema);

let databaseConnected = false;

// Temporary storage if MongoDB is unavailable.
// Events in memory are cleared when the server restarts.
const memoryEvents = [];

// ========================================
// 4. EVENT NORMALIZATION
// ========================================
function normalizeEvent(doc) {
  const item =
    doc && typeof doc.toObject === "function"
      ? doc.toObject()
      : doc;

  return {
    ...item,
    id: String(item._id || item.id || ""),
    eventType: item.eventType || item.event || "unknown",
    event: item.event || item.eventType || "unknown",
    timestamp: item.timestamp
      ? new Date(item.timestamp).toISOString()
      : new Date().toISOString(),
    details: item.details || {},
  };
}

// ========================================
// 5. SAVE EVENT
// ========================================
async function saveEvent(data) {
  if (databaseConnected) {
    try {
      return await Event.create(data);
    } catch (error) {
      console.error("MongoDB event save failed:", error.message);
    }
  }

  const item = {
    ...data,
    _id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  memoryEvents.push(item);

  // Keep a maximum of 10,000 events in memory.
  if (memoryEvents.length > 10000) {
    memoryEvents.splice(0, memoryEvents.length - 10000);
  }

  return item;
}

// ========================================
// 6. GET EVENTS
// ========================================
async function getEvents(limit = 100) {
  if (databaseConnected) {
    try {
      const docs = await Event.find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return docs.map(normalizeEvent);
    } catch (error) {
      console.error("MongoDB event read failed:", error.message);
    }
  }

  return memoryEvents
    .slice()
    .sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    )
    .slice(0, limit)
    .map(normalizeEvent);
}

async function getAllEvents(limit = 5000) {
  if (databaseConnected) {
    try {
      const docs = await Event.find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return docs.map(normalizeEvent);
    } catch (error) {
      console.error("MongoDB events read failed:", error.message);
    }
  }

  return memoryEvents
    .slice()
    .sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    )
    .slice(0, limit)
    .map(normalizeEvent);
}

// ========================================
// 7. HEALTH CHECK
// ========================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: databaseConnected ? "connected" : "memory fallback",
    time: new Date().toISOString(),
  });
});

// ========================================
// 8. RECEIVE ANALYTICS EVENTS
// ========================================
app.post("/api/events", async (req, res) => {
  try {
    const body = req.body || {};

    const eventType = String(
      body.eventType || body.event || "unknown"
    ).slice(0, 100);

    const rawTimestamp = body.timestamp
      ? new Date(body.timestamp)
      : new Date();

    const timestamp = Number.isNaN(rawTimestamp.getTime())
      ? new Date()
      : rawTimestamp;

    const details = {
      ...(body.details && typeof body.details === "object"
        ? body.details
        : {}),
      ...(body.productId !== undefined
        ? { productId: body.productId }
        : {}),
      ...(body.productName
        ? { productName: body.productName }
        : {}),
      ...(body.price !== undefined
        ? { price: body.price }
        : {}),
      ...(body.total !== undefined
        ? { total: body.total }
        : {}),
      ...(body.orderId ? { orderId: body.orderId } : {}),
      ...(body.paymentStatus
        ? { paymentStatus: body.paymentStatus }
        : {}),
      ...(body.simulated !== undefined
        ? { simulated: body.simulated }
        : {}),
      ...(body.realPayment !== undefined
        ? { realPayment: body.realPayment }
        : {}),
      ...(body.items ? { items: body.items } : {}),
      ...(body.searchTerm
        ? { searchTerm: body.searchTerm }
        : {}),
      ...(body.productCount !== undefined
        ? { productCount: body.productCount }
        : {}),
    };

    const saved = await saveEvent({
      eventType,
      event: eventType,
      sessionId: String(body.sessionId || "unknown").slice(0, 150),
      page: String(body.page || "/").slice(0, 500),
      timestamp,
      details,
      userAgent: String(
        req.headers["user-agent"] || ""
      ).slice(0, 500),
    });

    res.status(201).json({
      success: true,
      message: "Event recorded",
      event: normalizeEvent(saved),
    });
  } catch (error) {
    console.error("Event endpoint error:", error);

    res.status(500).json({
      success: false,
      message: "Could not record event",
    });
  }
});

// ========================================
// 9. GET RECENT EVENTS
// ========================================
app.get("/api/events", async (req, res) => {
  try {
    const requested = Number.parseInt(req.query.limit, 10);

    const limit = Math.min(
      1000,
      Math.max(
        1,
        Number.isFinite(requested) ? requested : 100
      )
    );

    const events = await getEvents(limit);
    res.json(events);
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({
      message: "Could not load events",
    });
  }
});

// ========================================
// 10. ANALYTICS STATISTICS
// ========================================
app.get("/api/events/stats", async (req, res) => {
  try {
    const events = await getAllEvents(5000);
    const eventCounts = {};

    for (const item of events) {
      const type = item.eventType || item.event || "unknown";
      eventCounts[type] = (eventCounts[type] || 0) + 1;
    }

    const sessionIds = new Set(
      events
        .map((item) => item.sessionId)
        .filter((id) => id && id !== "unknown")
    );

    const pageViews = events.filter((item) =>
      ["page_view", "page_viewed", "product_view"].includes(
        item.eventType
      )
    ).length;

    const clicks = events.filter((item) =>
      ["click", "button_click"].includes(item.eventType)
    ).length;

    res.json({
      totalEvents: events.length,
      totalSessions: sessionIds.size,
      pageViews,
      clicks,
      eventCounts,
      eventsByType: Object.entries(eventCounts).map(
        ([eventType, count]) => ({
          eventType,
          count,
        })
      ),
      recentEvents: events.slice(0, 10),
      database: databaseConnected
        ? "connected"
        : "memory fallback",
    });
  } catch (error) {
    console.error("Stats endpoint error:", error);

    res.status(500).json({
      message: "Could not load statistics",
    });
  }
});

// ========================================
// 11. SESSIONS
// ========================================
app.get("/api/sessions", async (req, res) => {
  try {
    const events = await getAllEvents(5000);
    const grouped = new Map();

    for (const event of events) {
      const sessionId = event.sessionId || "unknown";

      if (!grouped.has(sessionId)) {
        grouped.set(sessionId, {
          sessionId,
          events: 0,
          pages: new Set(),
          firstSeen: event.timestamp,
          lastSeen: event.timestamp,
          eventTypes: [],
        });
      }

      const session = grouped.get(sessionId);

      session.events += 1;

      if (event.page) {
        session.pages.add(event.page);
      }

      session.eventTypes.push(event.eventType);

      if (
        new Date(event.timestamp) <
        new Date(session.firstSeen)
      ) {
        session.firstSeen = event.timestamp;
      }

      if (
        new Date(event.timestamp) >
        new Date(session.lastSeen)
      ) {
        session.lastSeen = event.timestamp;
      }
    }

    const sessions = [...grouped.values()]
      .map((session) => ({
        sessionId: session.sessionId,
        eventCount: session.events,
        events: session.events,
        pageCount: session.pages.size,
        pages: [...session.pages],
        firstSeen: session.firstSeen,
        lastSeen: session.lastSeen,
        eventTypes: session.eventTypes,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastSeen) - new Date(a.lastSeen)
      );

    res.json(sessions);
  } catch (error) {
    console.error("Sessions endpoint error:", error);

    res.status(500).json({
      message: "Could not load sessions",
    });
  }
});

// ========================================
// 12. PAGE ANALYTICS / HEATMAP
// ========================================
app.get("/api/events/heatmap", async (req, res) => {
  try {
    const events = await getAllEvents(5000);
    const pages = {};

    for (const event of events) {
      const page = event.page || "/";
      pages[page] = (pages[page] || 0) + 1;
    }

    res.json(
      Object.entries(pages).map(([page, count]) => ({
        page,
        count,
      }))
    );
  } catch (error) {
    console.error("Heatmap endpoint error:", error);

    res.status(500).json({
      message: "Could not load page analytics",
    });
  }
});

// ========================================
// 13. DEMO STORE
// ========================================
app.get("/shop", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "demo.html"));
});

// ========================================
// 14. ROOT API
// ========================================
app.get("/", (req, res) => {
  res.json({
    message: "User Analytics API is running",
    demo: "/shop",
    health: "/api/health",
  });
});

// ========================================
// 15. START SERVER / MONGODB
// ========================================
async function startServer() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 7000,
      });

      databaseConnected = true;
      console.log("MongoDB connected successfully");
    } catch (error) {
      databaseConnected = false;

      console.error(
        "MongoDB connection failed:",
        error.message
      );

      console.log(
        "Using temporary in-memory event storage."
      );
    }
  } else {
    console.log(
      "MONGODB_URI is missing. Using temporary in-memory storage."
    );
  }

  app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
    console.log(`Demo website: http://localhost:${PORT}/shop`);
    console.log(
      `Health check: http://localhost:${PORT}/api/health`
    );
  });
}

startServer();
