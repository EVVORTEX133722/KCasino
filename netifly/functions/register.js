const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const sql = neon(process.env.NETLIFY_DATABASE_URL);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { username, password } = JSON.parse(event.body);
    const allowedUsers = ["EVVORTEX", "Razgab", "Luca", "Roby56"];

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username and password required' })
      };
    }

    if (!allowedUsers.includes(username)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username not allowed' })
      };
    }

    // Check if user exists
    const existingUser = await sql`SELECT username FROM users WHERE username = ${username}`;
    
    if (existingUser.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User already exists' })
      };
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultTickets = { EVVORTEX: 278, Razgab: 226, Luca: 255, Roby56: 176 };
    
    const [newUser] = await sql`
      INSERT INTO users (username, password_hash) 
      VALUES (${username}, ${hashedPassword})
      RETURNING *
    `;
    
    await sql`
      INSERT INTO user_tickets (user_id, ticket_count) 
      VALUES (${newUser.id}, ${defaultTickets[username] || 100})
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'User registered successfully' })
    };

  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Registration failed: ' + error.message })
    };
  }
};
