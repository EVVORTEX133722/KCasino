import sql from './db.js';
import bcrypt from 'bcrypt';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body);
    
    // Get user with tickets
    const [user] = await sql`
      SELECT u.id, u.username, u.password_hash, u.tickets 
      FROM users u 
      WHERE u.username = ${username}
    `;
    
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          tickets: user.tickets || 50
        }
      })
    };
  } catch (error) {
    console.error('Login error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Login failed' }) };
  }
};
