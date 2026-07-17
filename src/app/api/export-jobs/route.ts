import { pool } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const shop = req.headers.get("shop");

  if (!shop) {
    return NextResponse.json("Bad Request", { status: 400 })
  }

  try {
    const result = await pool.query(
      `SELECT id, item_count, status, created_at, updated_at FROM export_jobs WHERE shop_domain = $1`,
      [shop],
      { fetchOptions: { priority: "high" } }
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(error.message, { status: 500 });
  }
}
