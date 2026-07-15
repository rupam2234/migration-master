import { PRICE_PER_ITEM } from "@/app/api/stripe/default-price";

export function calculateExportPrice(count: number) {
    const total = Math.max(0.50, count * PRICE_PER_ITEM);
    return {
        count,
        total,
        formatted: `$${total.toFixed(2)}`,
    };
}

