import { neon } from '@netlify/neon';

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

export default sql;
