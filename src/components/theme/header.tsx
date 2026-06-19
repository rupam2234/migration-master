import { ArrowRight } from "lucide-react";
import { Logo } from "..";
import styles from "@/app/(home)/style.module.css";
import Link from "next/link";

interface HeaderProps {
  nav: boolean;
  items?: {
    title: string;
    link: string;
  }[];
}

const Header = ({ nav, items }: HeaderProps) => {
  return (
    <header className={styles["mm-nav"]}>
      <div
        className={`${styles["mm-nav-inner"]} ${styles["mm-shell"]}`}
        style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}
      >
        <Logo />
        {nav && (
          <nav className={styles["mm-nav-links"]} aria-label="Primary">
            {items?.map((x) => (
              <Link
                key={x.title}
                className={styles["mm-nav-link"]}
                href={x.link}
              >
                {x.title}
              </Link>
            ))}
          </nav>
        )}
        <Link
          className={`${styles["mm-btn"]} ${styles["mm-btn-primary"]}`}
          href="/dashboard"
        >
          Start your migration <ArrowRight size={15} />
        </Link>
      </div>
    </header>
  );
};

export default Header;
