import { hashPassword, pool } from "@/lib";

interface Props {
    name: string;
    total_migrations: number;
    email: string;
    password: string;
}

export async function POST(request: Request) {
    const { name, total_migrations = 0, email, password }: Props = await request.json();

    if (!name || !email || !password) {
        return Response.json({ message: "Bad request" }, { status: 400 })
    }

    try {

        const passwordHash = await hashPassword(password);

        const result = await pool.query(
            `INSERT INTO users (name, total_migrations, email, password_hash)
             VALUES ($1, COALESCE($2, 0), $3, $4)
             RETURNING id, name, total_migrations, email`,
            [name, total_migrations, email, passwordHash]
        );

        return Response.json(result, { status: 201 });

    } catch (error: any) {
        if (error.code === "23505") {
            return Response.json({ error: "Duplicate entry" }, { status: 409 });
        }
        if (error.code === "23502") {
            return Response.json({ error: "Missing required field" }, { status: 400 });
        }

        return Response.json({ error: "Failed to create user" }, { status: 500 });
    }
}