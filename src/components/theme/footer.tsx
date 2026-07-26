import styles from "@/app/(home)/style.module.css";
import Link from "next/link";

type FooterLink = {
  title: string;
  href: string;
};

type FooterProps = {
  links?: FooterLink[];
};

export function Footer({ links }: FooterProps) {
  return (
    <footer className={styles["mm-footer"]}>
      <div className={`${styles["mm-shell"]} ${styles["mm-footer-row"]}`}>
        <div>
          <div className={styles["mm-logo"]} style={{ marginBottom: 8 }}>
            <span className={styles["mm-logo-mark"]}>Migration Master</span>
          </div>
          <p className={styles["mm-footer-tag"]}>
            Content migration utility | Shopify to WordPress and vice versa
          </p>
        </div>

        <nav className={styles["mm-footer-links"]} aria-label="Footer">
          {links ? (
            links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.title}
              </Link>
            ))
          ) : (
            <>
              <Link href={"/blog"}>Blog</Link>
              <Link href="/privacy-policy">Privacy Policy</Link>{" "}
              <Link href="/terms-of-service">Terms</Link>{" "}
              <Link href="/refund-policy">Refund Policy</Link>{" "}
              <Link href="/contact">Contact</Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
