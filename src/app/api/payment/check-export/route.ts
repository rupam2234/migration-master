import { pool } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const {
        fingerprint,
        shopDomain,
    } = await req.json();

    const result = await pool.query(
        `
            SELECT id
            FROM export_jobs
            WHERE fingerprint = $1
            AND shop_domain = $2
            AND status IN ('PAID','FREE')
            LIMIT 1
        `,
        [
            fingerprint,
            shopDomain,
        ]);

    return NextResponse.json({
        paid: result.length > 0,
        exportJobId: result[0]?.id ?? null,
    });
}