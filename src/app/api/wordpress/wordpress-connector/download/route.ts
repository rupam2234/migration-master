import JSZip from "jszip";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const PLUGIN_ROOT = path.join(process.cwd(), "wordpress-source-connector");
const ZIP_NAME = "migration-master-connector.zip";
const PLUGIN_FOLDER_NAME = "migration-master-connector";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  const appUrl = request.nextUrl.searchParams.get("appUrl")?.trim();
  const projectName = request.nextUrl.searchParams.get("projectName")?.trim() ?? "";

  if (!token || !appUrl) {
    return NextResponse.redirect(new URL("/wordpress-source-connector.zip", request.url));
  }

  try {
    const zip = new JSZip();
    const pluginFolder = zip.folder(PLUGIN_FOLDER_NAME);

    if (!pluginFolder) {
      throw new Error("Failed to create plugin archive");
    }

    await addDirectoryToZip(pluginFolder, PLUGIN_ROOT);
    pluginFolder.file(
      "mmc-config.json",
      JSON.stringify(
        {
          app_url: appUrl,
          connection_token: token,
          project_name: projectName,
          auto_connect: true,
        },
        null,
        2,
      ),
    );

    const blob = await zip.generateAsync({ type: "nodebuffer" });
    const file = new Blob([new Uint8Array(blob)], { type: "application/zip" });
    const safeProject = projectName ? `-${slugify(projectName)}` : "";

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${ZIP_NAME.replace(".zip", `${safeProject}.zip`)}"`,
        "Content-Length": String(blob.length),
      },
    });
  } catch (error: any) {
    console.error("Failed to generate connector zip:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to generate connector zip" },
      { status: 500 },
    );
  }
}

async function addDirectoryToZip(zipFolder: JSZip, dirPath: string) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const childFolder = zipFolder.folder(entry.name);

      if (childFolder) {
        await addDirectoryToZip(childFolder, fullPath);
      }

      continue;
    }

    const file = await fs.readFile(fullPath);
    zipFolder.file(entry.name, file);
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
