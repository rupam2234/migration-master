"use client";

import { useEffect, useState } from "react";
import ProgressBar from "@/components/custom-elements/progressbar"; // Keep the original ProgressBar
import { Button } from "@/components/ui/button";
import { ArrowLeft, DownloadIcon } from "lucide-react";
import Link from "next/link";
import generateWXR from "@/components/utils/generateWXRforWP";
import SocialShareCard from "@/components/custom-elements/socialShare";

const DownloadImport = () => {
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReadyForDownload, setIsReadyForDownload] = useState(false);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [jsonData, setJsonData] = useState<any>();
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [wxrUrl, setWxrUrl] = useState<string | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const jsonDataString = sessionStorage.getItem("resultJson") || "{}";
      const storedJsonData = jsonDataString ? JSON.parse(jsonDataString) : {};
      const storedWpSiteName = sessionStorage.getItem("WPsiteName") || "";
      const storedWpSiteAddress = sessionStorage.getItem("WpsiteAddress") || "";
      setJsonData(storedJsonData);
      setSiteName(storedWpSiteName);
      setSiteAddress(storedWpSiteAddress);
    }
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setIsReadyForDownload(false);

    try {
      // Simulate progress update
      const totalSteps = 100;
      for (let i = 0; i <= totalSteps; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        setProgress((i / totalSteps) * 100);
      }

      // Generate WXR data
      const wxrData = generateWXR(jsonData, siteName, siteAddress);

      // Create a Blob from the WXR data
      const blob = new Blob([wxrData], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      setWxrUrl(url); // Store the blob URL for downloading
      setIsReadyForDownload(true); // File is ready to download
    } catch (error) {
      console.error("Failed to generate WXR file", error);
      setError("Failed to generate WXR file");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    setShowShareCard(true); // Show the social share card
  };

  const handleShare = () => {
    if (wxrUrl) {
      const a = document.createElement("a");
      a.href = wxrUrl;
      a.download = "ShopifyToWpImport.xml";
      a.click();
      URL.revokeObjectURL(wxrUrl);
      setShowShareCard(false); // Hide the share card after sharing
      sessionStorage.clear();
    }
  };

  const handleCancel = () => {
    setShowShareCard(false); // Hide the share card without sharing
  };

  return (
    <div className="font-[family-name:var(--font-geist-sans)] lg:max-w-[600px] mx-auto">
      <ProgressBar steps={5} currentStep={4} />
      <div className="flex flex-col items-center justify-center mt-14">
        {!isReadyForDownload ? (
          <h2 className="font-medium text-sm text-center">
            Let&apos;s generate your WordPress XML file. Shall we?
          </h2>
        ) : (
          <h2 className="font-medium text-sm text-center">
            Your import file is READY. Download and import to WordPress :D
          </h2>
        )}
        <div></div>
      </div>
      {/* New Progress Indicator for file generation */}
      {isGenerating && (
        <div className="mt-5 w-full">
          <div className="bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-2 text-center">
            {Math.round(progress)}% Complete
          </p>
        </div>
      )}
      <div className="mt-10 flex flex-col md:flex-row gap-6 items-center justify-center">
        <Link href={"/wp-channels"}>
          <Button className="px-10 py-2 flex items-center space-x-2 group">
            <ArrowLeft className="transform transition-transform duration-300 group-hover:translate-x-[-8px] w-6 h-4" />
            <span>Previous</span>
          </Button>
        </Link>
        {!isReadyForDownload ? (
          <Button
            className="px-10 py-2 flex items-center space-x-2 group bg-[#76C7C0] hover:bg-[#62e75f]"
            onClick={handleGenerate}
            disabled={isGenerating} // Disable button while generating
          >
            {isGenerating ? "Generating..." : "Generate WordPress Import"}
          </Button>
        ) : (
          <Button
            className="px-10 py-2 flex items-center space-x-2 group bg-blue-500 hover:bg-blue-400"
            onClick={handleDownload}
          >
            <span>Download WordPress XML</span>
            <DownloadIcon className="w-6 h-4" />
          </Button>
        )}
      </div>
      <div className="min-h-[40px] flex flex-row items-center justify-center text-center text-[13px] text-red-500 mt-7">
        {error ? <p>{error}</p> : null}
      </div>
      {showShareCard && (
        <SocialShareCard onShare={handleShare} onCancel={handleCancel} />
      )}
    </div>
  );
};

export default DownloadImport;
