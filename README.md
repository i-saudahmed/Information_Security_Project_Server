# 🚨 Vulnerable Admin Dashboard Backend

⚠️ **WARNING: This application contains intentional security vulnerabilities!**
⚠️ **Use ONLY for educational and ethical security testing purposes.**

## Purpose

This is an intentionally vulnerable backend API designed for:

- Security education and training
- Penetration testing practice
- Understanding common web vulnerabilities
- Ethical hacking demonstrations

## Known Vulnerabilities

This application intentionally includes the following security flaws:

### 1. SQL Injection

- **Location**: Login endpoint (`/api/login`) and search functionality (`/api/users`)
- **Description**: Direct string concatenation in simulated SQL queries
- **Test Payload**: `admin' OR '1'='1' --`

### 2. Cross-Site Scripting (XSS)

- **Location**: User creation, profile updates, settings
- **Description**: No input sanitization or output encoding
- **Test Payload**: `<script>alert('XSS')</script>`

### 3. Weak Session Management

- **Issues**:
  - Hardcoded weak secret key
  - No HTTPS enforcement
  - Cookies accessible via JavaScript
  - No session fixation protection

### 4. No CSRF Protection

- **Description**: All state-changing operations lack CSRF tokens
- **Impact**: Cross-site request forgery attacks possible

### 5. Information Disclosure

- **Issues**:
  - Detailed error messages exposed
  - Sensitive data in logs
  - No rate limiting

### 6. Missing Authorization

- **Description**: Many endpoints lack proper authentication and authorization checks

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (optional - uses sample data by default)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set environment variables (optional):

```bash
export MONGODB_URI="your-mongodb-connection-string"
export PORT=5000
```

3. Start the server:

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

- `POST /api/login` - User login (vulnerable to SQL injection)
- `POST /api/logout` - User logout

### Users Management

- `GET /api/users` - Get all users (vulnerable to SQL injection in search)
- `POST /api/users` - Create new user (vulnerable to XSS)
- `DELETE /api/users/:id` - Delete user (no authorization check)

### Orders

- `GET /api/orders` - Get all orders

### Profile

- `POST /api/profile` - Update user profile (vulnerable to XSS)

### Dashboard

- `GET /api/dashboard/stats` - Get dashboard statistics

### Settings

- `POST /api/settings` - Update system settings (vulnerable to XSS)

## Sample Data

### Users

- **admin** / admin123 (Administrator)
- **manager** / manager123 (Manager)
- **user1** / user123 (User)
- **operator** / op123 (Operator)

### Test Credentials for Security Testing

#### SQL Injection Bypass:

- Username: `admin' OR '1'='1' --`
- Password: `anything`

#### Normal Login:

- Username: `admin`
- Password: `admin123`

## Security Testing Examples

### 1. SQL Injection Test

```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\'' OR '\''1'\''='\''1'\'' --","password":"test"}'
```

### 2. XSS Test

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"<script>alert(\"XSS\")</script>","email":"test@test.com","role":"User"}'
```

### 3. Search SQL Injection

```bash
curl "http://localhost:5000/api/users?search='; DROP TABLE users; --"
```

## Educational Notes

This application demonstrates common vulnerability patterns found in real-world applications:

1. **Input Validation**: Shows why proper input validation is crucial
2. **Output Encoding**: Demonstrates XSS prevention importance
3. **Authentication**: Illustrates secure session management principles
4. **Authorization**: Shows the need for proper access controls
5. **Error Handling**: Demonstrates secure error message practices

## Ethical Use Guidelines

- ✅ Educational environments and security training
- ✅ Authorized penetration testing
- ✅ Security research and demonstration
- ❌ Attacking systems without permission
- ❌ Production environments
- ❌ Malicious activities

## Disclaimer

This software is provided for educational purposes only. The authors are not responsible for any misuse or damage caused by this application. Always ensure you have proper authorization before testing security vulnerabilities.

## Learning Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP WebGoat](https://owasp.org/www-project-webgoat/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)

---

🔒 **Remember**: Understanding vulnerabilities helps build more secure applications!
