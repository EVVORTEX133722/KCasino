const { Client } = require('pg');
const bcrypt = require('bcryptjs');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

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

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT username FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User already exists' })
      };
    }

    // Hash password and insert user
    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultTickets = { EVVORTEX: 278, Razgab: 226, Luca: 255, Roby56: 176 };
    
    await client.query(
      'INSERT INTO users (username, password, tickets) VALUES ($1, $2, $3)',
      [username, hashedPassword, defaultTickets[username] || 100]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'User registered successfully' })
    };

  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Registration failed' })
    };
  } finally {
    await client.end();
  }
};
