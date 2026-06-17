import Link from "next/link";

export function Logo() {
  return (
    <Link href={"/"} className="my-2">
      <img
        src={"/images/Migration-Master_logo.png"}
        alt="Migration-Master_logo"
        fetchPriority="high"
        width={150}
        height={60}
      />
    </Link>
  );
}
