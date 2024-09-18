import Image from "next/image";
import Link from "next/link";

const Header = () => {
  return (
    <section className="w-full sticky top-0 h-16 bg-[#fffc] backdrop z-10 flex justify-between px-10 py-5 border-b-2 transition-all ease-in-out duration-700 items-center text-[16px] ">
      <div className="font-[family-name:var(--font-geist-mono)]">
        <Link href={"/"}>
          <Image
            src={"/images/Migration-Master_logo.png"}
            alt="Migration-Master_logo"
            width={150}
            height={60}
          />
        </Link>
      </div>
      <div className="font-[family-name:var(--font-geist-mono)]">
        Navigation
      </div>
    </section>
  );
};

export default Header;
