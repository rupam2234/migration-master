import { pool } from "@/lib";

export async function getCouponDiscount(
    coupon?: string,
): Promise<number> {
    if (!coupon) return 0;

    try {
        const result = await pool.query(
            `
                SELECT percent_off
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

        return Number(result[0]?.percent_off ?? 0);

    } catch (error) {
        console.error("Coupon lookup failed:", error);
        return 0;
    }
}