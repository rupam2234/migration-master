import { cookies } from "next/headers";
import { getRedisClient, pool } from ".";

// const REVALIDATE_IN = 3600; // 60 min / 1 hour

// const getUserBySessionToken = unstable_cache(async (token: string) => {
//     const result = await pool.query(
//         `SELECT u.id, u.name, u.email
//          FROM sessions s
//          JOIN users u ON u.id = s.user_id
//          WHERE s.id = $1 AND s.expires_at > now()`,
//         [token]
//     );

//     return result[0] ?? null;
// }, ["session-user"], { revalidate: REVALIDATE_IN })


// redis based session return for user
export async function getCurrentUser() {
    const sessionId = cookies().get("session")?.value;

    if (!sessionId) return null;

    const redisClient = await getRedisClient();
    const sessionData = await redisClient.get(`session:${sessionId}`)

    if (!sessionData) return null;

    const session = JSON.parse(sessionData);
    const result = await pool.query(
        `SELECT id, name, email
         FROM users
         WHERE id = $1`,
        [session.userId]
    );

    return result[0] ?? null;
}