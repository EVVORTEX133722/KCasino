import { neon } from '@netlify/neon';

// Hardcoded connection for Netlify deployment
const sql = neon('postgresql://neondb_owner:npg_MVBlgFeNks04@ep-nameless-cloud-aelm5n99-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create user_tickets table
    await sql`
      CREATE TABLE IF NOT EXISTS user_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        ticket_count INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create bets table
    await sql`
      CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        match_data JSONB,
        outcome VARCHAR(50),
        outcome_name VARCHAR(100),
        amount INTEGER,
        odds DECIMAL(5,2),
        potential_winnings INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Insert default users if they don't exist
    const defaultUsers = [
      { username: 'EVVORTEX', password: 'password123', tickets: 278 },
      { username: 'Razgab', password: 'password123', tickets: 226 },
      { username: 'Luca', password: 'password123', tickets: 255 },
      { username: 'Roby56', password: 'password123', tickets: 176 }
    ];

    for (const userData of defaultUsers) {
      const existingUser = await getUser(userData.username);
      if (!existingUser) {
        const [newUser] = await sql`
          INSERT INTO users (username, password_hash) 
          VALUES (${userData.username}, ${userData.password})
          RETURNING *
        `;
        
        await sql`
          INSERT INTO user_tickets (user_id, ticket_count) 
          VALUES (${newUser.id}, ${userData.tickets})
        `;
      }
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Database functions for your betting app
export async function getUser(username) {
  const [user] = await sql`SELECT * FROM users WHERE username = ${username}`;
  return user;
}

export async function getUserTickets(userId) {
  const [tickets] = await sql`SELECT ticket_count FROM user_tickets WHERE user_id = ${userId}`;
  return tickets?.ticket_count || 0;
}

export async function updateUserTickets(userId, newTicketCount) {
  const [result] = await sql`
    UPDATE user_tickets 
    SET ticket_count = ${newTicketCount}, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId}
    RETURNING *
  `;
  return result;
}

export async function createBet(userId, matchData, outcome, outcomeName, amount, odds, potentialWinnings) {
  const [bet] = await sql`
    INSERT INTO bets (user_id, match_data, outcome, outcome_name, amount, odds, potential_winnings, status)
    VALUES (${userId}, ${JSON.stringify(matchData)}, ${outcome}, ${outcomeName}, ${amount}, ${odds}, ${potentialWinnings}, 'pending')
    RETURNING *
  `;
  return bet;
}

export async function getUserBets(userId) {
  const bets = await sql`SELECT * FROM bets WHERE user_id = ${userId} ORDER BY placed_at DESC`;
  return bets;
}

export async function updateBetStatus(betId, status) {
  const [bet] = await sql`
    UPDATE bets SET status = ${status} WHERE id = ${betId} RETURNING *
  `;
  return bet;
}

export async function getAllUsers() {
  const users = await sql`
    SELECT u.username, ut.ticket_count 
    FROM users u 
    LEFT JOIN user_tickets ut ON u.id = ut.user_id
  `;
  return users;
}

export async function createUser(username, passwordHash) {
  const [user] = await sql`
    INSERT INTO users (username, password_hash) 
    VALUES (${username}, ${passwordHash})
    RETURNING *
  `;
  return user;
}

export async function initializeUserTickets(userId, initialTickets) {
  const [tickets] = await sql`
    INSERT INTO user_tickets (user_id, ticket_count) 
    VALUES (${userId}, ${initialTickets})
    RETURNING *
  `;
  return tickets;
}

export async function getUserById(userId) {
  const [user] = await sql`SELECT * FROM users WHERE id = ${userId}`;
  return user;
}
