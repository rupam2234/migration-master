import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "./auth";

export type { SessionUser } from "./auth";

export type AuthResult =
    | { user: SessionUser; error: null }
    | { user: null; error: NextResponse };

/**
 * Session guard for API routes. Returns either the authenticated user or a
 * ready-to-return 401 response, replacing the copy-pasted
 * `getCurrentUser() → 401` block in every route handler.
 *
 * Usage:
 *   const { user, error } = await requireUser();
 *   if (error) return error;
 */
export async function requireUser(): Promise<AuthResult> {
    const user = await getCurrentUser();
    if (!user) {
        return {
            user: null,
            error: NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            ),
        };
    }
    return { user, error: null };
}

interface PageResult<T> {
    items: T[];
    totalPages: number;
}

/**
 * Generic paginated fetcher. `fetchPage` fetches a single page (it should
 * throw on a failed response) and reports the total page count from
 * whatever source the upstream API provides (response body or headers).
 * Hard-capped at maxPages as an infinite-loop safety net.
 */
export async function fetchAllPages<T>(
    fetchPage: (page: number) => Promise<PageResult<T>>,
    maxPages = 1000,
): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let totalPages = 1;

    do {
        const { items, totalPages: reported } = await fetchPage(page);
        allItems.push(...items);
        totalPages = reported;
        page++;
    } while (page <= totalPages && page <= maxPages);

    return allItems;
}