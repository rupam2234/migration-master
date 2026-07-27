import { envInt, pool } from "@/lib";
import { calculateTieredPrice } from "@/lib/pricing/tiered";
import { NextRequest, NextResponse } from "next/server";

const FREE_EXPORT_LIMIT = envInt("FREE_EXPORT_LIMIT", 2);
const FREE_ITEM_LIMIT = envInt("FREE_ITEM_LIMIT", 5);
const FREE_IMAGE_LIMIT = envInt("FREE_IMAGE_LIMIT", 3000);

export async function POST(req: NextRequest) {
    const { shopDomain, resource, itemIds } = await req.json();

    if (!shopDomain || !resource || !Array.isArray(itemIds) || itemIds.length === 0) {
        return NextResponse.json(
            { error: "shopDomain, resource, and itemIds are required" },
            { status: 400 },
        );
    }

    // 1. Which of the selected items are already owned (paid or free)?
    const owned = await pool.query(
        `
            SELECT item_id
            FROM exported_items
            WHERE shop_domain = $1
              AND resource = $2
              AND item_id = ANY($3)
        `,
        [shopDomain, resource, itemIds],
    );

    const ownedIds = new Set(owned.map((r: any) => r.item_id));
    const newItemIds = itemIds.filter((id: string) => !ownedIds.has(id));

    // Everything already owned — no payment or free-tier check needed at all.
    if (newItemIds.length === 0) {
        return NextResponse.json({
            allOwned: true,
            ownedCount: ownedIds.size,
            newItemIds: [],
            newCount: 0,
        });
    }

    // How many free exports has this shop used, for the new items only.
    const freeUsage = await pool.query(
        `
            SELECT COUNT(*) AS free_count
            FROM export_jobs
            WHERE shop_domain = $1
              AND status = 'FREE'
        `,
        [shopDomain],
    );

    const freeCount = Number(freeUsage[0].free_count);
    const remainingFreeExports = Math.max(0, FREE_EXPORT_LIMIT - freeCount);
    let eligibleForFree = false;
    if (resource === "MEDIA_LIBRARY") {
        eligibleForFree = newItemIds.length <= FREE_IMAGE_LIMIT;
    } else {
        eligibleForFree = remainingFreeExports > 0 && newItemIds.length <= FREE_ITEM_LIMIT;
    }

    // Compute total cost using tiered pricing
    let totalCost = 0;
    if (resource === "MEDIA_LIBRARY") {
        // Images: free up to FREE_IMAGE_LIMIT, then tiered pricing for excess items
        if (eligibleForFree) {
            totalCost = 0;
        } else {
            const chargeableCount = newItemIds.length - FREE_IMAGE_LIMIT;
            totalCost = calculateTieredPrice(chargeableCount);
        }
    } else {
        if (eligibleForFree) {
            totalCost = 0;
        } else {
            totalCost = calculateTieredPrice(newItemIds.length);
        }
    }

    return NextResponse.json({
        allOwned: false,
        ownedCount: ownedIds.size,
        newItemIds,
        newCount: newItemIds.length,
        remainingFreeExports,
        eligibleForFree,
        totalCost,
    });
}