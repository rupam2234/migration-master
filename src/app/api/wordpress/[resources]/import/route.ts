import { Resurces } from "@/app/api/shopify/[resources]/fetch/route";
import { generateWXRChunks, getCurrentUser, WXRConfig } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

export interface WPimportProps {
    data: any[],
    cfg: WXRConfig,
    chunkSize?: number, //items-per-file
    part?: number, // which chunk to return
}

export async function POST(req: NextRequest, { params }: { params: { resources: Resurces } }) {
    const { resources } = params;
    const { cfg, data, chunkSize, part = 1 }: WPimportProps = await req.json()

    if (!cfg || !data || !resources) {
        return NextResponse.json({ message: "Bad request" }, { status: 400 })
    }

    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ message: "user unauthorized" }, { status: 401 })
    }

    try {
        const chunks = generateWXRChunks(
            resources,
            data,
            cfg,
            chunkSize
        );

        if (!chunks || chunks.length === 0) {
            throw new Error("Unable to process WordPress import")
        }

        const index = part - 1;
        const chunk = chunks[index];

        if (!chunk) {
            return NextResponse.json(
                { message: `Invalid part ${part}. This export has ${chunks.length} part(s).` },
                { status: 400 }
            )
        }

        return new NextResponse(chunk.xml, {
            status: 200,
            headers: {
                "Content-Type": "application/xml; charset=utf-8",
                "Content-Disposition": `attachment; filename="${chunk.filename}"`,

                // Lets the frontend know how many more parts to fetch.
                "X-Total-Parts": String(chunks.length),
                "X-Part-Number": String(part),
                "X-Filename": chunk.filename,
            }
        })
    }
    catch (error: any) {
        return NextResponse.json({ message: error.message ?? "Something went wrong" }, { status: 500 })
    }
}