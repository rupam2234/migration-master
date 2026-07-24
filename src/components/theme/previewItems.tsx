"use client";

import { ResourceKey } from "@/app";
import { ImageIcon, Hash } from "lucide-react";

type Props = {
  item: Record<string, any>;
  resource?: ResourceKey;
};

const IMAGE_KEYS = [
  "image",
  "featuredImage",
  "preview",
  "thumbnail",
  "src",
  "url",
];

const TITLE_KEYS = ["title", "name", "handle", "email", "slug"];

const DESCRIPTION_KEYS = [
  "description",
  "body_html",
  "body",
  "content",
  "summary",
  "excerpt",
];

export default function ItemPreview({ item }: Props) {
  if (!item) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center text-sm text-gray-400">
        Select an item
      </div>
    );
  }

  const image = findImage(item);

  const title = findValue(item, TITLE_KEYS) ?? item.id ?? "Untitled";

  const description = findValue(item, DESCRIPTION_KEYS);

  const fields = Object.entries(item)
    .filter(([, value]) => {
      if (value == null || value === "") return false;
      return typeof value !== "object";
    })
    .slice(0, 8);

  return (
    <div className="sticky top-4 overflow-hidden rounded-lg border bg-white">
      {/* Image */}

      <div className="flex max-h-28 min-h-28 items-center justify-center overflow-hidden bg-gray-100">
        {image ? (
          <img src={image} alt={title} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-8 w-8 text-gray-300" />
        )}
      </div>

      <div className="space-y-4 p-4">
        {/* Title */}

        <div>
          <h2 className="line-clamp-2 text-sm font-semibold">{title}</h2>

          {item.handle && (
            <p className="mt-1 text-xs text-gray-500">/{item.handle}</p>
          )}
        </div>

        {/* Quick info */}

        <div className="space-y-2">
          {fields.map(([key, value]) => (
            <div
              key={key}
              className="flex items-start justify-between gap-3 text-xs"
            >
              <span className="text-gray-400 capitalize">{key}</span>

              <span className="max-w-[60%] truncate text-right font-medium text-gray-700">
                {String(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Description */}

        {description && (
          <div className="border-t pt-3">
            <p
              className="line-clamp-4 text-xs leading-5 text-gray-600"
              dangerouslySetInnerHTML={{
                __html: description,
              }}
            />
          </div>
        )}

        {/* JSON */}

        <details className="border-t pt-3">
          <summary className="flex cursor-pointer items-center gap-2 text-xs text-gray-500">
            <Hash size={14} />
            Raw JSON
          </summary>

          <pre className="mt-2 max-h-48 overflow-auto rounded bg-gray-50 p-2 text-[10px]">
            {JSON.stringify(item, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function findValue(obj: any, keys: string[]) {
  for (const key of keys) {
    if (obj[key]) return obj[key];
  }
  return null;
}

function findImage(obj: any): string | null {
  for (const key of IMAGE_KEYS) {
    const value = obj[key];

    if (!value) continue;

    if (typeof value === "string") return value;

    if (typeof value === "object") {
      if (value.src) return value.src;
      if (value.url) return value.url;
      if (value.originalSrc) return value.originalSrc;
    }
  }

  if (Array.isArray(obj.images) && obj.images.length) {
    const first = obj.images[0];
    return first?.src ?? first?.url ?? null;
  }

  if (Array.isArray(obj.media) && obj.media.length) {
    const first = obj.media[0];
    return first?.preview?.image?.url ?? first?.image?.url ?? null;
  }

  return null;
}
