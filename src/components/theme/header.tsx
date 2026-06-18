import { ArrowRight } from "lucide-react";
import { Logo } from "..";
import styles from "@/app/(home)/style.module.css";
import Link from "next/link";

const Header = () => {
  return (
    <header className={styles["mm-nav"]}>
      <div
        className={`${styles["mm-nav-inner"]} ${styles["mm-shell"]}`}
        style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}
      >
        <Logo />
        <nav className={styles["mm-nav-links"]} aria-label="Primary">
          <a className={styles["mm-nav-link"]} href="#how-it-works">
            How it works
          </a>
          <a className={styles["mm-nav-link"]} href="#what-moves">
            What moves
          </a>
          <a className={styles["mm-nav-link"]} href="#pricing">
            Pricing
          </a>
          <a className={styles["mm-nav-link"]} href="#faq">
            FAQ
          </a>
        </nav>
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
