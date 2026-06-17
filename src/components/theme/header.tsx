import { Logo, NavigationMain } from "..";

const Header = () => {
  return (
    <section className="w-full font-[family-name:var(--font-geist-mono)] sticky top-0 h-16 bg-white z-10 flex justify-between px-10 py-5 border-b-2 transition-all ease-in-out duration-700 items-center text-[16px] ">
      <Logo />
      <NavigationMain />
    </section>
  );
};

export default Header;
