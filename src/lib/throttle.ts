/**
 * Outbound request pacing for the (read-only, background) estimator.
 *
 * The estimator talks to APIs we do not own — a merchant's Shopify store and
 * their WordPress host — so it must never behave like a crawler: every call
 * goes through a serial gate that keeps a minimum gap between request starts,
 * and transient failures (429/5xx/network) are retried with backoff that
 * honours `Retry-After`.
 *
 * Deliberately tiny and dependency-free: a gate is just a promise chain, so a
 * module-level gate per host is enough to keep one server instance polite.
 */

export const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface RequestGate {
    /** Runs `task` after every previously queued task, at least `minIntervalMs` after it. */
    run<T>(task: () => Promise<T>): Promise<T>;
}

/**
 * Serialises tasks and enforces a minimum gap between their start times.
 * Queue depth is unbounded but our fan-out is a handful of counts, so a plain
 * promise chain stays cheaper and more predictable than a worker pool.
 */
export function createRequestGate(minIntervalMs: number): RequestGate {
    let tail: Promise<unknown> = Promise.resolve();
    let lastStartedAt = 0;

    return {
        run<T>(task: () => Promise<T>): Promise<T> {
            const result = tail.then(async () => {
                const wait = minIntervalMs - (Date.now() - lastStartedAt);
                if (wait > 0) await sleep(wait);

                lastStartedAt = Date.now();
                return task();
            });

            // Keep the chain alive even when a task rejects: the next caller
            // still waits its turn instead of racing the failure.
            tail = result.then(
                () => undefined,
                () => undefined,
            );

            return result;
        },
    };
}

export interface PaceOptions {
    gate: RequestGate;
    /** Total attempts, including the first. Default 3. */
    attempts?: number;
    /** Backoff base; doubles per attempt. Default 400ms. */
    baseDelayMs?: number;
    /** Upper bound for any single wait (backoff or Retry-After). Default 5s. */
    maxDelayMs?: number;
}

/** `Retry-After` is either seconds or an HTTP date — accept both. */
function retryAfterMs(response: Response): number | null {
    const header = response.headers.get("retry-after");
    if (!header) return null;

    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

    const parsed = Date.parse(header);
    if (Number.isFinite(parsed)) return Math.max(0, parsed - Date.now());

    return null;
}

/**
 * `fetch` behind a gate, with bounded retries for throttling and transient
 * failures. Returns the first response that is neither 429 nor 5xx; throws when
 * every attempt fails so the caller can record an explicit "unavailable" state.
 */
export async function pacedFetch(
    url: string,
    init: RequestInit,
    { gate, attempts = 3, baseDelayMs = 400, maxDelayMs = 5000 }: PaceOptions,
): Promise<Response> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));

        try {
            const response = await gate.run(() => fetch(url, init));

            if (response.status !== 429 && response.status < 500) return response;

            lastError = new Error(
                `Upstream responded ${response.status} ${response.statusText}`,
            );

            if (attempt === attempts) break;

            // Drain the body so the socket is released before we back off.
            await response.arrayBuffer().catch(() => undefined);
            await sleep(Math.min(maxDelayMs, retryAfterMs(response) ?? backoff));
        } catch (error) {
            lastError = error;
            if (attempt === attempts) break;
            await sleep(backoff);
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error(`Request to ${url} failed`);
}
