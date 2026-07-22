import { ReactNode } from "react";

type BlogArticleProps = {
  children: ReactNode;
};

export default function BlogArticle({ children }: BlogArticleProps) {
  return (
    <article className="max-w-3xl mx-auto px-6 pt-7 pb-16 text-neutral-900">
      {children}
    </article>
  );
}
