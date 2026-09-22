"use client";

import { ResourceKey } from "@/lib/sharedResources";
import { ChevronDown, Hash, ImageIcon } from "lucide-react";

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

/**
 * Record preview panel.
 *
 * Renders content only (no outer card / sticky positioning) so the host page
 * owns the frame and every panel on the export screen shares one border and
 * radius scale.
 */
export default function ItemPreview({ item }: Props) {
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 px-5 py-14 text-center">
        <ImageIcon size={20} className="text-primary/20" />
        <p className="text-sm font-medium text-primary/50">No record selected</p>
        <p className="text-xs text-primary/35">
          Hover a row to preview its details.
        </p>
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
    <div className="flex flex-col">
      {/* Media */}

      <div className="flex h-32 items-center justify-center overflow-hidden border-b border-primary/10 bg-primary/[0.03]">
        {image ? (
          <img src={image} alt={title} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon size={20} className="text-primary/20" />
        )}
      </div>

      {/* Identity */}

      <div className="border-b border-primary/10 px-5 py-4">
        <h2 className="line-clamp-2 text-sm font-semibold text-primary/90">
          {title}
        </h2>

        {item.handle && (
          <p className="mt-1 truncate text-xs text-primary/40">/{item.handle}</p>
        )}
      </div>

      {/* Fields */}

      {fields.length > 0 && (
        <div className="flex flex-col gap-2.5 border-b border-primary/10 px-5 py-4">
          {fields.map(([key, value]) => (
            <div
              key={key}
              className="flex items-start justify-between gap-4 text-xs"
            >
              <span className="shrink-0 text-primary/45">{humanize(key)}</span>

              <span className="max-w-[62%] truncate text-right font-medium text-primary/80">
                {String(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Description */}

      {description && (
        <div className="border-b border-primary/10 px-5 py-4">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary/40">
            Description
          </p>

          <p
            className="line-clamp-4 text-xs leading-5 text-primary/60"
            dangerouslySetInnerHTML={{
              __html: description,
            }}
          />
        </div>
      )}

      {/* Raw record */}

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-xs font-medium text-primary/50 transition-colors hover:text-primary/80">
          <Hash size={13} />
          Raw record
          <ChevronDown
            size={13}
            className="ml-auto transition-transform group-open:rotate-180"
          />
        </summary>

        <pre className="mx-5 mb-4 max-h-56 overflow-auto rounded-lg border border-primary/10 bg-primary/[0.03] p-2.5 font-mono text-[10px] leading-4 text-primary/70">
          {JSON.stringify(item, null, 2)}
        </pre>
      </details>
    </div>
  );
}

/** `body_html` → `Body html` for readable preview labels. */
function humanize(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
