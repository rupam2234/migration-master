import { Redis } from "@upstash/redis";

/**
 * Auth session store + request-collapsing lock backend - Upstash Redis only.
 *
 * Backed by the Upstash REST client (UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN): HTTP, no sockets, serverless- and Edge-safe.
 * The old node-redis / REDIS_URL (Redis Cloud) fallback has been removed,
 * so sessions and locks live exclusively in Upstash.
 *
 * Exposes one node-redis-shaped surface (get/set/del with EX/PX/NX options)
 * so session auth and lock call sites never change.
 * Locks keep the "optimisation, never a dependency" contract: a Redis
 * outage degrades request collapsing but never breaks the user's flow.
 */

/** Options accepted by set() - spelled exactly like node-redis. */
interface SetOpts {
    EX?: number;
    PX?: number;
    NX?: boolean;
}

/** The node-redis subset this app uses (sessions + locks). */
export interface RedisCompat {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, opts?: SetOpts): Promise<"OK" | null>;
    del(key: string): Promise<number>;
}

let backend: RedisCompat | null = null;

function resolveBackend(): RedisCompat {
    if (backend) return backend;

    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (restUrl && restToken) {
        // automaticDeserialization:false = byte-parity with stored sessions.
        // GET must return the stored string verbatim: with the default (true),
        // session JSON comes back pre-parsed as an object and the JSON.parse()
        // in auth.ts would throw — which would also invalidate every session
        // written over TCP before this migration. Strings are already stored
        // untouched by the client's default serializer, so writes match too.
        const upstash = new Redis({
            url: restUrl,
            token: restToken,
            automaticDeserialization: false,
        });
        backend = {
            get: (key) => upstash.get(key) as Promise<string | null>,
            set: (key, value, opts) => {
                // Upstash's SetCommandOptions is a union of exact shapes
                // (ex XOR px XOR ..., nx XOR xx), so a single object with
                // possibly-undefined keys can never match one arm. Build the
                // exact shape per branch instead — covering the subset this
                // app uses: sessions {EX}, locks {NX, PX}.
                if (opts?.NX && opts.PX !== undefined)
                    return upstash.set(key, value, { px: opts.PX, nx: true }) as Promise<"OK" | null>;
                if (opts?.NX && opts.EX !== undefined)
                    return upstash.set(key, value, { ex: opts.EX, nx: true }) as Promise<"OK" | null>;
                if (opts?.PX !== undefined)
                    return upstash.set(key, value, { px: opts.PX }) as Promise<"OK" | null>;
                if (opts?.EX !== undefined)
                    return upstash.set(key, value, { ex: opts.EX }) as Promise<"OK" | null>;
                if (opts?.NX)
                    return upstash.set(key, value, { nx: true }) as Promise<"OK" | null>;
                return upstash.set(key, value) as Promise<"OK" | null>;
            },
            del: (key) => upstash.del(key),
        };
        console.info("[redis] backend: upstash-rest (HTTP)");
        return backend;
    }

    throw new Error(
        "Upstash Redis is not configured: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in .env",
    );
}

/**
 * Returns the shared Upstash client.
 *
 * REST is connectionless: no connect() handshake, just resolve-once and go.
 */
export async function getRedisClient(): Promise<RedisCompat> {
    return resolveBackend();
}

/**
 * Best-effort short-lived lock.
 *
 * Used to collapse duplicate concurrent work into one upstream request - two
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