const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 5000;

// ⚠️ INTENTIONALLY VULNERABLE: Very permissive CORS configuration
app.use(
  cors({
    origin: true, // Allows any origin
    credentials: true,
  })
);

// ⚠️ INTENTIONALLY VULNERABLE: No rate limiting or size limits
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// ⚠️ INTENTIONALLY VULNERABLE: Weak session configuration
app.use(
  session({
    secret: "weak-secret-key", // Hardcoded weak secret
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // No HTTPS requirement
      httpOnly: false, // Allows JavaScript access to cookies
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// MongoDB Connection (will be configured later)
const connectDB = async () => {
  try {
    // This will be updated when user provides URI
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/vulnerable_admin"
    );
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

// Sample data for demonstration
const sampleUsers = [
  {
    id: 1,
    username: "admin",
    email: "admin@example.com",
    role: "Administrator",
    password: "admin123",
    lastLogin: "2024-01-15",
  },
  {
    id: 2,
    username: "manager",
    email: "manager@example.com",
    role: "Manager",
    password: "manager123",
    lastLogin: "2024-01-14",
  },
  {
    id: 3,
    username: "user1",
    email: "user1@example.com",
    role: "User",
    password: "user123",
    lastLogin: "2024-01-13",
  },
  {
    id: 4,
    username: "operator",
    email: "operator@example.com",
    role: "Operator",
    password: "op123",
    lastLogin: "2024-01-12",
  },
];

const sampleOrders = [
  {
    id: 1001,
    customerName: "John Doe",
    amount: 299.99,
    status: "Completed",
    date: "2024-01-15",
  },
  {
    id: 1002,
    customerName: "Jane Smith",
    amount: 159.5,
    status: "Pending",
    date: "2024-01-14",
  },
  {
    id: 1003,
    customerName: "Bob Johnson",
    amount: 89.99,
    status: "Shipped",
    date: "2024-01-13",
  },
  {
    id: 1004,
    customerName: "Alice Brown",
    amount: 449.99,
    status: "Processing",
    date: "2024-01-12",
  },
];

// ⚠️ INTENTIONALLY VULNERABLE: SQL Injection in login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  // ⚠️ VULNERABILITY: Direct string concatenation allows SQL injection
  // In a real SQL database, this would be: `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
  // For demo purposes, we're simulating this vulnerability with array search
  console.log(
    `Simulated Query: SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
  );

  // ⚠️ VULNERABILITY: No input sanitization
  let user = null;

  // Simulate SQL injection vulnerability
  if (username.includes("' OR '1'='1") || password.includes("' OR '1'='1")) {
    // Simulating successful SQL injection bypass
    user = sampleUsers[0]; // Return admin user
    console.log("⚠️ SQL Injection detected - bypassing authentication!");
  } else {
    // Normal authentication (still vulnerable)
    user = sampleUsers.find(
      (u) => u.username === username && u.password === password
    );
  }

  if (user) {
    // ⚠️ VULNERABILITY: Storing sensitive data in session
    req.session.user = user;
    req.session.isAuthenticated = true;

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }
});

// ⚠️ INTENTIONALLY VULNERABLE: No CSRF protection
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: "Logged out successfully" });
});

// ⚠️ INTENTIONALLY VULNERABLE: No authentication check
app.get("/api/users", (req, res) => {
  const { search } = req.query;

  let users = [...sampleUsers];

  if (search) {
    // ⚠️ VULNERABILITY: SQL Injection in search
    console.log(
      `Simulated Query: SELECT * FROM users WHERE username LIKE '%${search}%' OR email LIKE '%${search}%'`
    );

    // Simulate SQL injection in search
    if (search.includes("'; DROP TABLE users; --")) {
      console.log("⚠️ SQL Injection attempt detected - simulating table drop!");
      res.status(500).json({ error: "Database error occurred" });
      return;
    }

    users = users.filter(
      (user) => user.username.includes(search) || user.email.includes(search)
    );
  }

  res.json(users);
});

// ⚠️ INTENTIONALLY VULNERABLE: Direct user input in response (XSS)
app.post("/api/users", (req, res) => {
  const { username, email, role } = req.body;

  // ⚠️ VULNERABILITY: No input validation or sanitization
  const newUser = {
    id: Date.now(),
    username: username, // Raw input - XSS vulnerable
    email: email, // Raw input - XSS vulnerable
    role: role,
    password: "default123",
    lastLogin: new Date().toISOString().split("T")[0],
  };

  sampleUsers.push(newUser);

  res.json({
    success: true,
    message: `User ${username} created successfully`, // XSS vulnerable
    user: newUser,
  });
});

// ⚠️ INTENTIONALLY VULNERABLE: No authorization checks
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const userIndex = sampleUsers.findIndex((u) => u.id == id);

  if (userIndex !== -1) {
    const deletedUser = sampleUsers.splice(userIndex, 1)[0];
    res.json({
      success: true,
      message: `User ${deletedUser.username} deleted successfully`,
    });
  } else {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
});

// Orders endpoints
app.get("/api/orders", (req, res) => {
  res.json(sampleOrders);
});

// ⚠️ INTENTIONALLY VULNERABLE: Profile update without validation
app.post("/api/profile", (req, res) => {
  const { username, email, currentPassword, newPassword } = req.body;

  // ⚠️ VULNERABILITY: No authentication check
  // ⚠️ VULNERABILITY: No input sanitization
  res.json({
    success: true,
    message: `Profile updated for ${username}`, // XSS vulnerable
    data: req.body, // Echoing back unsanitized input
  });
});

// Dashboard statistics
app.get("/api/dashboard/stats", (req, res) => {
  res.json({
    totalUsers: sampleUsers.length,
    totalOrders: sampleOrders.length,
    totalRevenue: sampleOrders.reduce((sum, order) => sum + order.amount, 0),
    activeOrders: sampleOrders.filter(
      (o) => o.status === "Processing" || o.status === "Pending"
    ).length,
  });
});

// ⚠️ INTENTIONALLY VULNERABLE: Settings endpoint with no validation
app.post("/api/settings", (req, res) => {
  const settings = req.body;

  // ⚠️ VULNERABILITY: No input validation
  // ⚠️ VULNERABILITY: Potential for stored XSS
  console.log("Settings updated:", settings);

  res.json({
    success: true,
    message: "Settings updated successfully",
    settings: settings, // Echoing back unsanitized input
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    details: err.message, // ⚠️ VULNERABILITY: Exposing error details
  });
});

app.listen(PORT, () => {
  console.log(`
    🚨 VULNERABLE ADMIN DASHBOARD API 🚨
    
    ⚠️  WARNING: This application contains intentional security vulnerabilities!
    ⚠️  Use only for educational and ethical security testing purposes.
    
    Server running on port ${PORT}
    
    Known Vulnerabilities Included:
    - SQL Injection in login and search
    - XSS via unsanitized input/output
    - No CSRF protection
    - Weak session management
    - No input validation
    - Information disclosure in errors
    
    Test Payloads:
    - SQL Injection: Username: admin' OR '1'='1' --
    - XSS: <script>alert('XSS')</script>
    `);
});

// Connect to database
connectDB();
