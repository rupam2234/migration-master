import Link from "next/link";
import { posts } from "@/lib/posts";
import { Container } from "@/components";

export const metadata = {
  title: "Blog | Migration Master",
  description: "Guides, walkthroughs and documentations of Migration Master",
};

export default function BlogIndexPage() {
  const entries = Object.values(posts);

  return (
    <Container>
      <div className="py-16 max-w-6xl mx-auto">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-amber-700">
          Blog
        </p>
        <h1 className="mb-12 text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl">
          Guides &amp; walkthroughs
        </h1>

        {entries.length === 0 ? (
          <p className="border-y border-neutral-200 py-8 text-sm text-neutral-500">
            No posts yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((post) => (
              <Link
                key={post.meta.slug}
                href={`/blog/${post.meta.slug}`}
                className="group flex flex-col rounded-sm border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-md"
              >
                <h2 className="mb-2 text-xl font-semibold tracking-tight text-neutral-900 group-hover:text-orange-700">
                  {post.meta.title}
                </h2>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-600">
                  {post.meta.description}
                </p>
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 group-hover:text-orange-700">
                  Read guide &rarr;
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
