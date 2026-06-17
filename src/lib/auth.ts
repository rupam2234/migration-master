import { cookies } from "next/headers";
import { pool } from ".";
import { unstable_cache } from "next/cache";

const REVALIDATE_IN = 24 * 3600; // 24 hours

const getUserBySessionToken = unstable_cache(async (token: string) => {
    const result = await pool.query(
        `SELECT u.id, u.name, u.email
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = $1 AND s.expires_at > now()`,
        [token]
    );

    return result[0] ?? null;
}, ["session-user"], { revalidate: REVALIDATE_IN })


export async function getCurrentUser() {
    const token = cookies().get("session")?.value;

    if (!token) return null;

    return getUserBySessionToken(token);;
}