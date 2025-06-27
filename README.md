# Admin Dashboard Backend

A simple admin dashboard backend API built with Node.js and Express. 

## Features

- User authentication and management
- Order tracking system
- Dashboard statistics
- Profile management
- Settings configuration

## Setup
 
### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MySQL (optional - uses sample data by default)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

The server will run on port 3000 by default.

## API Endpoints

### Authentication

- `POST /api/login` - User login
- `POST /api/logout` - User logout

### Users

- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `DELETE /api/users/:id` - Delete user

### Orders

- `GET /api/orders` - Get all orders

### Profile

- `POST /api/profile` - Update user profile

### Dashboard

- `GET /api/dashboard/stats` - Get dashboard statistics

### Settings

- `POST /api/settings` - Update system settings

## Sample Users

- **admin** / admin123 (Administrator)
- **user1** / user123 (User)
- **operator** / op123 (Operator)

## Development

```bash
npm run dev
```

## License

MIT
