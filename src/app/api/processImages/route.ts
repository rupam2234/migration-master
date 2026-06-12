import fs from "fs";
import path from "path";
import axios from "axios";
import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";

// Helper to download an image and save it locally
const downloadImage = async (url: string, savePath: string) => {
  const writer = fs.createWriteStream(savePath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};

const sanitizeFileName = (fileName: string) => {
  // Remove query parameters and sanitize the file name
  return fileName.split("?")[0].replace(/[^a-zA-Z0-9_\-\.]/g, "_");
};

const saveFeaturedImagesAndCreateZip = async (jsonData: any) => {
  const imagesDir = path.join(process.cwd(), "public", "featured_images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const promises = jsonData.map(async (post: any) => {
    if (post.image && post.image.src) {
      const imageFileName = sanitizeFileName(
        post.image.src.split("/").pop() || `image-${post.id}.png`
      );
      const imagePath = path.join(imagesDir, imageFileName);
      try {
        await downloadImage(post.image.src, imagePath);
        return imageFileName;
      } catch (error) {
        console.error(
          `Failed to download image from ${post.image.src}:`,
          error
        );
        return null;
      }
    }
    return null;
  });

  const imageFiles = await Promise.all(promises);
  const validImages = imageFiles.filter(Boolean);

  // Create a ZIP archive
  const zip = new JSZip();
  validImages.forEach((fileName) => {
    const filePath = path.join(imagesDir, fileName!);
    try {
      const fileData = fs.readFileSync(filePath);
      zip.file(fileName!, fileData);
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
    }
  });

  const zipContent = await zip.generateAsync({ type: "nodebuffer" });
  const zipPath = path.join(process.cwd(), "public", "featured_images.zip");
  fs.writeFileSync(zipPath, zipContent);

  // Cleanup images
  validImages.forEach((fileName) => {
    const filePath = path.join(imagesDir, fileName!);
    fs.unlinkSync(filePath); // Remove each image file
  });

  // Optionally remove the directory if empty
  if (fs.readdirSync(imagesDir).length === 0) {
    fs.rmdirSync(imagesDir);
  }

  return {
    zipPath: "/featured_images.zip", // Public URL path
    imagesDir: "/featured_images", // Public URL for individual images
  };
};

// Named export for POST method
export async function POST(req: NextRequest) {
  try {
    const { jsonData } = await req.json();

    if (!jsonData || !Array.isArray(jsonData)) {
      return NextResponse.json(
        { error: "Invalid data. Expected an array of posts." },
        { status: 400 }
      );
    }

    const result = await saveFeaturedImagesAndCreateZip(jsonData);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing images:", error);
    return NextResponse.json(
      { error: "Failed to process images" },
      { status: 500 }
    );
  }
}
