"use client";

import ProgressBar from "@/components/custom-elements/progressbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const WPChannel = () => {
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [error, setError] = useState("");
  const route = useRouter();

  // Retrieve value from sessionStorage when the component mounts
  useEffect(() => {
    const StoredSiteName = sessionStorage.getItem("WPsiteName");
    const StoredSiteAddress = sessionStorage.getItem("WpsiteAddress");
    if (StoredSiteName && StoredSiteAddress) {
      setSiteName(StoredSiteName);
      setSiteAddress(StoredSiteAddress);
    }
  }, [siteName, siteAddress]);

  // update sessionStoreage when siteName and SiteAddress changes
  useEffect(() => {
    sessionStorage.setItem("WPsiteName", siteName);
    sessionStorage.setItem("WpsiteAddress", siteAddress);
  },);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // This line now prevents the page reload.

    if (!siteName || siteName.trim() === "") {
      setError("You must provide the WordPress site name!");
      return;
    }

    if (!siteAddress || siteAddress.trim() === "") {
      setError("You must provide the WordPress site address!");
      return;
    } else {
      setError("");
      sessionStorage.setItem("WPsiteName", siteName);
      sessionStorage.setItem("WpsiteAddress", siteAddress);
      route.push("/download-import");
    }
  };

  return (
    <div className="font-[family-name:var(--font-geist-sans)] lg:max-w-[600px] mx-auto">
      {/* Progress bar at 50% */}
      <ProgressBar steps={5} currentStep={3} />
      <div className="flex flex-col items-center justify-center mt-14">
        <h2 className="font-medium text-lg text-center">
          We need a few details about your WordPress site
        </h2>
        <p className="text-[12px] font-light text-center mt-2">
          We need this information to structure the Shopify blog data in a
          WordPress-compatible format, enabling smooth content import/export
          between the two platforms.
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="mt-7 flex flex-col gap-4 items-center justify-center">
          <div className="flex flex-col gap-3 w-full md:w-[300px]">
            <label className="text-[15px] w-full text-center md:text-start">
              WordPress Site Title:
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Ex: My WordPress Site"
              className="ring-0 text-[14px] w-full text-gray-600 border-b-[1px] border-transparent focus:outline-none mt-[3px] focus:ring-0 focus:border-teal-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-3 w-full md:w-[300px]">
            <label className="text-[15px] w-full text-center md:text-start">
              WordPress Site Address:
            </label>
            <input
              type="text"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Without http or https: "
              className="ring-0 border-b-[1px] text-gray-600 text-[14px] border-transparent focus:outline-none mt-[3px] focus:ring-0 focus:border-teal-500 transition-colors w-full"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col md:flex-row gap-6 items-center justify-center">
          <Link href={"/convert"}>
            <Button className="px-10 py-2 flex items-center space-x-2 group">
              <ArrowLeft className="transform transition-transform duration-300 group-hover:translate-x-[-8px] w-6 h-4" />
              <span>Previous</span>
            </Button>
          </Link>
          <Button
            type="submit"
            className="px-10 py-2 flex items-center space-x-2 group"
          >
            <span>Next</span>
            <ArrowRight className="transform transition-transform duration-300 group-hover:translate-x-2 w-6 h-4" />
          </Button>
        </div>
        <div className="min-h-[40px] my-2 flex flex-row items-center justify-center text-center text-[13px] text-red-400 mt-7">
          {error ? <p className="">{error}</p> : null}
        </div>
      </form>
    </div>
  );
};

export default WPChannel;
