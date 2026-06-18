import styles from "@/app/(home)/style.module.css";
import Link from "next/link";

export function Logo() {
  return (
    <Link className={styles["mm-logo"]} href={"/"}>
      <span className={styles["mm-logo-mark"]}>Migration Master</span>
      <span className={styles["mm-logo-tag"]}>/ shopify → wp</span>
    </Link>
  );
}
