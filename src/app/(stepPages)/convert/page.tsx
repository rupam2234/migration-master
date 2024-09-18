"use client";

import ProgressBar from "@/components/custom-elements/progressbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SetStateAction, useState } from "react";

const ConvertJson = () => {
  const [selectedSVG, setSelectedSVG] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Array of services and names
  const serviceArray = [
    {
      svg: (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            {" "}
            <circle cx="16" cy="16" r="14" fill="#028CB0"></circle>{" "}
            <path
              d="M6.45538 16C6.45538 19.7823 8.65538 23.04 11.8369 24.5885L7.28462 12.1162C6.73798 13.338 6.45541 14.6615 6.45538 16ZM16 25.5446C17.1085 25.5446 18.1746 25.35 19.1731 25.0031L19.1054 24.8762L16.1692 16.8377L13.3092 25.1554C14.1554 25.4092 15.0608 25.5446 16 25.5446ZM17.3115 11.5238L20.7638 21.7877L21.72 18.6062C22.1262 17.2862 22.4392 16.3385 22.4392 15.5177C22.4392 14.3331 22.0162 13.5208 21.6608 12.8946C21.17 12.0992 20.7215 11.4308 20.7215 10.6523C20.7215 9.77231 21.3815 8.96 22.3292 8.96H22.4477C20.689 7.34546 18.3874 6.45141 16 6.45538C14.4192 6.45509 12.8632 6.84777 11.4718 7.59809C10.0805 8.34842 8.89746 9.43285 8.02923 10.7538L8.63846 10.7708C9.63692 10.7708 11.1769 10.6438 11.1769 10.6438C11.7015 10.6185 11.7608 11.3715 11.2446 11.4308C11.2446 11.4308 10.7285 11.4985 10.1446 11.5238L13.6308 21.8638L15.7208 15.6023L14.2315 11.5238C13.898 11.5054 13.565 11.4772 13.2331 11.4392C12.7169 11.4054 12.7762 10.6185 13.2923 10.6438C13.2923 10.6438 14.8662 10.7708 15.8054 10.7708C16.8038 10.7708 18.3438 10.6438 18.3438 10.6438C18.86 10.6185 18.9277 11.3715 18.4115 11.4308C18.4115 11.4308 17.8954 11.49 17.3115 11.5238ZM20.7977 24.25C22.2416 23.4104 23.4399 22.2066 24.2729 20.7589C25.1059 19.3112 25.5444 17.6703 25.5446 16C25.5446 14.3415 25.1215 12.7846 24.3769 11.4223C24.5281 12.9211 24.3012 14.4339 23.7169 15.8223L20.7977 24.25ZM16 27C13.0826 27 10.2847 25.8411 8.22183 23.7782C6.15893 21.7153 5 18.9174 5 16C5 13.0826 6.15893 10.2847 8.22183 8.22183C10.2847 6.15893 13.0826 5 16 5C18.9174 5 21.7153 6.15893 23.7782 8.22183C25.8411 10.2847 27 13.0826 27 16C27 18.9174 25.8411 21.7153 23.7782 23.7782C21.7153 25.8411 18.9174 27 16 27Z"
              fill="white"
            ></path>{" "}
          </g>
        </svg>
      ),
      name: "WordPress",
    },
    {
      svg: (
        <svg
          viewBox="0 0 20 20"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          fill="#000000"
        >
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            {" "}
            <g id="layer1">
              {" "}
              <path d="M 3 0 L 3 12 L 4 12 L 4 1 L 12 1 L 12 4 L 12 5 L 16 5 L 16 12 L 17 12 L 17 5 L 17 4 L 13 0 L 12 0 L 3 0 z M 13 1.3535156 L 15.646484 4 L 13 4 L 13 1.3535156 z M 4 13 L 4 16 L 3.9921875 16.130859 L 3.9667969 16.257812 L 3.9238281 16.382812 L 3.8652344 16.5 L 3.7929688 16.607422 L 3.7070312 16.707031 L 3.609375 16.792969 L 3.5 16.865234 L 3.3828125 16.923828 L 3.2597656 16.964844 L 3.1308594 16.992188 L 3 17 L 2.8691406 16.992188 L 2.7402344 16.964844 L 2.6171875 16.923828 L 2.5 16.865234 L 2.390625 16.792969 L 2.2929688 16.707031 L 2.2070312 16.607422 L 2.1347656 16.5 L 2.0761719 16.382812 L 2.0332031 16.257812 L 2.0078125 16.130859 L 2 16 L 1 16 L 1.0078125 16.183594 L 1.0351562 16.367188 L 1.0761719 16.546875 L 1.1347656 16.722656 L 1.2089844 16.890625 L 1.3007812 17.052734 L 1.4042969 17.205078 L 1.5214844 17.347656 L 1.6523438 17.478516 L 1.7949219 17.595703 L 1.9472656 17.699219 L 2.1074219 17.791016 L 2.2773438 17.865234 L 2.453125 17.923828 L 2.6328125 17.964844 L 2.8164062 17.992188 L 3 18 L 3.1835938 17.992188 L 3.3671875 17.964844 L 3.546875 17.923828 L 3.7226562 17.865234 L 3.8925781 17.791016 L 4.0527344 17.699219 L 4.2050781 17.595703 L 4.3476562 17.478516 L 4.4785156 17.347656 L 4.5957031 17.205078 L 4.6992188 17.052734 L 4.7910156 16.890625 L 4.8652344 16.722656 L 4.9238281 16.546875 L 4.9648438 16.367188 L 4.9921875 16.183594 L 5 16 L 5 13 L 4 13 z M 7.5 13 A 1.5 1.4999999 0 0 0 6 14.5 A 1.5 1.4999999 0 0 0 7.5 16 L 8.5 16 A 0.5 0.5 0 0 1 9 16.5 A 0.5 0.5 0 0 1 8.5 17 L 6 17 L 6 18 L 8.5 18 A 1.5 1.4999999 0 0 0 10 16.5 A 1.5 1.4999999 0 0 0 8.5 15 L 7.5 15 A 0.5 0.5 0 0 1 7 14.5 A 0.5 0.5 0 0 1 7.5 14 L 10 14 L 10 13 L 7.5 13 z M 13 13 L 12.816406 13.007812 L 12.632812 13.033203 L 12.453125 13.076172 L 12.277344 13.134766 L 12.107422 13.208984 L 11.947266 13.298828 L 11.794922 13.404297 L 11.652344 13.521484 L 11.521484 13.652344 L 11.404297 13.794922 L 11.300781 13.947266 L 11.208984 14.107422 L 11.134766 14.277344 L 11.076172 14.451172 L 11.035156 14.632812 L 11.007812 14.816406 L 11 15 L 11 16 L 11.007812 16.183594 L 11.035156 16.367188 L 11.076172 16.546875 L 11.134766 16.722656 L 11.208984 16.890625 L 11.300781 17.052734 L 11.404297 17.205078 L 11.521484 17.347656 L 11.652344 17.478516 L 11.794922 17.595703 L 11.947266 17.699219 L 12.107422 17.791016 L 12.277344 17.865234 L 12.453125 17.923828 L 12.632812 17.964844 L 12.816406 17.992188 L 13 18 L 13.183594 17.992188 L 13.367188 17.964844 L 13.546875 17.923828 L 13.722656 17.865234 L 13.892578 17.791016 L 14.052734 17.699219 L 14.205078 17.595703 L 14.347656 17.478516 L 14.478516 17.347656 L 14.595703 17.205078 L 14.699219 17.052734 L 14.791016 16.890625 L 14.865234 16.722656 L 14.923828 16.546875 L 14.964844 16.367188 L 14.992188 16.183594 L 15 16 L 15 15 L 14.992188 14.816406 L 14.964844 14.632812 L 14.923828 14.451172 L 14.865234 14.277344 L 14.791016 14.107422 L 14.699219 13.947266 L 14.595703 13.794922 L 14.478516 13.652344 L 14.347656 13.521484 L 14.205078 13.404297 L 14.052734 13.298828 L 13.892578 13.208984 L 13.722656 13.134766 L 13.546875 13.076172 L 13.367188 13.033203 L 13.183594 13.007812 L 13 13 z M 16.513672 13 A 0.50005 0.50005 0 0 0 16 13.5 L 16 18 L 17 18 L 17 15.001953 L 19.099609 17.800781 A 0.50005 0.50005 0 0 0 20 17.5 L 20 13 L 19 13 L 19 15.998047 L 16.900391 13.199219 A 0.50005 0.50005 0 0 0 16.513672 13 z M 13 14 L 13.130859 14.007812 L 13.259766 14.033203 L 13.382812 14.076172 L 13.5 14.134766 L 13.609375 14.207031 L 13.707031 14.292969 L 13.792969 14.390625 L 13.865234 14.5 L 13.923828 14.617188 L 13.966797 14.740234 L 13.992188 14.869141 L 14 15 L 14 16 L 13.992188 16.130859 L 13.966797 16.257812 L 13.923828 16.382812 L 13.865234 16.5 L 13.792969 16.607422 L 13.707031 16.707031 L 13.609375 16.792969 L 13.5 16.865234 L 13.382812 16.923828 L 13.259766 16.964844 L 13.130859 16.992188 L 13 17 L 12.869141 16.992188 L 12.740234 16.964844 L 12.617188 16.923828 L 12.5 16.865234 L 12.390625 16.792969 L 12.292969 16.707031 L 12.207031 16.607422 L 12.134766 16.5 L 12.076172 16.382812 L 12.033203 16.257812 L 12.007812 16.130859 L 12 16 L 12 15 L 12.007812 14.869141 L 12.033203 14.740234 L 12.076172 14.617188 L 12.134766 14.5 L 12.207031 14.390625 L 12.292969 14.292969 L 12.390625 14.207031 L 12.5 14.134766 L 12.617188 14.076172 L 12.740234 14.033203 L 12.869141 14.007812 L 13 14 z M 3 19 L 3 20 L 17 20 L 17 19 L 16 19 L 4 19 L 3 19 z "></path>{" "}
            </g>{" "}
          </g>
        </svg>
      ),
      name: "JSON",
    },
  ];

  // Function to handle selection
  const handleSelect = (name: SetStateAction<string>) => {
    setSelectedSVG(name);
  };

  const handleOnClick = () => {
    if (!selectedSVG) {
      setError("You must select a type of import file you want to generate!");
    } else {
      sessionStorage.setItem("downloadImportType", selectedSVG);
      if (selectedSVG === "WordPress") {
        router.push("/wp-channels");
      } else {
        router.push("/download-import");
      }
    }
  };

  return (
    <div className="font-[family-name:var(--font-geist-sans)] lg:max-w-[600px] mx-auto">
      {/* Progress bar at 50% */}
      <ProgressBar steps={5} currentStep={2} />
      <div className="flex flex-col items-center justify-center mt-14">
        <h2 className="font-medium text-lg text-center">
          Generate your import file for one of the platforms
        </h2>
        <p className="text-[12px] font-light text-center mt-2">
          Select one of the platforms below to generate the import file for. We
          already have the export data and can convert it into a format
          compatible with your chosen platform. Alternatively, you can download
          the raw JSON file we've obtained from Shopify.
        </p>
      </div>
      <div className="flex flex-col gap-4 mt-9 items-center justify-center">
        <div className="flex flex-wrap md:flex-row flex-col gap-4">
          {serviceArray.map((item, index) => (
            <div
              key={index}
              className={`relative cursor-pointer transition-transform transform hover:scale-105 ${
                selectedSVG === item.name ? "selected" : ""
              }`}
              onClick={() => handleSelect(item.name)}
            >
              {/* SVG */}
              <div className="w-20 h-20 flex p-2 items-center justify-center rounded-lg border border-gray-300">
                {item.svg}
              </div>

              {/* Overlay and Tickmark */}
              {selectedSVG === item.name && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-white w-6 h-6" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[40px] my-2">
          {/* Display selected value */}
          {selectedSVG && (
            <div className="mt-4 text-[14px] text-center">
              <p>
                You've selected {selectedSVG}. On the next page, you'll download
                the {selectedSVG} import file.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-10 flex flex-col md:flex-row gap-6 items-center justify-center">
        <Link href={"/api-credentials"}>
          <Button className="px-10 py-2 flex items-center space-x-2 group">
            <ArrowLeft className="transform transition-transform duration-300 group-hover:translate-x-[-8px] w-6 h-4" />
            <span>Previous</span>
          </Button>
        </Link>
        <Button
          type="submit"
          className="px-10 py-2 flex items-center space-x-2 group"
          onClick={handleOnClick}
        >
          <span>Next</span>
          <ArrowRight className="transform transition-transform duration-300 group-hover:translate-x-2 w-6 h-4" />
        </Button>
      </div>
      <div className="min-h-[40px] flex flex-row items-center justify-center text-center text-[13px] text-red-500 mt-7">
        {error ? <p className="">{error}</p> : null}
      </div>
    </div>
  );
};

export default ConvertJson;
