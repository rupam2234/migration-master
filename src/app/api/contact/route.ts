import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

// Where submissions land. Move to an env var if you'd rather not hardcode it.
const TO_EMAIL = "support@migrationmaster.online";
// Your personal heads-up copy — sent as its own separate email, not a CC/BCC.
const PERSONAL_EMAIL = "rupam.krishna999@gmail.com";
// Where "support@migrationmaster.online" is actually read from.
const WEBMAIL_LINK = "https://bigrock.titan.email/mail/";
// Must be a domain/address verified in your Resend dashboard.
const FROM_EMAIL = "Migration Master <notifications@migrationmaster.online>";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, orderNumber, message, company } = body ?? {};

        // Honeypot: real users never fill this hidden field, bots often do.
        if (company) {
            return NextResponse.json({ ok: true });
        }

        if (!name || !email || !message) {
            return NextResponse.json(
                { ok: false, error: "Name, email, and message are required." },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof email !== "string" || !emailRegex.test(email)) {
            return NextResponse.json(
                { ok: false, error: "Please enter a valid email address." },
                { status: 400 }
            );
        }

        if (typeof message !== "string" || message.trim().length < 10) {
            return NextResponse.json(
                { ok: false, error: "Please add a bit more detail to your message." },
                { status: 400 }
            );
        }

        const submissionLines = [
            `Name: ${name}`,
            `Email: ${email}`,
            orderNumber ? `Order number: ${orderNumber}` : null,
            "",
            message,
        ]
            .filter(Boolean)
            .join("\n");

        const subject = orderNumber
            ? `Support request — Order ${orderNumber}`
            : "New support request — Migration Master";

        // Email 1: the actual support inbox, so replies go straight to the visitor.
        const supportEmail = resend.emails.send({
            from: FROM_EMAIL,
            to: TO_EMAIL,
            replyTo: email,
            subject,
            text: submissionLines,
        });

        // Email 2: a separate, standalone heads-up to your personal inbox
        // (not a CC/BCC on the email above — its own independent send).
        const personalEmail = resend.emails.send({
            from: FROM_EMAIL,
            to: PERSONAL_EMAIL,
            replyTo: email,
            subject: `[Copy] ${subject}`,
            text: [
                submissionLines,
                "",
                "---",
                `Open the support inbox: ${WEBMAIL_LINK}`,
            ].join("\n"),
        });

        // Send both in parallel; a failure on the personal copy shouldn't block
        // the real support notification (or vice versa).
        const results = await Promise.allSettled([supportEmail, personalEmail]);
        const supportResult = results[0];

        if (supportResult.status === "rejected") {
            throw supportResult.reason;
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Contact form error:", error);
        return NextResponse.json(
            { ok: false, error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}