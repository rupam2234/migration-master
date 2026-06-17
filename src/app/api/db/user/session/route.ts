import { pool, verifyPassword } from "@/lib";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

interface Props {
    email: string;
    password: string;
}

const token = randomBytes(32).toString("hex");
const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

export async function POST(request: Request) {
    const { email, password }: Props = await request.json();

    if (!email || !password) {
        return Response.json({ message: "Bad request" }, { status: 400 });
    }

    try {
        const result = await pool.query(
            `SELECT id, password_hash FROM users WHERE email = $1`,
            [email]
        );

        const user = result[0];

        if (!user || !(await verifyPassword(password, user.password_hash))) {
            return Response.json({ message: "Invalid email or password" }, { status: 401 });
        }

        await pool.query(
            `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
            [token, user.id, expiresAt]
        );

        cookies().set("session", token, {
            httpOnly: true,
            secure: true,
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