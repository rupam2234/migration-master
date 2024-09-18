"use client";

import ProgressBar from "@/components/custom-elements/progressbar";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const FirstStep = () => {
  const [shopName, setShopName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Retrieve value from sessionStorage when the component mounts
  useEffect(() => {
    const storedShopName = sessionStorage.getItem("shopName");
    if (storedShopName) {
      setShopName(storedShopName);
    }
  }, []);

  // Update sessionStorage whenever shopName changes
  useEffect(() => {
    sessionStorage.setItem("shopName", shopName);
  }, [shopName]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!shopName || shopName.trim() === "") {
      // display an error that shopename is empty
      setError("Please provide a Shopify store name.");

      return;
    }
    if (!shopName.includes(".myshopify.com")) {
      setError(
        "The store name should contain the '.myshopify.com' subdomain. Please recheck."
      );

      return;
    } else {
      // Clear any existing error
      setError("");

      // Save shopName to sessionStorage so it persists on the next page
      sessionStorage.setItem("shopName", shopName);
      router.push("/api-credentials");
    }
  }

  return (
    <div className="font-[family-name:var(--font-geist-sans)] lg:min-w-[600px]">
      {/* Progress bar at 50% */}
      <ProgressBar steps={5} currentStep={0} />
      <div className="flex flex-col items-center justify-center mt-14">
        <h2 className="font-medium text-lg text-center">
          Enter Your Shopify Store Name
        </h2>
        <p className="text-[12px] font-light text-center mt-2">
          The Shopify Store Name refers to the subdomain used in the default
          Shopify URL.
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="mt-7 flex gap-4 flex-col md:flex-row items-center justify-center">
          <label className="text-[15px]">Shopify Store Name:</label>
          <input
            type="text"
            value={shopName}
            onChange={(event) => setShopName(event.target.value)}
            placeholder="store.myshopify.com"
            autoComplete="on"
            className="ring-0 border-b-[1px] text-gray-600 border-transparent focus:outline-none mt-[-1px] focus:ring-0 focus:border-teal-500 transition-colors"
          ></input>
        </div>
        <div className="mt-7 flex flex-col items-center justify-center">
          <Button
            type="submit"
            className="px-10 py-2 flex items-center space-x-2 group"
          >
            <span>Next</span>
            <ArrowRight className="transform transition-transform duration-300 group-hover:translate-x-2 w-6 h-4" />
          </Button>
        </div>
        <div className="min-h-[40px] my-2 flex flex-row items-center justify-center text-center text-[13px] text-red-400 mt-7 ">
          {error ? <p className="">{error}</p> : null}
        </div>
      </form>
    </div>
  );
};

export default FirstStep;
