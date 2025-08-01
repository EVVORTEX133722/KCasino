import { neon } from '@netlify/neon';

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

// Database functions for your betting app
export async function getUser(username) {
  const [user] = await sql`SELECT * FROM users WHERE username = ${username}`;
  return user;
}

export async function createUser(username, password, initialTickets = 50) {
  const [user] = await sql`
    INSERT INTO users (username, password_hash, tickets) 
    VALUES (${username}, ${password}, ${initialTickets})
    RETURNING *
  `;
  return user;
}

export async function updateUserTickets(username, tickets) {
  const [user] = await sql`
    UPDATE users SET tickets = ${tickets} 
    WHERE username = ${username}
    RETURNING *
  `;
  return user;
}

export async function createBet(userId, matchData, outcome, outcomeName, amount, odds, potentialWinnings) {
  const [bet] = await sql`
    INSERT INTO bets (user_id, match_data, outcome, outcome_name, amount, odds, potential_winnings, status, created_at)
    VALUES (${userId}, ${JSON.stringify(matchData)}, ${outcome}, ${outcomeName}, ${amount}, ${odds}, ${potentialWinnings}, 'pending', NOW())
    RETURNING *
  `;
  return bet;
}

export async function getUserBets(userId) {
  const bets = await sql`SELECT * FROM bets WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return bets;
}

export async function updateBetStatus(betId, status) {
  const [bet] = await sql`
    UPDATE bets SET status = ${status} 
    WHERE id = ${betId}
    RETURNING *
  `;
  return bet;
}

export async function getAllUsers() {
  const users = await sql`SELECT username, tickets FROM users ORDER BY username`;
  return users;
}

export async function getAllBets() {
  const bets = await sql`
    SELECT b.*, u.username 
    FROM bets b 
    JOIN users u ON b.user_id = u.id 
    ORDER BY b.created_at DESC
  `;
  return bets;
}

export async function deductTickets(userId, amount) {
  const [user] = await sql`
    UPDATE users 
    SET tickets = tickets - ${amount} 
    WHERE id = ${userId}
    RETURNING *
  `;
  return user;
}

export async function addWinnings(userId, amount) {
  const [user] = await sql`
    UPDATE users 
    SET tickets = tickets + ${amount} 
    WHERE id = ${userId}
    RETURNING *
  `;
  return user;
}
