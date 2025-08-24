const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NETLIFY_DATABASE_URL);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { userId, matchData, outcome, outcomeName, amount, odds, potentialWinnings } = JSON.parse(event.body);

    // Get user by username
    const [user] = await sql`SELECT * FROM users WHERE username = ${userId}`;
    
    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Get user's current tickets
    const [userTickets] = await sql`SELECT ticket_count FROM user_tickets WHERE user_id = ${user.id}`;
    const currentTickets = userTickets?.ticket_count || 0;

    if (currentTickets < amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Insufficient tickets' })
      };
    }

    // Deduct tickets
    await sql`
      UPDATE user_tickets 
      SET ticket_count = ticket_count - ${amount}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user.id}
    `;

    // Insert bet record
    await sql`
      INSERT INTO bets (user_id, match_data, outcome, outcome_name, amount, odds, potential_winnings, status)
      VALUES (${user.id}, ${JSON.stringify(matchData)}, ${outcome}, ${outcomeName}, ${amount}, ${odds}, ${potentialWinnings}, 'pending')
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Bet placed successfully' })
    };

  } catch (error) {
    console.error('Place bet error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to place bet: ' + error.message })
    };
  }
};
