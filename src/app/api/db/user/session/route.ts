import { getRedisClient, pool, verifyPassword } from "@/lib";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

interface Props {
    email: string;
    password: string;
}

export async function POST(request: Request) {

    const redisClient = await getRedisClient();

    const sessionId = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 min access window

    const { email, password }: Props = await request.json();

    if (!email || !password) {
        return Response.json({ message: "Bad request" }, { status: 400 });
    }

    try {
        const result = await pool.query(
            `SELECT id, name, email, password_hash FROM users WHERE email = $1`,
            [email]
        );

        const user = result[0];

        if (!user || !(await verifyPassword(password, user.password_hash))) {
            return Response.json({ message: "Invalid email or password" }, { status: 401 });
        }

        // we keep the session (incl. the user object) in redis, so
        // getCurrentUser() never needs a Postgres roundtrip
        await redisClient.set(
            `session:${sessionId}`,
            JSON.stringify({ userId: user.id, name: user.name, email: user.email }),
            { EX: 60 * 60 }
        )

        cookies().set("session", sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            expires: expiresAt,
            path: "/",
        });

        return Response.json({ message: "Signed in" }, { status: 200 });

    } catch (error: any) {
        console.error(error);
        return Response.json({ message: "Something went wrong" }, { status: 500 });
    }
}