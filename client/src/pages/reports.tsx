import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, BarChart3, PieChart, Filter } from "lucide-react";
import { useLocation } from "wouter";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { VoucherWithExpenses } from "@shared/schema";
import {
  format,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  subMonths,
  subYears,
} from "date-fns";

const TRANSPORT_COLORS = {
  bus: "#3B82F6", // blue-500
  train: "#10B981", // green-500
  cab: "#F59E0B", // amber-500
  auto: "#EF4444", // red-500
  fuel: "#F97316", // orange-500
  flight: "#8B5CF6", // violet-500
  parking: "#EC4899", // pink-500
  other: "#6B7280", // gray-500
};

type FilterType =
  | "all"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "thisYear"
  | "lastYear"
  | "specificVoucher";

export default function Reports() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(
    null
  );

  const { data: vouchers = [], isLoading } = useQuery<VoucherWithExpenses[]>({
    queryKey: ["vouchers"],
    queryFn: async () => {
      // Get the current session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("/api/vouchers", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vouchers: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result; // Handle both {data: [...]} and [...] formats
    },
  });

  // Filter vouchers based on selected filter
  const getFilteredVouchers = () => {
    const now = new Date();

    switch (filter) {
      case "thisMonth":
        return vouchers.filter((voucher) =>
          isWithinInterval(new Date(voucher.start_date), {
            start: startOfMonth(now),
            end: endOfMonth(now),
          })
        );
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        return vouchers.filter((voucher) =>
          isWithinInterval(new Date(voucher.start_date), {
            start: startOfMonth(lastMonth),
            end: endOfMonth(lastMonth),
          })
        );
      case "thisQuarter":
        return vouchers.filter((voucher) =>
          isWithinInterval(new Date(voucher.start_date), {
            start: startOfQuarter(now),
            end: endOfQuarter(now),
          })
        );
      case "thisYear":
        return vouchers.filter((voucher) =>
          isWithinInterval(new Date(voucher.start_date), {
            start: startOfYear(now),
            end: endOfYear(now),
          })
        );
      case "lastYear":
        const lastYear = subYears(now, 1);
        return vouchers.filter((voucher) =>
          isWithinInterval(new Date(voucher.start_date), {
            start: startOfYear(lastYear),
            end: endOfYear(lastYear),
          })
        );
      case "specificVoucher":
        return selectedVoucherId
          ? vouchers.filter((voucher) => voucher.id === selectedVoucherId)
          : [];
      default:
        return vouchers;
    }
  };

  const filteredVouchers = getFilteredVouchers();

  // Calculate voucher spending data
  const voucherSpendData = filteredVouchers.map((voucher) => ({
    name: voucher.name,
    amount: parseFloat(voucher.totalAmount),
    status: voucher.status,
  }));

  // Calculate transport type spending data
  const transportSpendData = Object.entries(TRANSPORT_COLORS)
    .map(([transport, color]) => {
      const totalSpent = filteredVouchers.reduce((total, voucher) => {
        const transportExpenses = voucher.expenses.filter(
          (expense) => expense.transport_type === transport
        );
        const transportTotal = transportExpenses.reduce(
          (sum, expense) => sum + parseFloat(expense.amount),
          0
        );
        return total + transportTotal;
      }, 0);

      return {
        name: transport.charAt(0).toUpperCase() + transport.slice(1),
        value: totalSpent,
        color,
      };
    })
    .filter((item) => item.value > 0); // Only include types with actual spending

  const totalSpending = voucherSpendData.reduce(
    (sum, voucher) => sum + voucher.amount,
    0
  );

  // (removed slice labels for clean look)

  // Custom legend that shows label and amount
  const renderPieLegend = (props: any) => {
    const { payload } = props || {};
    if (!payload) return null;
    return (
      <ul
        className="recharts-default-legend"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          color: "var(--foreground)",
          fontSize: "15px",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {payload.map((entry: any, index: number) => (
          <li
            key={`item-${index}`}
            className="recharts-legend-item"
            style={{
              display: "inline-flex",
              alignItems: "center",
              marginRight: 12,
              marginBottom: 6,
            }}
          >
            <svg width="10" height="10" style={{ marginRight: 6 }}>
              <rect width="10" height="10" fill={entry.color} />
            </svg>
            <span
              className="recharts-legend-item-text"
              style={{ color: "var(--foreground)" }}
            >
              {entry.value}: ₹
              {Number(entry.payload?.amount ?? 0).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const getFilterLabel = () => {
    switch (filter) {
      case "thisMonth":
        return "This Month";
      case "lastMonth":
        return "Last Month";
      case "thisQuarter":
        return "This Quarter";
      case "thisYear":
        return "This Year";
      case "lastYear":
        return "Last Year";
      case "specificVoucher":
        return selectedVoucherId
          ? `Voucher: ${vouchers.find((v) => v.id === selectedVoucherId)?.name}`
          : "Select Voucher";
      default:
        return "All Time";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-4">
          <div className="flex items-center space-x-4 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Reports
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Expense analysis and insights • {getFilterLabel()}
              </p>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-500" />
              <Select
                value={filter}
                onValueChange={(value: FilterType) => {
                  setFilter(value);
                  if (value !== "specificVoucher") {
                    setSelectedVoucherId(null);
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisQuarter">This Quarter</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <SelectItem value="lastYear">Last Year</SelectItem>
                  <SelectItem value="specificVoucher">
                    Specific Voucher
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filter === "specificVoucher" && (
              <Select
                value={selectedVoucherId || ""}
                onValueChange={setSelectedVoucherId}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Choose voucher" />
                </SelectTrigger>
                <SelectContent>
                  {vouchers.map((voucher) => (
                    <SelectItem key={voucher.id} value={voucher.id}>
                      {voucher.name} -{" "}
                      {format(new Date(voucher.start_date), "MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Vouchers
                  </p>
                  <p
                    className="text-2xl font-bold text-gray-900 dark:text-white"
                    data-testid="text-total-vouchers"
                  >
                    {filteredVouchers.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Spending
                  </p>
                  <p
                    className="text-2xl font-bold text-gray-900 dark:text-white"
                    data-testid="text-total-spending"
                  >
                    ₹{totalSpending.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Avg per Voucher
                  </p>
                  <p
                    className="text-2xl font-bold text-gray-900 dark:text-white"
                    data-testid="text-avg-spending"
                  >
                    ₹
                    {filteredVouchers.length > 0
                      ? (totalSpending / filteredVouchers.length).toFixed(0)
                      : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {filteredVouchers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Data Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create some vouchers and expenses to see your reports here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Voucher Spending Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Spending by Voucher</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={voucherSpendData}
                        cx="50%"
                        cy="50%"
                        label={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {voucherSpendData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              Object.values(TRANSPORT_COLORS)[
                                index % Object.values(TRANSPORT_COLORS).length
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          `₹${value.toLocaleString()}`,
                          "Amount",
                        ]}
                      />
                      <Legend content={renderPieLegend} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Transport Type Spending Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Spending by Transport Type</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={transportSpendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "var(--foreground)" }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "var(--foreground)" }}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `₹${value.toLocaleString()}`,
                          "Amount",
                        ]}
                        labelStyle={{ color: "var(--foreground)" }}
                        contentStyle={{
                          backgroundColor: "var(--background)",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                        }}
                      />
                      <Bar dataKey="value" fill="#3B82F6">
                        {transportSpendData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
