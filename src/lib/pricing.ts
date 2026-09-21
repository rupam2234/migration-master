
export const USD_TO_INR_RATE = 92;

/**
 * Emergency fallback used ONLY when the live-rate fetch fails.
 * Kept separate from USD_TO_INR_RATE so each stays intentional.
 */
export const USD_TO_INR_FALLBACK_RATE = 92;

export type PaymentCurrency = "USD" | "INR";

export async function fetchLiveUsdToInrRate(): Promise<number> {
    const response = await fetch(
        "https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR",
        {
            // FX rates don't change per-request — cache for 1 hour
            // instead of hitting the external API on every checkout.
            next: { revalidate: 3600 },
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

export function formatCurrencyAmount(
    amount: number,
    currency: PaymentCurrency,
) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(amount);
}

