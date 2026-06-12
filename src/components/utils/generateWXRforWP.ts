import { js2xml } from "xml-js";

const generateWXR = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonData: any,
  WPsiteName: string,
  WpsiteAddress: string
) => {
  // Parse JSON data into an object
  const data = JSON.parse(JSON.stringify(jsonData));

  // Function to strip HTML tags and return plain text
  const stripHtmlTags = (html: string): string => {
    // Create a temporary element to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || "";
  };

  const cleanHtmlContent = (html: string): string => {
    // Remove blank <p> tags, such as <p></p> or <p> </p>
    html = html.replace(/<p>\s*<\/p>/gi, "");
    // Just trim leading and trailing whitespace
    html = html.trim();
    return html;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = data.map((post: any) => {
    const postId = post.id + 1000; // Adjust post ID to avoid conflicts
    const imageId = post.id + 2000; // Adjust image ID

    return {
      post: {
        title: post.title,
        link: `https://${WpsiteAddress}/${post.handle}`,
        pubDate: new Date(post.published_at).toUTCString(),
        "dc:creator": { _cdata: "admin" },
        guid: {
          _attributes: { isPermaLink: "false" },
          _text: `https://${WpsiteAddress}/?p=${postId}`,
        },
        description: "",
        "content:encoded": { _cdata: cleanHtmlContent(post.body_html) },
        "excerpt:encoded": { _cdata: stripHtmlTags(post.summary_html) },
        "wp:post_id": postId,
        "wp:post_date": post.published_at,
        "wp:post_date_gmt": post.published_at,
        "wp:post_modified": post.updated_at,
        "wp:post_modified_gmt": post.updated_at,
        "wp:post_status": "publish",
        "wp:post_type": "post",
        "wp:post_name": post.handle,
        "wp:postmeta": [
          { "wp:meta_key": "_thumbnail_id", "wp:meta_value": imageId },
        ],
        // Add blog name as wp:category element (replace tags)
        category: {
          _attributes: {
            domain: "category",
            nicename: post.customBlogName
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "-"),
          },
          _text: post.customBlogName.trim(),
        },
        "wp:attachment": post.image
          ? {
              "wp:post_id": imageId,
              "wp:post_type": "attachment",
              "wp:post_mime_type": "image/png",
              "wp:post_title": { _cdata: post.title },
              "wp:post_content": "",
              "wp:post_excerpt": "",
              "wp:post_status": "inherit",
              "wp:postmeta": [
                {
                  "wp:meta_key": "_wp_attached_file",
                  "wp:meta_value": JSON.stringify({
                    file: post.image.src.split("/").pop() || "",
                    width: post.image.width,
                    height: post.image.height,
                    url: post.image.src,
                  }),
                },
              ],
            }
          : null,
      },
    };
  });

  const wxrData = {
    rss: {
      _attributes: {
        version: "2.0",
        "xmlns:excerpt": "http://wordpress.org/export/1.2/excerpt/",
        "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
        "xmlns:wfw": "http://wellformedweb.org/CommentAPI/",
        "xmlns:dc": "http://purl.org/dc/elements/1.1/",
        "xmlns:wp": "http://wordpress.org/export/1.2/",
      },
      channel: {
        title: `${WPsiteName}`,
        link: `https://${WpsiteAddress}`,
        description: "Your Site Description",
        "wp:wxr_version": "1.2",
        "wp:author": {
          "wp:author_id": 1,
          "wp:author_login": "admin",
          "wp:author_email": "admin@yourwebsite.com",
          "wp:author_display_name": { _cdata: "Admin" },
          "wp:author_first_name": "",
          "wp:author_last_name": "",
        },
        "wp:post_type": "post",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        item: posts.map((post: { post: any; attachment: any }) => {
          return {
            ...post.post,
            ...(post.attachment && { "wp:attachment": post.attachment }),
          };
        }),
      },
    },
  };

  console.log("file conversion complete");

  return js2xml(wxrData, { compact: true, ignoreComment: true, spaces: 4 });
};

export default generateWXR;
