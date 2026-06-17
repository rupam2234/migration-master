import { neon } from "@neondatabase/serverless";

const pool = neon(process.env.DATABASE_URL!);

export default pool;
