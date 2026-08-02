
export const PRICE_PER_ITEM = 0.20;
export const USD_TO_INR_RATE = 83;

export function calculateExportPrice(count: number) {
    const total = Math.max(0.50, count * PRICE_PER_ITEM);
    return {
        count,
        total,
        formatted: `$${total.toFixed(2)}`,
    };
}

export type PaymentCurrency = "USD" | "INR";

export async function fetchLiveUsdToInrRate(): Promise<number> {
    const response = await fetch(
        "https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR",
        {
            cache: "no-store",
        },
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch live USD/INR rate: ${response.status}`);
    }

    const data = await response.json();
    const liveRate = Number(data?.rates?.INR);

    if (!Number.isFinite(liveRate) || liveRate <= 0) {
        throw new Error("Invalid live USD/INR rate");
    }

    return liveRate;
}

export function convertExportTotal(
    totalUsd: number,
    currency: PaymentCurrency,
    usdToInrRate = USD_TO_INR_RATE,
) {
    return currency === "INR" ? totalUsd * usdToInrRate : totalUsd;
}

export function formatExportTotal(
    totalUsd: number,
    currency: PaymentCurrency,
    usdToInrRate = USD_TO_INR_RATE,
) {
    const convertedTotal = convertExportTotal(totalUsd, currency, usdToInrRate);

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(convertedTotal);
}

