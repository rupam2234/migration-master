import { encryptToken, getCurrentUser, pool } from "@/lib";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    shopDomain: string;
    accessToken?: string;
}

export async function POST(req: NextRequest) {
    const { shopDomain, accessToken }: Props = await req.json();

    if (!shopDomain || !accessToken) {
        return NextResponse.json({ message: "Bad request" }, { status: 400 })
    }

    try {

        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const encrypted = encryptToken(accessToken);

        await pool.query(
            `INSERT INTO shop_credentials (id, user_id, shop_domain, encrypted_token, scopes)
             VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
            [user.id, shopDomain, encrypted, []]
        );

        revalidateTag("user-projects");

        return NextResponse.json({ message: "Store connected" }, { status: 201 });

    } catch (error: any) {
        console.log(error)
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
    }
}