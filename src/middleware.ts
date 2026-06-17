import { NextRequest, NextResponse } from "next/server";

export default function Middleware(req: NextRequest) {
    // check cookie for log in status
    const token = req.cookies.get("session")?.value;

    if (!token) {
        return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/dashboard/:path*"],
};