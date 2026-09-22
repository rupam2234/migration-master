import { useState } from "react";
import {
  type CheckoutMeta,
  type PaymentData,
} from "./export-config";
import { checkExportEligibility } from "./export-api";

export type UseExportCheckoutArgs = {
  activeProject: string | null;
  /** Uppercase resource key; IMAGES is billed as MEDIA_LIBRARY. */
  billingResource: string;
  selectedIds: string[];
  /** Starts the server-side export pipeline (called after a free/owned gate). */
  runPipeline: () => Promise<void>;
};

/**
 * Payment gate for the export CTA.
 *
 * Owns everything between "user clicked Generate" and "pipeline starts":
 * eligibility check, modal visibility, checkout metadata, and payment
 * verification. The pipeline itself lives in {@link useExportPipeline}.
 */
export function useExportCheckout({
  activeProject,
  billingResource,
  selectedIds,
  runPipeline,
}: UseExportCheckoutArgs) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newItemIds, setNewItemIds] = useState<string[]>([]);
  const [checkoutMeta, setCheckoutMeta] = useState<CheckoutMeta | null>(null);
  const [checking, setChecking] = useState(false);

  /**
   * Payment gate: decides free vs paid before starting the pipeline.
   * Everything already owned re-runs the pipeline immediately; anything new
   * opens the checkout modal with the fresh ids.
   */
  const startExport = async () => {
    if (!activeProject) return;

    setChecking(true);

    try {
      const itemIds = selectedIds;

      if (itemIds.length === 0) {
        setNewItemIds([]);
        setShowPaymentModal(true);
        return;
      }

      const eligibility = await checkExportEligibility({
        shopDomain: activeProject,
        resource: billingResource,
        itemIds,
      });

      if (eligibility.allOwned) {
        await runPipeline();
        return;
      }

      setNewItemIds(eligibility.newItemIds);
      setCheckoutMeta({
        currency: eligibility.currency,
        exchangeRate: eligibility.exchangeRate,
        freeDownloadsUsed: eligibility.freeDownloadsUsed,
        freeDownloadsLimit: eligibility.freeDownloadsLimit,
        eligibleForFree: eligibility.eligibleForFree,
      });
      setShowPaymentModal(true);
    } finally {
      setChecking(false);
    }
  };

  /** Verifies the payment server-side, then starts the export pipeline. */
  const handlePaymentSuccess = async (paymentData?: PaymentData) => {
    const res = await fetch("/api/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });

    if (!res.ok) {
      console.error("Payment verification failed");
      return;
    }

    setShowPaymentModal(false);

    // Brief pause to let the verified payment propagate server-side before
    // the import generation reads it. Awaited (not fire-and-forget) so
    // ordering is guaranteed.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await runPipeline();
  };

  const closePaymentModal = () => setShowPaymentModal(false);

  return {
    showPaymentModal,
    newItemIds,
    checkoutMeta,
    checking,
    startExport,
    handlePaymentSuccess,
    closePaymentModal,
  };
}

