// src/components/ExpenseCharts.jsx
"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";

const PALETTE = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#64748B", // Slate
];

export default function ExpenseCharts({ expenses, totalAmount }) {
  // Aggregate expenses by category
  const categoryData = useMemo(() => {
    const map = {};
    expenses.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + (item.amount || 0);
    });

    return Object.entries(map).map(([name, value], index) => ({
      name,
      value,
      color: PALETTE[index % PALETTE.length],
    }));
  }, [expenses]);

  if (expenses.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 sm:p-6 backdrop-blur-md"
    >
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h2 className="text-base font-semibold text-white">
            Spending & Sector Analytics
          </h2>
          <p className="text-xs text-zinc-400">
            Interactive distribution of building expenditures
          </p>
        </div>
        <span className="text-xs font-medium text-zinc-400">
          Grand Total:{" "}
          <strong className="text-white">
            ৳ {totalAmount.toLocaleString()}
          </strong>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Sector Cost Comparison Bar Chart */}
        <div className="h-64 w-full">
          <p className="text-xs font-medium text-zinc-400 mb-2">
            Sector Spending Comparison (৳)
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="#71717a"
                fontSize={10}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis stroke="#71717a" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(val) => [`৳ ${val.toLocaleString()}`, "Cost"]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sector Percentage Pie Chart */}
        <div className="h-64 w-full flex flex-col items-center justify-center">
          <p className="text-xs font-medium text-zinc-400 mb-2 self-start">
            Percentage Allocation
          </p>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(val) => [
                  `৳ ${val.toLocaleString()} (${((val / totalAmount) * 100).toFixed(1)}%)`,
                  "Total",
                ]}
              />
              <Pie
                data={categoryData}
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`pie-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Clean Legend Badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-sm">
            {categoryData.map((item) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-1.5 text-[10px] text-zinc-300 bg-zinc-800/70 border border-zinc-700/50 px-2 py-0.5 rounded-full"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
