export async function createExportFingerprint(ids: string[]) {
    const sortedIds = [...ids].sort();
    const value = sortedIds.join("|");
    const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(value),
    );

    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}