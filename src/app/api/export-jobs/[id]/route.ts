import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("id");
  const shop = req.headers.get("shop");

  if (!jobId || !shop) {
    return NextResponse.json({ error: "Missing id or shop header" }, { status: 400 });
  }

  try {
    // Fetch job and optional coupon info
    const jobResult = await pool.query(
      `
        SELECT ej.id, ej.coupon_id, c.code AS coupon_code, c.percent_off AS coupon_percent,
               ej.shop_domain
        FROM export_jobs ej
        LEFT JOIN coupons c ON ej.coupon_id = c.id
        WHERE ej.id = $1 AND ej.shop_domain = $2
      `,
      [jobId, shop]
    );
    const job = jobResult[0];
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Count exported items belonging to this job
    const itemsResult = await pool.query(
      `
        SELECT COUNT(*) AS item_count
        FROM exported_items ei
        WHERE ei.export_job_id = $1
      `,
      [jobId]
    );
    const exportedItemCount = Number(itemsResult[0].item_count);

    // Build a billing URL (Shopify admin billing page)
    const billingUrl = `https://${job.shop_domain}/admin/settings/billing`;

    // Fetch Razorpay payment ID if available
    const paymentResult = await pool.query(
      `
        SELECT razorpay_payment_id
        FROM payments
        WHERE export_job_id = $1
      `,
      [jobId]
    );
    const paymentId = paymentResult[0]?.razorpay_payment_id ?? null;

    const response = {
      id: job.id,
      exportedItemCount,
      coupon: job.coupon_id
        ? { code: job.coupon_code, discount: Number(job.coupon_percent) }
        : null,
      billingUrl,
      paymentId,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("Export job detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
