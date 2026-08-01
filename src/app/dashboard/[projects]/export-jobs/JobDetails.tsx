import { GlobalLoader } from "@/components";
import { useEffect, useState, useRef } from "react";

interface CouponInfo {
  code: string;
  discount: number;
}

interface JobDetail {
  id: string;
  exportedItemCount: number;
  coupon: CouponInfo | null;
  billingUrl: string;
  paymentId?: string;
}
const useJobDetailCache = () => {
  const cacheRef = useRef<Map<string, JobDetail>>(new Map());
  const get = (key: string) => {
    const map = cacheRef.current;
    const value = map.get(key);
    if (value) {
      // Refresh order for LRU
      map.delete(key);
      map.set(key, value);
    }
    return value;
  };

  const set = (key: string, value: JobDetail) => {
    const map = cacheRef.current;
    if (map.has(key)) map.delete(key);
    map.set(key, value);
    // Evict oldest if over limit
    if (map.size > 5) {
      const oldestKey = map.keys().next().value;
      oldestKey && map.delete(oldestKey);
    }
  };
  return { get, set };
};

export default function JobDetails({
  jobId,
  shopDomain,
}: {
  jobId: string;
  shopDomain: string;
}) {
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { get, set } = useJobDetailCache();

  useEffect(() => {
    async function fetchDetail() {
      const cached = get(jobId);
      if (cached) {
        setDetail(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/export-jobs/${jobId}?id=${jobId}`, {
          headers: { shop: shopDomain },
        });
        const data = await res.json();
        setDetail(data);
        set(jobId, data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [jobId, shopDomain, get, set]);

  if (loading) {
    return <GlobalLoader />;
  }

  if (!detail) {
    return <div className="p-4 text-gray-500">Failed to load details.</div>;
  }

  return (
    <div className="p-4 rounded-lg border border-primary/10 bg-white shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-primary/80">
        Job Details
      </h3>
      <p className="text-sm">
        <strong>Exported Items:</strong> {detail.exportedItemCount}
      </p>

      <p className="text-sm mt-2">
        <strong>Coupon:</strong>
        {detail.coupon ? (
          <>
            {" "}
            {detail.coupon.code} ({detail.coupon.discount}% off)
          </>
        ) : (
          <> No coupon used</>
        )}
      </p>
      {detail.paymentId && (
        <p className="text-sm mt-2">
          <strong>Razorpay Payment ID:</strong> {detail.paymentId}
        </p>
      )}
    </div>
  );
}
