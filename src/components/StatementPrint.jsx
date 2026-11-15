// src/components/StatementPrint.jsx
"use client";

export default function StatementPrint({
  selectedMonth = "All Bills",
  bills = [],
  expenses = [],
  totalAmount = 0,
  owners = [],
}) {
  const handlePrint = () => {
    window.print();
  };

  // Use `bills` if passed, otherwise fall back to `expenses`
  const billItems = bills.length > 0 ? bills : expenses;

  // Calculate total units across all registered owners
  const totalBuildingUnits =
    owners.reduce((sum, o) => sum + (Number(o.units) || 1), 0) || 1;

  // Calculate overall rate per unit
  const totalRatePerUnit =
    totalBuildingUnits > 0 ? totalAmount / totalBuildingUnits : 0;

  return (
    <>
      {/* Trigger Button (Visible on Dashboard, hidden when printing) */}
      <button
        type="button"
        onClick={handlePrint}
        className="print:hidden inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
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
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans z-9999">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              HomeBilling Statement
            </h1>
            <p className="text-sm text-gray-600">
              Unit-Based Building Utility & Maintenance Report
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
              $
              {Number(totalAmount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Registered Ownership
            </p>
            <p className="text-xl font-bold">
              {owners.length} Owners ({totalBuildingUnits} Units)
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Base Rate Per Unit
            </p>
            <p className="text-xl font-bold text-blue-700">
              ${totalRatePerUnit.toFixed(2)} / unit
            </p>
          </div>
        </div>

        {/* 1. Itemized Bills Breakdown */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2 border-b pb-1 text-gray-700">
            1. Itemized Bills Breakdown
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-300 text-gray-600">
                <th className="py-2">Billing Sector</th>
                <th className="py-2">Bill Title</th>
                <th className="py-2 text-center">Total Units</th>
                <th className="py-2 text-right">Total Amount</th>
                <th className="py-2 text-right">Rate / Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {billItems.map((item) => {
                const amount = Number(item.totalAmount ?? item.amount ?? 0);
                const units = Number(item.totalUnits || totalBuildingUnits);
                const rate = Number(
                  item.costPerUnit ?? (units > 0 ? amount / units : 0),
                );

                return (
                  <tr key={item.id}>
                    <td className="py-2 font-medium">
                      {item.sector || item.category || "General"}
                    </td>
                    <td className="py-2 text-gray-600">
                      {item.title || item.note || "Building Bill"}
                    </td>
                    <td className="py-2 text-center text-gray-600">{units}</td>
                    <td className="py-2 text-right font-semibold">
                      ${amount.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">${rate.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 2. Unit-Based Owner Dues Schedule */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2 border-b pb-1 text-gray-700">
            2. Owner Unit Dues Schedule
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-300 text-gray-600">
                <th className="py-2">Flat / Unit</th>
                <th className="py-2">Owner Name</th>
                <th className="py-2 text-center">Units Owned</th>
                <th className="py-2 text-right">Total Share</th>
                <th className="py-2 text-right">Paid</th>
                <th className="py-2 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {owners.map((owner) => {
                const ownerUid = owner.uid || owner.id;
                const ownerUnits = Number(owner.units || 1);

                let ownerAllocated = 0;
                let ownerPaid = 0;

                if (bills.length > 0) {
                  // Calculate exact share from the `splits` array of each bill
                  bills.forEach((bill) => {
                    const split = bill.splits?.find((s) => s.uid === ownerUid);
                    if (split) {
                      const share = Number(split.shareAmount) || 0;
                      ownerAllocated += share;
                      if (split.status === "paid") {
                        ownerPaid += share;
                      }
                    }
                  });
                } else {
                  // Fallback if `bills` prop wasn't passed yet
                  ownerAllocated = totalRatePerUnit * ownerUnits;
                }

                const balanceDue = Math.max(0, ownerAllocated - ownerPaid);

                return (
                  <tr key={owner.id}>
                    <td className="py-2 font-medium">
                      {owner.flatNumber || "Owner Unit"}
                    </td>
                    <td className="py-2">{owner.name || owner.email}</td>
                    <td className="py-2 text-center">{ownerUnits}</td>
                    <td className="py-2 text-right font-semibold">
                      ${ownerAllocated.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-green-700">
                      ${ownerPaid.toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-bold">
                      ${balanceDue.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>
            Dues are calculated proportionally: (Total Bill ÷ Total Building
            Units) × Owner Units. Please clear any remaining balance via Stripe
            checkout or building admin verification.
          </p>
        </div>
      </div>
    </>
  );
}
