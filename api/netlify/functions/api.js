// netlify/functions/api.js
import { getUser, createUser, updateUserTickets, createBet, getUserBets, updateBetStatus } from '../api/database.js';

export async function handler(event, context) {
  const { method, path } = event;
  
  try {
    switch (path) {
      case '/api/login':
        return await handleLogin(event);
      case '/api/register':
        return await handleRegister(event);
      case '/api/bet':
        return await handlePlaceBet(event);
      case '/api/bets':
        return await handleGetBets(event);
      case '/api/update-tickets':
        return await handleUpdateTickets(event);
      default:
        return { statusCode: 404, body: 'Not found' };
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}

async function handleLogin(event) {
  const { username, password } = JSON.parse(event.body);
  const user = await getUser(username);
  
  if (user && user.password === password) {
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        user: { username: user.username, tickets: user.tickets } 
      })
    };
  }
  
  return {
    statusCode: 401,
    body: JSON.stringify({ error: 'Invalid credentials' })
  };
}

// Add other handler functions...
