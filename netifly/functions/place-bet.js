const { Client } = require('pg');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const { userId, matchData, outcome, outcomeName, amount, odds, potentialWinnings } = JSON.parse(event.body);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Check user's current tickets
    const userResult = await client.query(
      'SELECT tickets FROM users WHERE username = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const currentTickets = userResult.rows[0].tickets;

    if (currentTickets < amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Insufficient tickets' })
      };
    }

    // Start transaction
    await client.query('BEGIN');

    // Deduct tickets from user
    await client.query(
      'UPDATE users SET tickets = tickets - $1 WHERE username = $2',
      [amount, userId]
    );

    // Insert bet record
    await client.query(
      `INSERT INTO bets (username, match_data, outcome, outcome_name, amount, odds, potential_winnings, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [userId, JSON.stringify(matchData), outcome, outcomeName, amount, odds, potentialWinnings, 'pending']
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Bet placed successfully' })
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Place bet error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to place bet' })
    };
  } finally {
    await client.end();
  }
};
