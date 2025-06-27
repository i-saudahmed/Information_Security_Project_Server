const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 5001;

// Database configuration
let db = null;
let DB_TYPE = process.env.DB_TYPE || "sqlite";

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

// Database setup
async function initDatabase() {
  try {
    if (DB_TYPE === "sqlite") {
      const sqlite3 = require("sqlite3").verbose();
      db = new sqlite3.Database(":memory:");
      await setupSQLite();
    } else if (DB_TYPE === "mysql" && process.env.MYSQL_URI) {
      const mysql = require("mysql2/promise");
      db = await mysql.createConnection(process.env.MYSQL_URI);
      await setupMySQL();
    }
    console.log("✅ Real database connected");
  } catch (error) {
    console.error("❌ Database failed:", error.message);
  }
}

async function setupSQLite() {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'User',
        last_login TEXT
      )`);

      db.run(`INSERT OR IGNORE INTO users VALUES 
        (1, 'admin', 'admin@example.com', 'admin123', 'Administrator', '2024-01-15'),
        (2, 'user1', 'user1@example.com', 'user123', 'User', '2024-01-13')`);

      resolve();
    });
  });
}

async function setupMySQL() {
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'User',
    last_login DATE
  )`);

  await db.execute(`INSERT IGNORE INTO users VALUES 
    (1, 'admin', 'admin@example.com', 'admin123', 'Administrator', '2024-01-15'),
    (2, 'user1', 'user1@example.com', 'user123', 'User', '2024-01-13')`);
}

// ⚠️ REAL SQL INJECTION: Login endpoint
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!db) {
    return res.status(500).json({ error: "Database not available" });
  }

  try {
    // ⚠️ MASSIVE VULNERABILITY: Direct string concatenation
    const vulnerableQuery = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

    console.log("🚨 VULNERABLE QUERY:", vulnerableQuery);

    let result;
    if (DB_TYPE === "sqlite") {
      result = await new Promise((resolve, reject) => {
        db.all(vulnerableQuery, [], (err, rows) => {
          if (err) {
            console.error("💥 SQL ERROR:", err.message);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    } else if (DB_TYPE === "mysql") {
      [result] = await db.execute(vulnerableQuery);
    }

    if (result && result.length > 0) {
      const user = result[0];
      req.session.user = user;

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        debug: { query: vulnerableQuery, rowCount: result.length },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
        debug: { query: vulnerableQuery },
      });
    }
  } catch (error) {
    // ⚠️ VULNERABILITY: Full error exposure
    res.status(500).json({
      error: "Database error",
      details: error.message,
      code: error.code,
      query: `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`,
      sqlState: error.sqlState,
    });
  }
});

// ⚠️ REAL SQL INJECTION: Search endpoint
app.get("/api/users", async (req, res) => {
  const { search } = req.query;

  if (!db) {
    return res.status(500).json({ error: "Database not available" });
  }

  try {
    let vulnerableQuery;
    if (search) {
      // ⚠️ MASSIVE VULNERABILITY: Direct injection in LIKE
      vulnerableQuery = `SELECT * FROM users WHERE username LIKE '%${search}%' OR email LIKE '%${search}%'`;
    } else {
      vulnerableQuery = "SELECT * FROM users";
    }

    console.log("🚨 VULNERABLE SEARCH:", vulnerableQuery);

    let result;
    if (DB_TYPE === "sqlite") {
      result = await new Promise((resolve, reject) => {
        db.all(vulnerableQuery, [], (err, rows) => {
          if (err) {
            console.error("💥 SEARCH ERROR:", err.message);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    } else if (DB_TYPE === "mysql") {
      [result] = await db.execute(vulnerableQuery);
    }

    res.json(result);
  } catch (error) {
    // ⚠️ VULNERABILITY: SQL error details exposed
    res.status(500).json({
      error: "Search failed",
      details: error.message,
      code: error.code,
      query: search
        ? `SELECT * FROM users WHERE username LIKE '%${search}%' OR email LIKE '%${search}%'`
        : "SELECT * FROM users",
      sqlState: error.sqlState,
      hint: "SQL injection possible - error details exposed!",
    });
  }
});

// ⚠️ REAL SQL INJECTION: User creation
app.post("/api/users", async (req, res) => {
  const { username, email, role } = req.body;

  if (!db) {
    return res.status(500).json({ error: "Database not available" });
  }

  try {
    // ⚠️ MASSIVE VULNERABILITY: Direct injection in INSERT
    const vulnerableQuery = `INSERT INTO users (username, email, password, role, last_login) VALUES ('${username}', '${email}', 'default123', '${role}', '${
      new Date().toISOString().split("T")[0]
    }')`;

    console.log("🚨 VULNERABLE INSERT:", vulnerableQuery);

    if (DB_TYPE === "sqlite") {
      await new Promise((resolve, reject) => {
        db.run(vulnerableQuery, [], function (err) {
          if (err) {
            console.error("💥 INSERT ERROR:", err.message);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
      });
    } else if (DB_TYPE === "mysql") {
      await db.execute(vulnerableQuery);
    }

    res.json({
      success: true,
      message: `User ${username} created successfully`,
      debug: { query: vulnerableQuery },
    });
  } catch (error) {
    res.status(500).json({
      error: "User creation failed",
      details: error.message,
      code: error.code,
      query: `INSERT INTO users (username, email, password, role, last_login) VALUES ('${username}', '${email}', 'default123', '${role}', '${
        new Date().toISOString().split("T")[0]
      }')`,
      sqlState: error.sqlState,
    });
  }
});

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
    dbType: DB_TYPE,
    realDatabase: !!db,
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
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`
🚨 REAL SQL INJECTION SERVER 🚨

⚠️  Database: ${DB_TYPE.toUpperCase()}
⚠️  Real DB: ${db ? "YES - ACTUAL SQL INJECTION!" : "NO - Fallback"}
⚠️  Port: ${PORT}

🔥 REAL SQL INJECTION PAYLOADS:
Login username: admin' OR '1'='1' --
Login username: admin' OR 1=1#  
Login username: admin' UNION SELECT 1,2,3,4,5,6--
Search: '; DROP TABLE users; --
Search: ' UNION SELECT username,password,email,role,1,2 FROM users--

🎯 ALL techniques work with real database!
    `);
  });
}

start().catch(console.error);

module.exports = app;
