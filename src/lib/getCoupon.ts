import { pool } from "@/lib";

export async function getCoupon(
    coupon?: string,
): Promise<{ id: number; percentOff: number } | null> {
    if (!coupon) return null;

    try {
        const result = await pool.query(
            `
                SELECT id, percent_off
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
        };
    } catch (error) {
        console.error("Coupon lookup failed:", error);
        return null;
    }
}