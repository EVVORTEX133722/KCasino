const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const result = await sql`SELECT 1 as test`;
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Database connected!', 
        result: result,
        env: process.env.NETLIFY_DATABASE_URL ? 'Environment variable exists' : 'Environment variable missing'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack
      })
    };
  }
};
