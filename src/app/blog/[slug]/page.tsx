import { posts } from "@/lib/posts";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts[slug as keyof typeof posts];
  if (!post) return {};
  return {
    title: post.meta.title,
    description: post.meta.description,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts[slug as keyof typeof posts];

  if (!post) {
    notFound();
  }

  const PostContent = post.default;
  const url = `/blog/${slug}`;
  const breadcrumbs = url.split("/");

  return (
    <>
      <div className="max-w-3xl mx-auto px-7 pt-16 text-neutral-900">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700">
            Guide
          </span>

          <span className="text-neutral-400">/</span>

          <Link
            href="/blog"
            className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
          >
            {breadcrumbs[1]}
          </Link>
        </div>
      </div>
      <PostContent />
    </>
  );
}
