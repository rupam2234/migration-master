import Image from "next/image";

type BlogImageProps = {
  src: string;
  alt: string;
};

export default function BlogImage({ src, alt }: BlogImageProps) {
  return (
    <figure className="mt-6">
      <div className="relative w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
        <Image
          src={src}
          alt={alt}
          width={1280}
          height={720}
          sizes="(max-width: 768px) 100vw, 768px"
          className="w-full h-auto"
        />
      </div>

      <figcaption className="text-sm text-neutral-500 mt-2">{alt}</figcaption>
    </figure>
  );
}
