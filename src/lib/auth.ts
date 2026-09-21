import { cookies } from "next/headers";
import { getRedisClient, pool } from ".";

export interface SessionUser {
    id: string;
    name: string;
    email: string;
}

// redis based session return for user
export async function getCurrentUser(): Promise<SessionUser | null> {
    const sessionId = cookies().get("session")?.value;

    if (!sessionId) return null;

    const redisClient = await getRedisClient();
    const sessionData = await redisClient.get(`session:${sessionId}`)

    if (!sessionData) return null;

    const session = JSON.parse(sessionData);

    // New sessions carry the user object directly — zero DB roundtrip.
    if (session.name && session.email) {
        return {
            id: session.userId,
            name: session.name,
            email: session.email,
        } as SessionUser;
    }

    // Legacy sessions (created before the user object was embedded) still
    // only hold userId — fall back to a DB lookup until they expire (60 min).
    const result = await pool.query(
        `SELECT id, name, email
         FROM users
         WHERE id = $1`,
        [session.userId]
    );

    return (result[0] as SessionUser) ?? null;
}