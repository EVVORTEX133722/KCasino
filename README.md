# 🎰 Karuta's Casino - Setup Instructions

## Overview
This is a sports betting application with persistent data storage using Neon PostgreSQL database and Netlify Functions for serverless backend.

## 🚀 Quick Setup

### 1. Database Setup (Neon)

1. **Create Neon Account**: Go to [https://neon.tech](https://neon.tech) and create a free account
2. **Create Database**: Create a new project/database
3. **Run SQL Setup**: Copy and paste this SQL in your Neon SQL Editor:

```sql
-- Clear any existing tables (optional)
DROP TABLE IF EXISTS bets;
DROP TABLE IF EXISTS user_tickets;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User tickets table
CREATE TABLE user_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ticket_count INTEGER DEFAULT 50,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bets table
CREATE TABLE bets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    match_id VARCHAR(100),
    match_data JSONB,
    outcome VARCHAR(100),
    outcome_name VARCHAR(100),
    amount INTEGER,
    odds DECIMAL(5,2),
    potential_winnings INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default users (passwords are plain text for demo - will be hashed in app)
INSERT INTO users (username, password_hash) VALUES
('EVVORTEX', 'admin123'),
('Razgab', 'user123'),
('Luca', 'user123'),
('Roby56', 'user123');

-- Insert default ticket counts
INSERT INTO user_tickets (user_id, ticket_count) VALUES
(1, 278), -- EVVORTEX
(2, 226), -- Razgab
(3, 255), -- Luca
(4, 176); -- Roby56

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_user_tickets_user_id ON user_tickets(user_id);
```

4. **Get Connection String**: Copy your connection string from Neon dashboard (it looks like: `postgresql://username:password@host/database?sslmode=require`)

### 2. Netlify Deployment

1. **Create Netlify Account**: Go to [https://netlify.com](https://netlify.com)
2. **Deploy Site**: 
   - Drag and drop your project folder to Netlify
   - Or connect your GitHub repository
3. **Add Environment Variables**: In Netlify dashboard → Site settings → Environment variables:
   ```
   DATABASE_URL=your_neon_connection_string_here
   JWT_SECRET=your_secret_key_here
   ```

### 3. File Structure
Your project should have this structure:
```
karuta-casino/
├── index.html (main application)
├── netlify/
│   └── functions/
│       ├── register.js
│       ├── login.js
│       ├── get-tickets.js
│       ├── place-bet.js
│       ├── get-bets.js
│       └── admin-*.js (admin functions)
├── package.json
└── README.md
```

## 🔧 Features

### ✅ **Persistent Data Storage**
- All user data, tickets, and bets are stored in PostgreSQL database
- Data persists across browsers, devices, and sessions
- No more localStorage limitations

### ✅ **User Management**
- Secure registration and login
- Password hashing with bcrypt
- JWT token authentication
- Only authorized users can register

### ✅ **Betting System**
- Real-time sports odds from The Odds API
- Manual UFC odds for upcoming fights
- Ticket-based betting currency
- Win/loss tracking

### ✅ **Admin Panel** (EVVORTEX only)
- Edit user ticket counts
- View all user bets
- Manually settle bets (mark as won/lost)
- Complete betting history

## 🎯 **Data Persistence - SOLVED!**

**Before**: Data only saved in browser localStorage
- ❌ Data lost when clearing browser
- ❌ Different data on different browsers/devices
- ❌ No backup or sync

**After**: Data saved in cloud database
- ✅ Data persists everywhere
- ✅ Access from any browser/device
- ✅ Automatic backup and sync
- ✅ Admin can manage all data

## 🔐 **Security**
- Passwords are hashed with bcrypt
- JWT tokens for authentication
- Database connection over SSL
- Input validation and sanitization

## 🏆 **Authorized Users**
- **EVVORTEX** (Admin): 278 tickets
- **Razgab**: 226 tickets  
- **Luca**: 255 tickets
- **Roby56**: 176 tickets

## 📱 **Usage**
1. Open the deployed Netlify URL
2. Register with an authorized username
3. Login and start betting!
4. Your data will be saved permanently

## 🛠 **Troubleshooting**

### Database Connection Issues
- Ensure DATABASE_URL is correct in Netlify environment variables
- Check Neon database is active (free tier may pause after inactivity)

### Function Errors
- Check Netlify function logs in dashboard
- Ensure all environment variables are set

### Login Issues
- Make sure username is in allowed list: EVVORTEX, Razgab, Luca, Roby56
- Check database has users inserted correctly

## 📈 **Next Steps**
- Deploy to custom domain
- Add more sports and betting markets
- Implement real-time notifications
- Add betting statistics and analytics