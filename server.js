const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('✅ Successfully connected to Neon database');
    release();
  }
});

// Allowed users
const allowedUsers = ["EVVORTEX", "Razgab", "Luca", "Roby56"];

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Register new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (!allowedUsers.includes(username)) {
      return res.status(400).json({ error: 'Username not allowed' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    // Set default ticket count
    const defaultTickets = {
      EVVORTEX: 278,
      Razgab: 226,
      Luca: 255,
      Roby56: 176
    };

    await pool.query(
      'INSERT INTO user_tickets (user_id, ticket_count) VALUES ($1, $2)',
      [newUser.rows[0].id, defaultTickets[username] || 50]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Get user from database
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user tickets
    const tickets = await pool.query(
      'SELECT ticket_count FROM user_tickets WHERE user_id = $1',
      [user.rows[0].id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.rows[0].id, 
        username: user.rows[0].username 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.rows[0].id,
        username: user.rows[0].username,
        tickets: tickets.rows[0]?.ticket_count || 0
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user tickets
app.get('/api/tickets', authenticateToken, async (req, res) => {
  try {
    const tickets = await pool.query(
      'SELECT ticket_count FROM user_tickets WHERE user_id = $1',
      [req.user.userId]
    );

    res.json({
      tickets: tickets.rows[0]?.ticket_count || 0
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user tickets (admin only)
app.put('/api/admin/tickets/:username', authenticateToken, async (req, res) => {
  try {
    if (req.user.username !== 'EVVORTEX') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { username } = req.params;
    const { ticketCount } = req.body;

    if (!allowedUsers.includes(username)) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    if (ticketCount < 0) {
      return res.status(400).json({ error: 'Ticket count cannot be negative' });
    }

    // Get user ID
    const user = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update tickets
    await pool.query(
      'UPDATE user_tickets SET ticket_count = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [ticketCount, user.rows[0].id]
    );

    res.json({
      message: `Successfully updated ${username}'s tickets to ${ticketCount}`
    });

  } catch (error) {
    console.error('Update tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Place a bet
app.post('/api/bets', authenticateToken, async (req, res) => {
  try {
    const {
      matchId,
      matchData,
      outcome,
      outcomeName,
      amount,
      odds,
      potentialWinnings
    } = req.body;

    if (!matchId || !outcome || !outcomeName || !amount || !odds) {
      return res.status(400).json({ error: 'Missing required bet data' });
    }

    // Check if user has enough tickets
    const userTickets = await pool.query(
      'SELECT ticket_count FROM user_tickets WHERE user_id = $1',
      [req.user.userId]
    );

    const currentTickets = userTickets.rows[0]?.ticket_count || 0;
    if (amount > currentTickets) {
      return res.status(400).json({ error: 'Insufficient tickets' });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Deduct tickets
      await pool.query(
        'UPDATE user_tickets SET ticket_count = ticket_count - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [amount, req.user.userId]
      );

      // Place bet
      const bet = await pool.query(
        `INSERT INTO bets (user_id, match_id, match_data, outcome, outcome_name, amount, odds, potential_winnings)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.userId, matchId, JSON.stringify(matchData), outcome, outcomeName, amount, odds, potentialWinnings]
      );

      await pool.query('COMMIT');

      res.status(201).json({
        message: 'Bet placed successfully',
        bet: bet.rows[0],
        remainingTickets: currentTickets - amount
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Place bet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user bets
app.get('/api/bets', authenticateToken, async (req, res) => {
  try {
    const bets = await pool.query(
      'SELECT * FROM bets WHERE user_id = $1 ORDER BY placed_at DESC',
      [req.user.userId]
    );

    res.json({
      bets: bets.rows
    });

  } catch (error) {
    console.error('Get bets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all bets (admin only)
app.get('/api/admin/bets', authenticateToken, async (req, res) => {
  try {
    if (req.user.username !== 'EVVORTEX') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const bets = await pool.query(`
      SELECT b.*, u.username 
      FROM bets b 
      JOIN users u ON b.user_id = u.id 
      ORDER BY b.placed_at DESC
    `);

    res.json({
      bets: bets.rows
    });

  } catch (error) {
    console.error('Get all bets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Settle a bet (admin only)
app.put('/api/admin/bets/:betId/settle', authenticateToken, async (req, res) => {
  try {
    if (req.user.username !== 'EVVORTEX') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { betId } = req.params;
    const { isWon } = req.body;

    // Get bet details
    const bet = await pool.query('SELECT * FROM bets WHERE id = $1', [betId]);
    if (bet.rows.length === 0) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Bet already settled' });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update bet status
      const newStatus = isWon ? 'won' : 'lost';
      await pool.query(
        'UPDATE bets SET status = $1 WHERE id = $2',
        [newStatus, betId]
      );

      // If won, add winnings to user tickets
      if (isWon) {
        await pool.query(
          'UPDATE user_tickets SET ticket_count = ticket_count + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
          [bet.rows[0].potential_winnings, bet.rows[0].user_id]
        );
      }

      await pool.query('COMMIT');

      res.json({
        message: `Bet marked as ${newStatus}`,
        bet: bet.rows[0]
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Settle bet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all user tickets (admin only)
app.get('/api/admin/tickets', authenticateToken, async (req, res) => {
  try {
    if (req.user.username !== 'EVVORTEX') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const tickets = await pool.query(`
      SELECT u.username, ut.ticket_count, ut.updated_at
      FROM users u
      LEFT JOIN user_tickets ut ON u.id = ut.user_id
      ORDER BY u.username
    `);

    res.json({
      tickets: tickets.rows
    });

  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Karuta Casino API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Karuta Casino server running on port ${port}`);
  console.log(`📱 Access your app at: http://localhost:${port}`);
});

module.exports = app;