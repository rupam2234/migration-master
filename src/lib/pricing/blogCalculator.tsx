"use client";

import { useState } from "react";
import { calculateTieredPrice } from "./tiered";

const DISCOUNT = 0.15;

export default function PricingCalculator() {
  const [itemCount, setItemCount] = useState<number>(6000);

  const preDiscount = calculateTieredPrice(Math.max(0, itemCount || 0));
  const afterDiscount = preDiscount * (1 - DISCOUNT);

  return (
    <div className="rounded-lg border border-gray-200 p-6 my-6 bg-gray-50">
      <label
        htmlFor="itemCount"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Number of items to migrate
      </label>
      <input
        id="itemCount"
        type="number"
        min={1}
        value={itemCount}
        onChange={(e) => setItemCount(Number(e.target.value))}
        className="w-full sm:w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      />

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-md bg-white border border-gray-200 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Pre-discount
          </div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            ${preDiscount.toFixed(2)}
          </div>
        </div>
        <div className="rounded-md bg-white border border-orange-200 p-4">
          <div className="text-xs uppercase tracking-wide text-orange-600">
            After 15% discount (code SAVE15)
          </div>
          <div className="text-2xl font-semibold text-orange-700 mt-1">
            ${afterDiscount.toFixed(2)}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Based on published tiered rates: $0.10/item for the first 500 items,
        $0.035/item from 501&ndash;5,000, and $0.0266/item beyond that.
      </p>
    </div>
  );
}
