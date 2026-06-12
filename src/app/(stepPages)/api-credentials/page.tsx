"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProgressBar from "@/components/custom-elements/progressbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader } from "lucide-react";
import Link from "next/link";

const SecondStep = () => {
  const [apiKey, setApiKey] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [error, setError] = useState("");
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Retrieve the stored shop name from sessionStorage
  useEffect(() => {
    // Check if window and sessionStorage are available
    if (typeof window !== "undefined") {
      const storedShopName = sessionStorage.getItem("shopName");
      if (storedShopName) {
        setShopName(storedShopName);
      }
    }
  }, []);

  // Retrieve value from sessionStorage when the component mounts
  useEffect(() => {
    const storedApiKey = sessionStorage.getItem("apiKey");
    const storedapiPassword = sessionStorage.getItem("AccessToken");
    if (storedApiKey && storedapiPassword) {
      setApiKey(storedApiKey);
      setApiPassword(storedapiPassword);
    }
  }, []);

  // Update sessionStorage whenever APIkey and APIPass changes
  useEffect(() => {
    sessionStorage.setItem("apiKey", apiKey);
    sessionStorage.setItem("AccessToken", apiPassword);
  }, [apiKey, apiPassword]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!apiKey || apiKey.trim() === "") {
      setError("Please provide your Shopify Admin API key.");
      return;
    }

    if (!apiPassword || apiPassword.trim() === "") {
      setError("Please provide your Shopify Admin API access token.");
      return;
    }

    // if (!apiPassword.includes("shpat_")) {
    //   setError(
    //     "The Shopify Admin API access token should start with the 'shpat_'. Please recheck."
    //   );
    //   return;
    // } else {
    setError("");

    if (sessionStorage.getItem("resultJson")) {
      router.push("/convert");
      return;
    } else {
      setLoading(true); // Start loading

      // Save shopName to sessionStorage so it persists on the next page
      sessionStorage.setItem("apiKey", apiKey);
      sessionStorage.setItem("AccessToken", apiPassword);

      // Send the credentials to the server
      const response = await fetch("/api/fetchPosts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName, apiKey, apiPassword }),
      });

      if (response.ok) {
        // Handle JSON response
        const data = await response.json();
        sessionStorage.setItem("resultJson", JSON.stringify(data));

        // // Process the JSON data (e.g., generate a downloadable file or display it)
        // const blob = new Blob([JSON.stringify(data, null, 2)], {
        //   type: "application/json",
        // });
        // const url = URL.createObjectURL(blob);

        // // Create a download link for the JSON file
        // const a = document.createElement("a");
        // a.href = url;
        // a.download = "blogPosts.json";
        // a.click();

        router.push("/convert");
        setLoading(false); // Stop loading
      } else {
        console.log("Failed to fetch blog posts");
      }
    }
  };

  return (
    <div className="font-[family-name:var(--font-geist-sans)] lg:max-w-[600px] mx-auto">
      {/* Progress bar at 50% */}
      <ProgressBar steps={5} currentStep={1} />
      <div className="flex flex-col items-center justify-center mt-14">
        <h2 className="font-medium text-lg text-center">
          Enter Your Shopify API Credentials
        </h2>
        <p className="text-[12px] font-light text-center mt-2">
          Refer to{" "}
          <Link
            href="/#"
            rel="nofollow"
            target="_blank"
            className="text-blue-600 hover:text-blue-500"
          >
            this guide
          </Link>{" "}
          to obtain your Shopify store API credentials. Please note that your
          keys are used solely for establishing a connection with your Shopify
          store. For security reasons, we do not have visibility into the keys
          as they are encrypted immediately.
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="mt-7 flex flex-col gap-4 items-center justify-center">
          <div className="flex flex-col gap-3 w-full md:w-[300px]">
            <label className="text-[15px] w-full text-center md:text-start">
              API Key:
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="your shopify admin api key"
              className="ring-0 text-[14px] w-full text-gray-600 border-b-[1px] border-transparent focus:outline-none mt-[3px] focus:ring-0 focus:border-teal-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-3 w-full md:w-[300px]">
            <label className="text-[15px] w-full text-center md:text-start">
              Admin API access token:
            </label>
            <input
              type="text"
              value={apiPassword}
              onChange={(e) => setApiPassword(e.target.value)}
              placeholder="shpat_shopify admin access token"
              className="ring-0 border-b-[1px] text-gray-600 text-[14px] border-transparent focus:outline-none mt-[3px] focus:ring-0 focus:border-teal-500 transition-colors w-full"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col md:flex-row gap-6 items-center justify-center">
          <Link href={"/"}>
            <Button className="px-10 py-2 flex items-center space-x-2 group">
              <ArrowLeft className="transform transition-transform duration-300 group-hover:translate-x-[-8px] w-6 h-4" />
              <span>Previous</span>
            </Button>
          </Link>
          <Button
            type="submit"
            className="px-10 py-2 flex items-center space-x-2 group"
            disabled={loading} // Disable button during loading
          >
            <span>Next</span>
            {!loading ? (
              <ArrowRight className="transform transition-transform duration-300 group-hover:translate-x-2 w-6 h-4" />
            ) : (
              <Loader className="animate-spin w-6 h-6" /> // Show loader icon while loading
            )}
          </Button>
        </div>
        <div className="min-h-[40px] my-2 flex flex-row items-center justify-center text-center text-[13px] text-red-400 mt-7">
          {error ? <p className="">{error}</p> : null}
        </div>
      </form>
    </div>
  );
};

export default SecondStep;
