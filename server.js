const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 5000;

// ⚠️ INTENTIONALLY VULNERABLE: Very permissive CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  session({
    secret: "weak-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

const dbConfig = {
  host: "mysql.railway.internal",
  port: 3306,
  user: "root",
  password: "gLiJqASpuPYfsJwQzvTShvoWWPhlAwYg",
  database: "railway",
  timezone: "+00:00",
};

let db;

const connectDB = async () => {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log("MySQL connected successfully");

    await initializeDatabase();
  } catch (error) {
    console.error("MySQL connection error:", error);
    console.log("Falling back to in-memory mode for demo purposes");
    db = null;
  }
};

const initializeDatabase = async () => {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'User',
        last_login DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        order_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await insertSampleData();
  } catch (error) {
    console.error("Database initialization error:", error);
  }
};

const insertSampleData = async () => {
  try {
    const [existingUsers] = await db.execute(
      "SELECT COUNT(*) as count FROM users"
    );
    if (existingUsers[0].count > 0) {
      console.log("Sample data already exists");
      return;
    }

    const sampleUsers = [
      {
        username: "admin",
        email: "admin@example.com",
        password: "admin123",
        role: "Administrator",
      },
      {
        username: "user1",
        email: "user1@example.com",
        password: "user123",
        role: "User",
      },
      {
        username: "operator",
        email: "operator@example.com",
        password: "op123",
        role: "Operator",
      },
    ];

    for (const user of sampleUsers) {
      await db.execute(
        "INSERT INTO users (username, email, password, role, last_login) VALUES (?, ?, ?, ?, ?)",
        [user.username, user.email, user.password, user.role, "2024-01-15"]
      );
    }

    const sampleOrders = [
      {
        customer_name: "John Doe",
        amount: 299.99,
        status: "Completed",
        order_date: "2024-01-15",
      },
      {
        customer_name: "Jane Smith",
        amount: 159.5,
        status: "Pending",
        order_date: "2024-01-14",
      },
      {
        customer_name: "Bob Johnson",
        amount: 89.99,
        status: "Shipped",
        order_date: "2024-01-13",
      },
      {
        customer_name: "Alice Brown",
        amount: 449.99,
        status: "Processing",
        order_date: "2024-01-12",
      },
    ];

    for (const order of sampleOrders) {
      await db.execute(
        "INSERT INTO orders (customer_name, amount, status, order_date) VALUES (?, ?, ?, ?)",
        [order.customer_name, order.amount, order.status, order.order_date]
      );
    }

    console.log("Sample data inserted successfully");
  } catch (error) {
    console.error("Error inserting sample data:", error);
  }
};

const fallbackUsers = [
  {
    id: 1,
    username: "admin",
    email: "admin@example.com",
    role: "Administrator",
    password: "admin123",
    last_login: "2024-01-15",
  },
  {
    id: 2,
    username: "user1",
    email: "user1@example.com",
    role: "User",
    password: "user123",
    last_login: "2024-01-13",
  },
  {
    id: 3,
    username: "operator",
    email: "operator@example.com",
    role: "Operator",
    password: "op123",
    last_login: "2024-01-12",
  },
];

