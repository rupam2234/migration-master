import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib";
import { revalidateTag } from "next/cache";

export async function POST() {
    try {
        const token = cookies().get("session")?.value;

        if (token) {
            await pool.query(
                `DELETE FROM sessions WHERE id = $1`,
                [token]
            );
        }

        revalidateTag(`session:${token}`); // clear cache configured during session

        const response = NextResponse.json(
            { message: "Signed out" },
            { status: 200 }
        );

        response.cookies.delete("session");
        return response;

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        );
    }
}