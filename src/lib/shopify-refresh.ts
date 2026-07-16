const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_API_SECRET!;

export async function refreshShopifyAccessToken(
    shop: string,
    refreshToken: string,
) {
    const response = await fetch(
        `https://${shop}/admin/oauth/access_token`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: SHOPIFY_CLIENT_ID,
                client_secret: SHOPIFY_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
        },
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(
            `Shopify token refresh failed: ${error}`,
        );
    }

    return response.json() as Promise<{
        access_token: string;
        expires_in: number;
        refresh_token: string;
        refresh_token_expires_in: number;
    }>;
}