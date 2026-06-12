import fs from "fs";
import path from "path";
import { NextApiRequest, NextApiResponse } from "next";

// Handler function for the cleanup endpoint
export async function POST(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      // Paths to the ZIP file and images directory
      const zipPath = path.join(process.cwd(), "public", "featured_images.zip");
      const imagesDir = path.join(process.cwd(), "public", "featured_images");

      // Remove the ZIP file if it exists
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }

      // Remove the images directory if it exists and is empty
      if (fs.existsSync(imagesDir)) {
        // Remove all files inside the directory
        fs.readdirSync(imagesDir).forEach((file) => {
          fs.unlinkSync(path.join(imagesDir, file));
        });

        // Remove the directory itself
        fs.rmdirSync(imagesDir);
      }

      res.status(200).json({ message: "Cleanup successful" });
    } catch (error) {
      console.error("Error cleaning up files:", error);
      res.status(500).json({ error: "Failed to clean up files" });
    }
  } else {
    // Handle methods other than POST
    res.status(405).json({ error: "Method not allowed" });
  }
}