const fallbackOrders = [
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
  {
    id: 1003,
    customer_name: "Bob Johnson",
    amount: 89.99,
    status: "Shipped",
    order_date: "2024-01-13",
  },
  {
    id: 1004,
    customer_name: "Alice Brown",
    amount: 449.99,
    status: "Processing",
    order_date: "2024-01-12",
  },
];

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = null;

    if (db) {
      const vulnerableQuery = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
      console.log(`Query: ${vulnerableQuery}`);

      try {
        const [rows] = await db.execute(vulnerableQuery);
        user = rows[0];
      } catch (sqlError) {
        console.log("SQL Error:", sqlError.message);

        if (
          username.includes("' OR '1'='1") ||
          username.includes("' OR 1=1") ||
          password.includes("' OR '1'='1") ||
          password.includes("' OR 1=1")
        ) {
          console.log("SQL Injection detected - bypassing authentication!");
          const [adminUser] = await db.execute(
            "SELECT * FROM users WHERE role = 'Administrator' LIMIT 1"
          );
          user = adminUser[0];
        } else {
          return res.status(500).json({
            success: false,
            message: "Database error occurred",
            error: sqlError.message,
          });
        }
      }
    } else {
      console.log(
        `Fallback Query: SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
      );

      if (
        username.includes("' OR '1'='1") ||
        password.includes("' OR '1'='1")
      ) {
        user = fallbackUsers[0];
        console.log("SQL Injection detected - bypassing authentication!");
      } else {
        user = fallbackUsers.find(
          (u) => u.username === username && u.password === password
        );
      }
    }

    if (user) {
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
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: "Logged out successfully" });
});

app.get("/api/users", async (req, res) => {
  const { search } = req.query;

  try {
    let users = [];

    if (db) {
      if (search) {
        const vulnerableQuery = `SELECT * FROM users WHERE username LIKE '%${search}%' OR email LIKE '%${search}%'`;
        console.log(`Query: ${vulnerableQuery}`);

        try {
          const [rows] = await db.execute(vulnerableQuery);
          users = rows;
        } catch (sqlError) {
          console.log("SQL Error:", sqlError.message);
          console.log("Query that caused error:", vulnerableQuery);

          return res.status(500).json({
            error: "Database error occurred due to SQL injection",
            details: sqlError.message,
            query: vulnerableQuery,
            type: "SQL_INJECTION_ERROR",
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        const [rows] = await db.execute("SELECT * FROM users");
        users = rows;
      }
    } else {
      users = [...fallbackUsers];
      if (search) {
        console.log(
          `Fallback Query: SELECT * FROM users WHERE username LIKE '%${search}%' OR email LIKE '%${search}%'`
        );

        if (
          search.includes("'; DROP TABLE users; --") ||
          search.includes("' OR '1'='1") ||
          search.includes("' UNION SELECT") ||
          search.includes("' AND 1=0")
        ) {
          console.log("SQL Injection attempt detected!");
          return res.status(500).json({
            error: "Database error occurred due to SQL injection",
            details: "Simulated SQL injection error in fallback mode",
            query: `SELECT * FROM users WHERE username LIKE '%${search}%' OR email LIKE '%${search}%'`,
            type: "SQL_INJECTION_SIMULATION",
            timestamp: new Date().toISOString(),
          });
        }

        users = users.filter(
          (user) =>
            user.username.includes(search) || user.email.includes(search)
        );
      }
    }

    users = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json(users);
  } catch (error) {
    console.error("Users fetch error:", error);
    res.status(500).json({
      error: "Server error",
      details: error.message,
      type: "GENERAL_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/api/users", async (req, res) => {
  const { username, email, role } = req.body;

  try {
    const newUser = {
      username: username,
      email: email,
      role: role,
      password: "default123",
      last_login: new Date().toISOString().split("T")[0],
    };

    if (db) {
      const [result] = await db.execute(
        "INSERT INTO users (username, email, password, role, last_login) VALUES (?, ?, ?, ?, ?)",
        [
          newUser.username,
          newUser.email,
          newUser.password,
          newUser.role,
          newUser.last_login,
        ]
      );
      newUser.id = result.insertId;
    } else {
      newUser.id = Date.now();
      fallbackUsers.push(newUser);
    }

    res.json({
      success: true,
      message: `User ${username} created successfully`,
      user: newUser,
    });
  } catch (error) {
    console.error("User creation error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    let deletedUser = null;

    if (db) {
      const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [id]);
      if (rows.length > 0) {
        deletedUser = rows[0];
        await db.execute("DELETE FROM users WHERE id = ?", [id]);
      }
    } else {
      const userIndex = fallbackUsers.findIndex((u) => u.id == id);
      if (userIndex !== -1) {
        deletedUser = fallbackUsers.splice(userIndex, 1)[0];
      }
    }

    if (deletedUser) {
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
  } catch (error) {
    console.error("User deletion error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    let orders = [];

    if (db) {
      const [rows] = await db.execute(
        "SELECT * FROM orders ORDER BY created_at DESC"
      );
      orders = rows;
    } else {
      orders = [...fallbackOrders];
    }

    res.json(orders);
  } catch (error) {
    console.error("Orders fetch error:", error);
    res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
});

app.post("/api/profile", (req, res) => {
  const { username, email, currentPassword, newPassword } = req.body;

  res.json({
    success: true,
    message: `Profile updated for ${username}`,
    data: req.body,
  });
});

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    let stats = {};

    if (db) {
      const [userCount] = await db.execute(
        "SELECT COUNT(*) as count FROM users"
      );
      const [orderCount] = await db.execute(
        "SELECT COUNT(*) as count FROM orders"
      );
      const [revenue] = await db.execute(
        "SELECT SUM(amount) as total FROM orders"
      );
      const [activeOrders] = await db.execute(
        "SELECT COUNT(*) as count FROM orders WHERE status IN ('Processing', 'Pending')"
      );

      stats = {
        totalUsers: userCount[0].count,
        totalOrders: orderCount[0].count,
        totalRevenue: revenue[0].total || 0,
        activeOrders: activeOrders[0].count,
      };
    } else {
      stats = {
        totalUsers: fallbackUsers.length,
        totalOrders: fallbackOrders.length,
        totalRevenue: fallbackOrders.reduce(
          (sum, order) => sum + order.amount,
          0
        ),
        activeOrders: fallbackOrders.filter(
          (o) => o.status === "Processing" || o.status === "Pending"
        ).length,
      };
    }

    res.json(stats);
  } catch (error) {
    console.error("Stats fetch error:", error);
    res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
});

app.post("/api/settings", (req, res) => {
  const settings = req.body;

  console.log("Settings updated:", settings);

  res.json({
    success: true,
    message: "Settings updated successfully",
    settings: settings,
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    details: err.message,
    stack: err.stack,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

connectDB();
