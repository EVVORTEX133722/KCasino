// api/database.js
import { neon } from '@netlify/neon';

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

// Database functions for your betting app
export async function getUser(username) {
  const [user] = await sql`SELECT * FROM users WHERE username = ${username}`;
  return user;
}

export async function createUser(username, password, initialTickets = 50) {
  const [user] = await sql`
    INSERT INTO users (username, password, tickets) 
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

export async function createBet(userId, matchData, outcome, amount, odds, potentialWinnings) {
  const [bet] = await sql`
    INSERT INTO bets (user_id, match_data, outcome, amount, odds, potential_winnings, status, created_at)
    VALUES (${userId}, ${JSON.stringify(matchData)}, ${outcome}, ${amount}, ${odds}, ${potentialWinnings}, 'pending', NOW())
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
