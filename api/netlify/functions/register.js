import sql from './db.js';
import bcrypt from 'bcrypt';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body);
    
    // Check if user already exists
    const [existingUser] = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existingUser) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Username already exists' }) };
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const [user] = await sql`
      INSERT INTO users (username, password_hash, tickets) 
      VALUES (${username}, ${hashedPassword}, 50)
      RETURNING id, username, tickets
    `;
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          tickets: user.tickets
        }
      })
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Registration failed' }) };
  }
};
