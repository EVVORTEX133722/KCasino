const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper function to verify JWT token
const verifyToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Access token required');
  }
  
  const token = authHeader.split(' ')[1];
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify authentication
    const user = verifyToken(event.headers.authorization);
    
    const {
      matchData,
      outcome,
      outcomeName,
      amount,
      odds,
      potentialWinnings
    } = JSON.parse(event.body);

    if (!outcome || !outcomeName || !amount || !odds) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required bet data' })
      };
    }

    // Check if user has enough tickets
    const userTickets = await pool.query(
      'SELECT ticket_count FROM user_tickets WHERE user_id = $1',
      [user.userId]
    );

    const currentTickets = userTickets.rows[0]?.ticket_count || 0;
    if (amount > currentTickets) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Insufficient tickets' })
      };
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Deduct tickets
      await pool.query(
        'UPDATE user_tickets SET ticket_count = ticket_count - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [amount, user.userId]
      );

      // Place bet
      const bet = await pool.query(
        `INSERT INTO bets (user_id, match_id, match_data, outcome, outcome_name, amount, odds, potential_winnings)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          user.userId, 
          `${matchData?.away_team || 'fight'}_vs_${matchData?.home_team || 'fight'}_${Date.now()}`,
          JSON.stringify(matchData), 
          outcome, 
          outcomeName, 
          amount, 
          odds, 
          potentialWinnings
        ]
      );

      await pool.query('COMMIT');

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Bet placed successfully',
          bet: bet.rows[0],
          remainingTickets: currentTickets - amount
        })
      };

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Place bet error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};