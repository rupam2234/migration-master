type BlogHeaderProps = {
  title: string;
  description: string;
  author: string;
};

export default function BlogHeader({
  title,
  description,
  author,
}: BlogHeaderProps) {
  return (
    <>
      <header className="mb-5">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
          {title}
        </h1>

        <p className="text-sm text-neutral-600 mt-4 leading-relaxed">
          {description}
        </p>

        <p className="text-xs italic text-neutral-600 mt-4 leading-relaxed">
          <strong>By</strong> - <span>{author}</span>
        </p>
      </header>

      <div className="border border-b border-primary/20 w-full mb-5" />
    </>
  );
}
