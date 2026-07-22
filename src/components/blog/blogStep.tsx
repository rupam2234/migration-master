import BlogImage from "./blogImage";
import { StepTypes } from "@/lib/posts";

export default function BlogStep({
  number,
  title,
  body,
  image,
  alt,
}: StepTypes) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-orange-700 font-mono text-2xl">{number}</span>

        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      </div>

      <div className="text-neutral-800 leading-relaxed space-y-3">{body}</div>

      {image && alt ? <BlogImage src={image} alt={alt} /> : <></>}
    </section>
  );
}
