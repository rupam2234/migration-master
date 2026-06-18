"use client";

import { WPSettingsProps } from "@/app/api/db/wp-settings/set/route";
import { useProjectContext } from "@/context";
import { useEffect, useState } from "react";

type Erros = {
  siteUrlError: string;
  defaultAuthorError: string;
  defaultWx: string;
};

export default function ImportSettings() {
  const [isSubmitting, setSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Erros>({
    defaultAuthorError: "",
    defaultWx: "",
    siteUrlError: "",
  });
  const { activeProject, wpImportSettings, setWpImportntSettings } =
    useProjectContext();

  useEffect(() => {
    const fetchWpSettings = async () => {
      if (!activeProject) return;

      const res = await fetch("/api/db/wp-settings/get", {
        headers: {
          "Content-Type": "application/json",
          domain: activeProject,
        },
      });

      if (!res.ok) {
        const errorMessage = await res.json();
        console.error(errorMessage);
      }

      const data = await res.json();

      setWpImportntSettings({
        siteUrl: data.data.siteUrl,
        defaultAuthor: data.data.defaultAuthor,
        wxrVersion: data.data.wxrVersion,
      });
    };

    fetchWpSettings();
  }, [activeProject]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const siteUrlError = checkSiteUrl(wpImportSettings.siteUrl);

      if (siteUrlError) {
        setErrors({
          siteUrlError,
          defaultAuthorError: "",
          defaultWx: "",
        });

        return;
      }

      setErrors({
        siteUrlError: "",
        defaultAuthorError: "",
        defaultWx: "",
      });

      const data: WPSettingsProps = {
        shopify_domain: activeProject,
        wp_settings: wpImportSettings,
      };

      const res = await fetch("/api/db/wp-settings/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message ?? "Something went wrong");
      }
    } catch (error: any) {
      console.error(error.message ?? "Something went wrong saving settings");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-5 text-sm">
        <h2 className="font-semibold capitalize">Import Settings</h2>
        <p className="text-primary/70 mt-1">
          Configure how your WordPress import file (WXR) is generated.
        </p>
      </div>
      <form
        className="text-md max-w-sm space-y-5"
        noValidate
        onSubmit={handleSubmit}
      >
        <div>
          <label className="text-sm font-medium text-primary/80">
            WordPress Site URL
          </label>
          <input
            disabled={isSubmitting}
            onChange={(e) =>
              setWpImportntSettings((prev) => ({
                ...prev,
                siteUrl: e.target.value,
              }))
            }
            placeholder="https://wp-site.com"
            value={wpImportSettings.siteUrl}
            type="text"
            className="px-2 py-1 text-sm rounded-sm border border-primary/20 w-full focus:outline-none focus:ring-0 focus-visible:ring-0"
          />
          {errors && errors.siteUrlError ? (
            <p className="text-xs text-red-500 mt-2">{errors.siteUrlError}</p>
          ) : (
            <p className="text-xs text-primary/60 mt-2">
              The WordPress site where your are importing the shopify exports.
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-primary/80">
            Default author
          </label>
          <input
            placeholder="Admin"
            onChange={(e) =>
              setWpImportntSettings((prev) => ({
                ...prev,
                defaultAuthor: e.target.value,
              }))
            }
            value={wpImportSettings ? wpImportSettings.defaultAuthor : ""}
            type="text"
            className="px-2 py-1 text-sm rounded-sm border border-primary/20 w-full focus:outline-none focus:ring-0 focus-visible:ring-0"
          />
          {errors && errors.defaultAuthorError ? (
            <p className="text-xs text-red-500 mt-2">
              {errors.defaultAuthorError}
            </p>
          ) : (
            <p className="text-xs text-primary/60 mt-2">
              Author posts and pages will be attributed to. Keep default to
              &quot;admin&quot; (recommanded).
            </p>
          )}
        </div>
        {/* <div>
          <label className="text-sm font-medium text-primary/80">
            WXR Version
          </label>
          <input
            placeholder="1.2"
            value={wpImportSettings ? wpImportSettings.wxrVersion : ""}
            type="text"
            className="px-2 py-1 text-sm rounded-sm border border-primary/20 w-full focus:outline-none focus:ring-0 focus-visible:ring-0"
          />
          {errors && errors.defaultWx ? (
            <p className="text-xs text-red-500 mt-2">{errors.defaultWx}</p>
          ) : (
            <p className="text-xs text-primary/60 mt-2">
              WordPress export schema version. Defaults to "1.2" if left blank.
            </p>
          )}
        </div> */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 flex items-center gap-2 cursor-pointer hover:bg-blue-600 text-primary-foreground text-sm rounded-sm px-2 py-1"
        >
          {isSubmitting ? "Saving..." : "Save settings"}
        </button>
      </form>
    </>
  );
}

function checkSiteUrl(url: string): string | null {
  if (!url.trim()) {
    return "Site URL is required";
  }

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "URL must start with http:// or https://";
    }

    return null;
  } catch {
    return "Please enter a valid URL";
  }
}
