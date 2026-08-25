"use client";
import CryptoJS from "crypto-js";

const ENC_KEY_STORAGE_KEY = "_enc_session_key";
const ENC_KEY_EXPIRY_KEY = "_enc_session_ttl";
const ENC_KEY_TIMEOUT_KEY = 30 * 60 * 1000;

interface Props<T, M extends any[] = []> {
    key: string;
    fn: (...args: M) => Promise<T>;
    args?: M;
    ttl: number;
    session_Storage: boolean;
    useCache?: boolean;
    useCrypto?: boolean;
}

interface CacheResult<T> {
    response: T;
    isCached: boolean;
}

interface CleanCache {
    prefix: string;
    session_Storage: boolean;
}
interface CachePayload<T> {
    data: T;
    expiry: number;
    cryptography: boolean;
}
/**
 * caches data into session / local storage with a TTL
 * @param key cache key ---> use a prefix ex: `rum-cache:${key}`, the prefix later helps safe clean up of unsued cache in batch
 * @param fn function to fetch data (not cached)
 * @param ttl cache expiry time
 * @param session_Storage should the date go into session storage? if false it sets to localstorage
 * @param useCache default= TRUE; if set to FALSE returns fresh data. When TRUE, returns available / unexpired cached data (overrides cache contol)
 * @returns response & isCached
 */
export async function cachedData<T, M extends any[] = []>({
    key,
    fn,
    args,
    ttl,
    session_Storage,
    useCache = true,
    useCrypto = false,
}: Props<T, M>): Promise<CacheResult<T>> {
    const storage = getStorage(session_Storage);

    if (!useCache) {
        storage.removeItem(key); // if false (user override, we return fresh data and store new cache)
    } else {
        try {
            const cached = storage.getItem(key);

            if (cached !== null) {
                const parsed: CachePayload<T | string> = JSON.parse(cached);
                if (parsed.cryptography && typeof parsed.data === "string") {
                    const encKey = getEncKey();
                    if (encKey) {
                        parsed.data = JSON.parse(decrypt(parsed.data, encKey));
                    }
                }
                if (Date.now() < parsed.expiry) {
                    return {
                        response: parsed.data as T,
                        isCached: true,
                    };
                }
                // expired (removes the cached data
                storage.removeItem(key);
            }
        } catch (error) {
            console.error("Cache parse error:", error);
            storage.removeItem(key);
        }
    }
    // if no cache fetch fresh data
    const response: T = await fn(...(args ?? ([] as unknown as M)));

    if (ttl <= 0) {
        return { response, isCached: false };
    }

    const encKey = useCrypto ? getEncKey() : null;
    const payload: CachePayload<T | string> = {
        data: useCrypto && encKey ? encrypt(JSON.stringify(response), encKey) : response,
        expiry: Date.now() + ttl,
        cryptography: useCrypto && encKey !== null,
    };

    // set new cache
    try {
        storage.setItem(key, JSON.stringify(payload));
    } catch (e) {
        console.warn("Cache write failed:", e);
    }

    // retrun the new data
    return {
        response: response,
        isCached: false,
    };
}

/**
 * Silently cleans expired cache entries with a specific prefix
 */
export function cleanExpiredCache({
    prefix,
    session_Storage = false,
}: CleanCache) {
    const storage = getStorage(session_Storage);

    try {
        const now = Date.now();

        for (let i = storage.length - 1; i >= 0; i--) {
            const key = storage.key(i);
            if (!key || !key.startsWith(prefix)) continue;

            try {
                const raw = storage.getItem(key);
                if (!raw) continue;

                const parsed: CachePayload<any> = JSON.parse(raw);

                if (!parsed.expiry || now >= parsed.expiry) {
                    storage.removeItem(key);
                }
            } catch {
                // corrupted cache → remove
                storage.removeItem(key);
            }
        }
    } catch {
        // silently fail (storage access errors etc)
    }
}

function getEncKey(): string | null {
    // Not available server-side — callers must guard against null.
    if (typeof window === "undefined") return null;

    try {
        // read crypto key from session storage
        const encKey = sessionStorage.getItem(ENC_KEY_STORAGE_KEY);
        const expiry = Number.parseInt(
            sessionStorage.getItem(ENC_KEY_EXPIRY_KEY) as string,
        );
        // if exists and not expired, use it.
        if (encKey && !Number.isNaN(expiry) && Date.now() < expiry) {
            // slide the expiry window
            sessionStorage.setItem(
                ENC_KEY_EXPIRY_KEY,
                (Date.now() + ENC_KEY_TIMEOUT_KEY).toString(),
            );
            return encKey;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        // Ignore storage read error
    }

    // generate a new session key
    const randomKey = CryptoJS.lib.WordArray.random(32).toString(
        CryptoJS.enc.Hex,
    );

    try {
        sessionStorage.setItem(ENC_KEY_STORAGE_KEY, randomKey);
        sessionStorage.setItem(
            ENC_KEY_EXPIRY_KEY,
            (Date.now() + ENC_KEY_TIMEOUT_KEY).toString(),
        );
    } catch (e) {
        console.warn("Unable to persist session encryption key to sessionStorage", e);
    }

    return randomKey;
}

function decrypt(value: string, encKey: string) {
    return CryptoJS.AES.decrypt(value, encKey).toString(CryptoJS.enc.Utf8);
}
function encrypt(value: string, encKey: string) {
    return CryptoJS.AES.encrypt(value, encKey).toString();
}

/** Returns the appropriate Web Storage instance, or a no-op in-memory fallback during SSR. */
function getStorage(session_Storage: boolean): Storage {
    if (typeof window === "undefined") {
        // Server-side: return a no-op in-memory Storage so callers don't crash.
        const store = new Map<string, string>();
        return {
            length: store.size,
            key: (i: number) => Array.from(store.keys())[i] ?? null,
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => { store.set(k, v); },
            removeItem: (k: string) => { store.delete(k); },
            clear: () => { store.clear(); },
        } as Storage;
    }
    return session_Storage ? sessionStorage : localStorage;
}
