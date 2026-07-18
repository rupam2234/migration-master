"use client";

import Image from "next/image";

type iconProps = {
  imagePath: string;
  alt_text?: string;
  /**
   * Size automatically sets height and width to square, i.e 25 sets width=25 and height=25
   * Default = 15
   */
  size: number;
};

export default function NavIcons({
  imagePath,
  alt_text,
  size = 15,
}: iconProps) {
  if (!imagePath) {
    console.error("Missing image path");
    return;
  }

  if (!alt_text) {
    const chunks = imagePath.split("/");
    alt_text = `${chunks[chunks.length - 1].split(".")[0]}`;
  }

  return <Image src={imagePath} alt={alt_text} width={size} height={size} />;
}
