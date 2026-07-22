import { emailTemplate } from "@/components";
import { hashPassword, pool, resend } from "@/lib";

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

    // on success we send an email
    const baseAddress = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://migrationmaster.online"
    const html = emailTemplate({
      title: "Your Migration Master account is ready",
      content: `
              <p>Hi ${name ?? "there"},</p>
          
              <p>
                Thanks for creating your account with Migration Master.
                We're excited to help you simplify the process of migrating content
                between Shopify and WordPress while saving you valuable time and effort.
              </p>
          
              <p>
                To get started, visit your dashboard:
              </p>
          
              <p>
                <a
                  href="${baseAddress}/dashboard/"
                  style="color:#CC6CE7; text-decoration:underline;"
                >
                  Open Migration Master Dashboard
                </a>
              </p>
          
              <p>
                From your dashboard, click <strong>Add a New Project</strong>, enter your
                Shopify store details, and follow the connection steps.
              </p>
          
              <p>
                Once your store connection is complete, you can start preparing and
                exporting your content. If you need help connecting your store, you can
                check our step-by-step guide here:
                <a
                  href="${baseAddress}/blog/how-to-connect-shopify"
                  style="color:#CC6CE7; text-decoration:underline;"
                >
                  Shopify connection guide
                </a>.
              </p>
          
              <p>
                If you run into any issues during the migration process, our team is
                happy to help. Simply reach out and we'll assist you.
              </p>
          
              <p>
                Happy migrating!<br />
                The Migration Master Team
              </p>
            `,
    });

    await resend.emails.send({
      from: "Migration Master <client@migrationmaster.online>",
      to: [email],
      cc: ["support@migrationmaster.online"],
      subject: `Welcome to Migration Master`,
      html,
    });

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