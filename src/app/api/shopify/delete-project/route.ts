import { getCurrentUser, pool } from "@/lib";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { shopDomain } = await req.json();

    if (!shopDomain) {
      return NextResponse.json(
        { message: "shopDomain is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const connectionCheck = await pool.query(
      `SELECT id FROM shopify_connections WHERE shop_domain = $1 AND user_id = $2`,
      [shopDomain, user.id]
    );

    if (!connectionCheck || connectionCheck.length === 0) {
      return NextResponse.json(
        { message: "Project connection not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete project data safely
    await pool.query(
      `DELETE FROM exported_items WHERE shop_domain = $1`,
      [shopDomain]
    );
    await pool.query(
      `DELETE FROM export_jobs WHERE shop_domain = $1`,
      [shopDomain]
    );
    await pool.query(
      `DELETE FROM shopify."Session" WHERE shop = $1`,
      [shopDomain]
    );
    await pool.query(
      `DELETE FROM shopify_connections WHERE shop_domain = $1 AND user_id = $2`,
      [shopDomain, user.id]
    );

    revalidateTag("user-projects");

    return NextResponse.json({
      success: true,
      message: `Project ${shopDomain} deleted successfully`,
    });
  } catch (error: any) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to delete project" },
      { status: 500 }
    );
  }
}
