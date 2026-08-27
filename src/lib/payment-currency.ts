import { pool, refreshShopifyAccessToken } from "./index";
import { fetchLiveUsdToInrRate, type PaymentCurrency } from "./pricing";

const API_VERSION = "2026-01";

/**
 * Resolve which payment currency a shopper should be charged in:
 * - An Indian IP (Vercel/Cloudflare country header) → INR
 * - Any other detected country → USD
 * - No country header → fall back to the connected Shopify shop's
 *   currencyCode / billing country (India → INR, otherwise USD).
 *
 * Shared by create-order (the charge) and check-export (the up-front
 * price popup) so the currency shown always matches the currency billed.
 */
export async function resolvePaymentCurrency(
    req: { headers: { get(name: string): string | null } },
    shopDomain: string,
): Promise<PaymentCurrency> {
    const detectedCountry =
        req.headers.get("x-vercel-ip-country")?.toUpperCase() ??
        req.headers.get("cf-ipcountry")?.toUpperCase() ??
        null;

    if (detectedCountry === "IN") {
        return "INR";
    }

    if (detectedCountry) {
        return "USD";
    }

    const connection = await pool.query(
        `
            SELECT
                s."accessToken",
                s."refreshToken",
                s."expires",
                s."refreshTokenExpires",
                sc.status
            FROM shopify."Session" s
            JOIN shopify_connections sc
              ON sc.shop_domain = s.shop
            WHERE s.shop = $1
        `,
        [shopDomain],
    );

    const credential = connection[0];

    if (!credential) {
        return "USD";
    }

    if (credential.status !== "CONNECTED") {
        return "USD";
    }

    let accessToken = credential.accessToken;
    const expiresAt = new Date(credential.expires).getTime();

    if (Date.now() >= expiresAt) {
        const refreshed = await refreshShopifyAccessToken(
            shopDomain,
            credential.refreshToken,
        );

        accessToken = refreshed.access_token;

        await pool.query(
            `
                UPDATE shopify."Session"
                SET
                    "accessToken" = $1,
                    "refreshToken" = $2,
                    "expires" = NOW() + ($3 * interval '1 second'),
                    "refreshTokenExpires" = NOW() + ($4 * interval '1 second')
                WHERE shop = $5
            `,
            [
                refreshed.access_token,
                refreshed.refresh_token,
                refreshed.expires_in,
                refreshed.refresh_token_expires_in,
                shopDomain,
            ],
        );
    }

    const response = await fetch(
        `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({
                query: `
                    query ShopPaymentContext {
                        shop {
                            currencyCode
                            billingAddress {
                                countryCode
                            }
                        }
                    }
                `,
            }),
            cache: "no-store",
        },
    );

    if (!response.ok) {
        return "USD";
    }

    const json = await response.json();
    const shop = json.data?.shop;
    const currencyCode = String(shop?.currencyCode ?? "").toUpperCase();
    const countryCode = String(shop?.billingAddress?.countryCode ?? "").toUpperCase();

    if (currencyCode === "INR" || countryCode === "IN") {
        return "INR";
    }

    return "USD";
}

/**
 * Live USD→INR rate for INR orders, falling back to a static rate if the
 * live fetch fails. Returns 1 for USD orders (no conversion needed).
 */
export async function getUsdToInrRate(
    currency: PaymentCurrency,
): Promise<number> {
    if (currency !== "INR") {
        return 1;
    }

    try {
        return await fetchLiveUsdToInrRate();
    } catch (error) {
        console.warn("Falling back to static USD/INR rate", error);
        return 83;
    }
}
