
export const PRICE_PER_ITEM = 0.20

export function calculateExportPrice(count: number) {
    const total = Math.max(0.50, count * PRICE_PER_ITEM);
    return {
        count,
        total,
        formatted: `$${total.toFixed(2)}`,
    };
}

