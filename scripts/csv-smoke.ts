// Smoke test for the Shopify CSV mappers — run with: npx tsx scripts/csv-smoke.ts
import { generateShopifyCsv } from "../src/lib/shopify-csv";

const products = [
  {
    id: 12,
    name: 'Linen Shirt, Blue "Edition"',
    slug: "linen-shirt-blue-edition",
    description: "<p>Breathable <strong>linen</strong> shirt</p>",
    status: "publish",
    sku: "LIN-001",
    price: "29.99",
    regular_price: "39.99",
    manage_stock: true,
    stock_quantity: 14,
    weight: "250",
    categories: [{ id: 3, name: "Shirts" }],
    tags: [{ id: 9, name: "summer" }, { name: "linen" }],
    images: [
      {
        src: "https://cdn.example.com/shirt.jpg?adapt=800",
        alt: "Blue linen shirt",
      },
    ],
    meta_data: [
      { key: "_yoast_wpseo_title", value: "Buy Linen Shirts" },
      { key: "_yoast_wpseo_metadesc", value: "Soft summer linen" },
      { key: "care_instructions", value: "Machine wash cold" },
      { key: "_internal_plugin_junk", value: "should-not-appear" },
    ],
  },
];

const posts = [
  {
    id: 7,
    title: { rendered: "Summer Launch &#038; News" },
    content: { rendered: "<p>We launched.</p>" },
    excerpt: { rendered: "<p>Short intro.</p>" },
    status: "publish",
    date: "2026-05-01T10:00:00",
    categories: [{ id: 3, name: "Announcements" }],
    yoast_head_json: { title: "Summer SEO", description: "Launch post" },
    meta: { reading_time: "4" },
  },
];

const categories = [
  {
    id: 3,
    name: "Shirts & Tops",
    slug: "shirts-tops",
    description: "All shirts",
    status: "publish",
  },
];

const productCsv = generateShopifyCsv("products", products as any);
const postCsv = generateShopifyCsv("posts", posts as any);
const categoryCsv = generateShopifyCsv("categories", categories as any);

console.log("=== products ===\n" + productCsv);
console.log("\n=== posts ===\n" + postCsv);
console.log("\n=== categories ===\n" + categoryCsv);

const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
};

assert(productCsv.includes('"Linen Shirt, Blue ""Edition"""'), "quoted titles escape");
assert(
  productCsv.includes("Metafield: custom.care_instructions [single_line_text_field]"),
  "visible meta → metafield column",
);
assert(
  productCsv.includes("Metafield: seo.title [single_line_text_field]") &&
    productCsv.includes("Buy Linen Shirts"),
  "yoast title → seo metafield",
);
assert(!productCsv.includes("internal_plugin_junk"), "internal meta dropped");
assert(productCsv.includes("https://cdn.example.com/shirt.jpg"), "adapt suffix stripped");
assert(productCsv.includes("summer, linen, Shirts"), "categories+tags → Tags");
assert(productCsv.includes("Variant Inventory Tracker,") && productCsv.includes("shopify"), "inventory tracker set");
assert(productCsv.includes(",active,"), "status active");

assert(postCsv.includes("Summer Launch & News"), "rendered title decoded");
assert(postCsv.includes("SEO Title") && postCsv.includes("Summer SEO"), "yoast json → seo column");
assert(postCsv.includes("\nNews,"), "default blog assigned");
assert(postCsv.includes("Metafield: custom.reading_time"), "rest meta → metafield");

assert(categoryCsv.includes("shirts-tops,Shirts & Tops"), "category mapped");

console.log("\nAll smoke assertions passed.");
