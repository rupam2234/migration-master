import { decryptToken, getCurrentUser, pool } from "@/lib";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const API_VERSION = "2026-01";
const PAGE_SIZE = 50;
const REVALIDATE_IN = 5 * 60;

export type Resurces =
  | "single_article"
  | "articles"
  | "blogs"
  | "pages"
  | "orders"
  | "images"

const QUERY_MAP: Record<Resurces, string> = {
  pages: `
      query GetPages($cursor: String) {
        pages(first: ${PAGE_SIZE}, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              handle
              body
              createdAt
              updatedAt
            }
          }
        }
      }
    `,
  blogs: `
      query GetBlogs($cursor: String) {
        blogs(first: ${PAGE_SIZE}, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `,
  orders: `
      query GetOrders($cursor: String) {
        orders(first: ${PAGE_SIZE}, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              name
              createdAt
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `,
  single_article: `
  query GetArticle($id: ID!) {
    article(id: $id) {
      id
      title
      handle
      body
      author {
        name
      }
      createdAt
      publishedAt
      blog {
        id
        title
      }
    }
  }
    `,
  articles: `
      query GetAllArticles($cursor: String) {
        articles(first: ${PAGE_SIZE}, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              handle
              body
              author { name }
              createdAt
              publishedAt
              blog {
                id
                title
              }
            }
          }
        }
      }
    `,
  images: `
    query GetAllMedia($cursor: String) {
      files(
        first: ${PAGE_SIZE}
        after: $cursor
        query: "-media_type:EXTERNAL_VIDEO"
      ) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            alt
            createdAt
            fileStatus
            fileErrors {
              code
              message
            }
            preview {
              image {
                url
                width
                height
              }
            }
            ... on MediaImage {
              mimeType
              image {
                url
                width
                height
                altText
              }
              originalSource {
                fileSize
              }
            }
            ... on Video {
              duration
              originalSource {
                fileSize
                mimeType
                format
                height
                width
              }
            }
            ... on Model3d {
              sources {
                url
                format
                mimeType
                filesize
              }
            }
            ... on GenericFile {
              url
              originalFileSize
              mimeType
            }
          }
        }
      }
    }
  `,

};

type Props = {
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>
}

async function shopifyGraphQL(
  { accessToken, query, shopDomain, variables }: Props
) {
  const cachedData = unstable_cache(async (shopDomain: string,
    accessToken: string,
    query: string,
    variables: Record<string, unknown>) => {

    const res = await fetch(
      `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    if (!res.ok) {
      const errorBody = await res.text();
      console.log("Shopify error status:", res.status);
      console.log("Shopify error body:", errorBody);
      throw new Error(`Shopify request failed with status ${res.status}`);
    }

    const json = await res.json();

    if (json.errors) {
      console.error(json.errors);
      throw new Error("Shopify query error");
    }

    return json;
  }, ["store-data"], { revalidate: REVALIDATE_IN, tags: ["store_data"] })

  return cachedData(shopDomain, accessToken, query, variables)
}

/**
 * Inspects Shopify's cost-based throttle status and waits briefly
 * if the available rate-limit budget is running low.
 */
async function throttleBetweenReq(json: any) {
  const throttleStatus = json.extensions?.cost?.throttleStatus;
  if (
    throttleStatus &&
    throttleStatus.currentlyAvailable < throttleStatus.maximumAvailable * 0.2
  ) {
    const restoreRate = throttleStatus.restoreRate || 50; // points per second
    const waitMs = Math.ceil((1000 / restoreRate) * 50);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

async function fetchAllResources(
  resources: Resurces,
  shopDomain: string,
  accessToken: string,
  blogId?: string
) {
  const allNodes: any[] = [];

  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    let json: any;
    let edges: any[];
    let pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };

    if (resources === "single_article") {
      if (!blogId) {
        throw new Error("blogId is required");
      }

      json = await shopifyGraphQL(
        {
          accessToken: accessToken,
          query: QUERY_MAP.single_article,
          variables: {
            id: blogId,
          },
          shopDomain: shopDomain
        }
      );

      const article = json.data?.article;

      if (!article) {
        throw new Error("Article not found");
      }

      allNodes.push({
        ...article,
      });

      return allNodes;
    } else if (resources === "articles") {
      json = await shopifyGraphQL(
        {
          accessToken: accessToken, query: QUERY_MAP.articles, shopDomain: shopDomain, variables: {
            cursor,
          }
        }
      );

      edges = json.data.articles.edges;
      pageInfo = json.data.articles.pageInfo;

      for (const edge of edges) {
        const { blog, ...article } = edge.node;

        allNodes.push({
          ...article,
          blogId: blog?.id,
          blogTitle: blog?.title,
        });
      }
    } else if (resources === "images") {
      json = await shopifyGraphQL({
        accessToken,
        query: QUERY_MAP.images,
        shopDomain,
        variables: { cursor },
      });

      edges = json.data.files.edges;       // ← "files", not "images"
      pageInfo = json.data.files.pageInfo;

      for (const edge of edges) {
        allNodes.push(edge.node);
      }
    } else {
      json = await shopifyGraphQL({
        accessToken: accessToken, query: QUERY_MAP[resources], shopDomain: shopDomain, variables: {
          cursor,
        }
      }
      );

      edges = json.data[resources].edges;
      pageInfo = json.data[resources].pageInfo;

      for (const edge of edges) {
        allNodes.push(edge.node);
      }
    }

    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;

    await throttleBetweenReq(json);
  }

  return allNodes;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { resources: Resurces } } // path params shopify/[resources]/route.ts
) {
  const { resources } = params;

  if (!QUERY_MAP[resources]) {
    return NextResponse.json({ message: "Unknown resource" }, { status: 400 });
  }

  const shopDomain = req.nextUrl.searchParams.get("shop");
  const blogId = req.nextUrl.searchParams.get("blogId");

  if (!shopDomain) {
    return NextResponse.json({ message: "Missing shop parameter" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT encrypted_token FROM shop_credentials WHERE user_id = $1 AND shop_domain = $2`,
      [user.id, shopDomain]
    );

    const credential = result[0];

    if (!credential) {
      return NextResponse.json({ message: "Shop not found" }, { status: 404 });
    }

    const accessToken = decryptToken(credential.encrypted_token);

    const normalizedBlogId = blogId
      ? blogId.startsWith("gid://shopify/Article/")
        ? blogId
        : `gid://shopify/Article/${blogId}`
      : undefined;

    const allNodes = await fetchAllResources(
      resources,
      shopDomain,
      accessToken,
      normalizedBlogId
    );

    return NextResponse.json(allNodes);
  } catch (error: any) {
    console.log(error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}