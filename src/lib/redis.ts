import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL,
});

redisClient.on("error", (err) =>
    console.error("Redis Client Error", err)
);

export async function getRedisClient() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }

    return redisClient;
}

/**
 * Best-effort short-lived lock.
 *
 * Used to collapse duplicate concurrent work into one upstream request — two
 * tabs (or a double-click) fetching the same resource should cost a single
 * Shopify/WordPress round trip.
 *
 * Redis is treated as an optimisation, never a dependency: if it is
 * unreachable the caller is allowed to proceed, so a Redis outage degrades
 * request count but never breaks the user's flow.
 *
 * @returns true when the caller owns the lock (or when Redis is unavailable)
 */
export async function acquireRedisLock(
    key: string,
    ttlMs: number,
): Promise<boolean> {
    try {
        const client = await getRedisClient();
        const result = await client.set(key, "1", { NX: true, PX: ttlMs });

        return result === "OK";
    } catch (error) {
        console.warn("Redis lock unavailable, proceeding without it:", error);
        return true;
    }
}

/** Releases a lock taken by {@link acquireRedisLock}. Never throws. */
export async function releaseRedisLock(key: string): Promise<void> {
    try {
        const client = await getRedisClient();
        await client.del(key);
    } catch (error) {
        console.warn("Redis unlock failed (lock will expire):", error);
    }
}