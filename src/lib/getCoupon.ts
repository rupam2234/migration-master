import { pool } from "@/lib";

export async function getCoupon(
    coupon?: string,
): Promise<{ id: number; percentOff: number; code: string } | null> {
    if (!coupon) return null;

    try {
        const result = await pool.query(
            `
                SELECT id, percent_off, code
                FROM coupons
                WHERE code = $1
                AND active = true
                AND (
                    expires_at IS NULL
                    OR expires_at > NOW()
                )
                LIMIT 1
            `,
            [coupon.trim().toUpperCase()],
        );

        if (!result[0]) return null;

        return {
            id: result[0].id,
            percentOff: Number(result[0].percent_off),
            code: result[0].code,
        };
    } catch (error) {
        console.error("Coupon lookup failed:", error);
        return null;
    }
}

/**
 * Fetch a coupon by its id (used by the payment verify flow, which receives
 * only the coupon_id back from create-order and must re-check a 100%-off
 * coupon's per-shop usage cap before granting a free download).
 */
export async function getCouponById(
    couponId: number | null | undefined,
): Promise<{ id: number; percentOff: number; code: string } | null> {
    if (!couponId) return null;

    try {
        const result = await pool.query(
            `
                SELECT id, percent_off, code
                FROM coupons
                WHERE id = $1
                AND active = true
                LIMIT 1
            `,
            [couponId],
        );

        if (!result[0]) return null;

        return {
            id: result[0].id,
            percentOff: Number(result[0].percent_off),
            code: result[0].code,
        };
    } catch (error) {
        console.error("Coupon lookup by id failed:", error);
        return null;
    }
}