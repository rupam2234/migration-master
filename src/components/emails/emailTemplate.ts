interface EmailTemplateProps {
    title: string;
    content: string;
    footer?: string;
}

export function emailTemplate({
    title,
    content,
    footer,
}: EmailTemplateProps) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <title>${title}</title>
        </head>

        <body style="margin:0;padding:20px;background:#f5f7fb;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                <table
                    width="600"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                        overflow:hidden;
                    "
                >

                    <!-- Body -->
                    <tr>
                    <td>
                        ${content}
                    </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                    <td
                        style="
                        padding:14px;
                        text-align:center;
                        font-size:12px;
                        color:#777;
                        border-top:1px solid #eee;
                        "
                    >
                        ${footer ??
        `
                        <p>© ${new Date().getFullYear()} Migration Master. All rights reserved.</p>

                        <p>
                            <a
                            href="https://migrationmaster/unsubscribe"
                            style="color:#777;"
                            >
                            Unsubscribe
                            </a>
                        </p>
                        `
        }
                    </td>
                    </tr>

                </table>

                </td>
            </tr>
            </table>
        </body>
        </html>
    `;
}