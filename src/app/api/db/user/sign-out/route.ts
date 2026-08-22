import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRedisClient } from "@/lib";

export async function POST() {

    const redisClient = await getRedisClient();

    try {
        const sessionId = cookies().get("session")?.value;

        if (!sessionId) {
            return NextResponse.json(
                { message: "Already signed out" },
                { status: 200 }
            );
        }

        await redisClient.del(`session:${sessionId}`)

        // if (sessionId) {
        //     await pool.query(
        //         `DELETE FROM sessions WHERE id = $1`,
        //         [sessionId]
        //     );
        // }

        // revalidateTag(`session:${sessionId}`); // clear cache configured during session

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