import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import {
  getSnapshot,
  readSnapshotIds,
  readSnapshotPage,
  searchSnapshot,
  SNAPSHOT_SEARCH_SCAN_PAGES,
} from "@/lib/snapshots";

/**
 * Reads a slice of a snapshot. Three modes, all bounded:
 *
 *   ?ids=1             → every record id (for "select all")
 *   ?q=term            → server-side search, capped at N scanned pages
 *   ?page=3            → one page of records (the default)
 *
 * The full dataset is never returned, so response size is independent of
 * store size.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const snapshot = await getSnapshot(params.id, user.id);

    if (!snapshot) {
      return NextResponse.json(
        { message: "Snapshot not found" },
        { status: 404 },
      );
    }

    // Ownership is on the row; expiry is checked so a stale id cannot be used
    // to read data the user should have refetched.
    if (new Date(snapshot.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { message: "Snapshot has expired. Fetch the records again." },
        { status: 410 },
      );
    }

    const searchParams = req.nextUrl.searchParams;

    if (searchParams.get("ids") === "1") {
      return NextResponse.json({
        ids: await readSnapshotIds(snapshot.id),
        total: snapshot.total_items,
      });
    }

    const query = searchParams.get("q")?.trim();

    if (query) {
      const result = await searchSnapshot(snapshot.id, query);

      return NextResponse.json({
        items: result.matches,
        total: result.matches.length,
        scanned: result.scanned,
        exhaustive: result.exhaustive,
        scanLimit: SNAPSHOT_SEARCH_SCAN_PAGES,
        pageSize: snapshot.page_size,
      });
    }

    const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const page = Number.isFinite(requestedPage)
      ? Math.min(Math.max(requestedPage, 1), Math.max(snapshot.total_pages, 1))
      : 1;

    return NextResponse.json({
      items: await readSnapshotPage(snapshot.id, page),
      page,
      totalPages: snapshot.total_pages,
      total: snapshot.total_items,
      pageSize: snapshot.page_size,
    });
  } catch (err: any) {
    console.error("Failed to read snapshot:", err);
    return NextResponse.json(
      { message: err?.message ?? "Failed to read snapshot" },
      { status: 500 },
    );
  }
}
