import { NextResponse } from 'next/server';
import Shopify from 'shopify-api-node';

export async function POST(req: Request) {
  try {
    // Parse the request body
    const body = await req.json();
    const { shopName, apiKey, apiPassword } = body;

    // Initialize the Shopify API with dynamic credentials
    const shopify = new Shopify({
      shopName,
      apiKey,
      password: apiPassword,
    });

    // Fetch all blogs
    const blogs = await shopify.blog.list();
    let allPosts: any[] = [];
    
    // Loop through each blog
    for (const blog of blogs) {
      const blogID = blog.id;
      const blogName = blog.title;
      
      let params = { limit: 250 };
      let posts = await shopify.article.list(blogID, params);

      // Loop through pages of posts
      while (posts.length > 0) {
        // Attach customBlogID and customBlogName to each post
        const postsWithCustomFields = posts.map((post) => ({
          ...post,
          customBlogID: blogID,
          customBlogName: blogName,
        }));

        allPosts = allPosts.concat(postsWithCustomFields);

        if (!posts.nextPageParameters) {
          break;
        }
        params = posts.nextPageParameters;
        posts = await shopify.article.list(blogID, params);

        console.log("Count: ", posts);
      }
    }

    // Convert JSON data to a Blob
    const json = JSON.stringify(allPosts, null, 2);

    // Send the JSON data as a downloadable file
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="blog-posts.json"',
      },
    });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    );
  }
}
