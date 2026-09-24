import { requireUser } from "@/lib/api";
import { getOwnedItemIds } from "@/lib/export-pipeline";

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body = await req.json();
    const project = String(body?.project ?? "").trim();
    const direction = body?.direction;
    const resource = String(body?.resource ?? "").trim();
    const itemIds: string[] = Array.isArray(body?.itemIds)
      ? body.itemIds.map((id: unknown) => String(id))
      : [];

    if (!project || !itemIds.length || (direction !== "shopify_to_wp" && direction !== "wp_to_shopify") || !resource) {
      return Response.json({ message: "We couldn’t check the selected records." }, { status: 400 });
    }

    const owned = await getOwnedItemIds({
      userId: user.id,
      project,
      direction,
      resource,
      itemIds,
    });
    const uniqueIds = new Set<string>(
      itemIds.map((id: string) => id.trim()).filter(Boolean),
    );
    const ownedCount = Array.from(uniqueIds).filter((id: string) => owned.has(id)).length;
    const selectedCount = uniqueIds.size;

    return Response.json({
      selectedCount,
      ownedCount,
      newCount: Math.max(0, selectedCount - ownedCount),
    });
  } catch (err) {
    console.error("Ownership summary error:", err);
    return Response.json({ message: "We couldn’t check the selected records." }, { status: 500 });
  }
}