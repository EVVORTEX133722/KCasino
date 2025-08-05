import { getUser, getUserTickets, updateUserTickets, createBet, getUserBets, updateBetStatus, getAllUsers, initializeDatabase } from './database.js';

export async function handler(event, context) {
  const { httpMethod, path } = event;
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight requests
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    switch (path) {
      case '/api/login':
        return await handleLogin(event, headers);
      case '/api/register':
        return await handleRegister(event, headers);
      case '/api/bet':
        return await handlePlaceBet(event, headers);
      case '/api/bets':
        return await handleGetBets(event, headers);
      case '/api/update-tickets':
        return await handleUpdateTickets(event, headers);
      case '/api/admin/users':
        return await handleGetAllUsers(event, headers);
      case '/api/init':
        return await handleInit(event, headers);
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Not found' })
        };
    }
  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}

async function handleLogin(event, headers) {
  const { username, password } = JSON.parse(event.body);
  const user = await getUser(username);
  
  if (user && user.password_hash === password) {
    const tickets = await getUserTickets(user.id);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        user: { 
          id: user.id,
          username: user.username, 
          tickets: tickets 
        } 
      })
    };
  }
  
  return {
    statusCode: 401,
    headers,
    body: JSON.stringify({ error: 'Invalid credentials' })
  };
}

async function handleRegister(event, headers) {
  const { username, password } = JSON.parse(event.body);
  
  // Check if user already exists
  const existingUser = await getUser(username);
  if (existingUser) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Username already exists' })
    };
  }

  // For now, we'll use the existing users from the database
  // In a real app, you'd create new users here
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Registration disabled - use existing accounts' })
  };
}

async function handlePlaceBet(event, headers) {
  const { userId, matchData, outcome, outcomeName, amount, odds, potentialWinnings } = JSON.parse(event.body);
  
  // Create the bet
  const bet = await createBet(userId, matchData, outcome, outcomeName, amount, odds, potentialWinnings);
  
  // Update user tickets
  const currentTickets = await getUserTickets(userId);
  await updateUserTickets(userId, currentTickets - amount);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      bet: bet,
      newTicketCount: currentTickets - amount
    })
  };
}

async function handleGetBets(event, headers) {
  const { userId } = JSON.parse(event.body);
  const bets = await getUserBets(userId);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ bets })
  };
}

async function handleUpdateTickets(event, headers) {
  const { userId, newTicketCount } = JSON.parse(event.body);
  const result = await updateUserTickets(userId, newTicketCount);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      tickets: result.ticket_count 
    })
  };
}

async function handleGetAllUsers(event, headers) {
  const users = await getAllUsers();
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ users })
  };
}

async function handleInit(event, headers) {
  await initializeDatabase();
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Database initialized successfully' })
  };
}
