// src/components/StatementPrint.jsx
"use client";

export default function StatementPrint({
  selectedMonth,
  expenses,
  totalAmount,
  effectiveOwnerCount,
  sharePerOwner,
  owners,
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Trigger Button (Visible on Dashboard, hidden when printing) */}
      <button
        type="button"
        onClick={handlePrint}
        className="print:hidden inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
        title="Export or print statement"
      >
        <svg
          className="h-3.5 w-3.5 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        Download / Print PDF
      </button>

      {/* Hidden Statement Container (Only rendered when Print dialog opens) */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans z-[9999]">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              HomeBilling Statement
            </h1>
            <p className="text-sm text-gray-600">
              Shared Building Utility & Maintenance Report
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-800">{selectedMonth}</p>
            <p className="text-xs text-gray-500">
              Generated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 border border-gray-300 rounded p-4 bg-gray-50">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Total Building Cost
            </p>
            <p className="text-xl font-bold">
              ৳ {totalAmount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Total Active Units
            </p>
            <p className="text-xl font-bold">{effectiveOwnerCount} Owners</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Individual Share
            </p>
            <p className="text-xl font-bold text-blue-700">৳ {sharePerOwner}</p>
          </div>
        </div>

        {/* Itemized Expenses Table */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2 border-b pb-1 text-gray-700">
            1. Itemized Expenses Breakdown
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-300 text-gray-600">
                <th className="py-2">Billing Sector</th>
                <th className="py-2">Description / Meter Details</th>
                <th className="py-2 text-right">Total Amount</th>
                <th className="py-2 text-right">Share per Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 font-medium">
                    {item.category} {item.isRecurring && "(Fixed Recurring)"}
                  </td>
                  <td className="py-2 text-gray-600">
                    {item.note || "Standard Bill"}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    ৳ {item.amount.toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    ৳ {(item.amount / effectiveOwnerCount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Registered Owners Allocation */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2 border-b pb-1 text-gray-700">
            2. Owner Dues Schedule
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-300 text-gray-600">
                <th className="py-2">Flat / Unit</th>
                <th className="py-2">Owner Name</th>
                <th className="py-2 text-right">Allocated Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {owners.map((owner) => (
                <tr key={owner.id}>
                  <td className="py-2 font-medium">
                    {owner.flatNumber || "Unassigned"}
                  </td>
                  <td className="py-2">{owner.name || owner.email}</td>
                  <td className="py-2 text-right font-semibold">
                    ৳ {sharePerOwner}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>
            Please clear your monthly utility share via Stripe online checkout
            or direct handover to the building admin.
          </p>
        </div>
      </div>
    </>
  );
}
