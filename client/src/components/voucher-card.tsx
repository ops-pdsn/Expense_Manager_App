import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  Calendar,
  ReceiptIndianRupee,
  Plus,
  Check,
  Bus,
  Car,
  Fuel,
  Plane,
  ParkingSquare,
  Train,
  MoreHorizontal,
  Trash2,
  Printer,
} from "lucide-react";
import AutoRickshaw from "@/components/icons/auto-rickshaw";
import { supabase } from "@/lib/supabaseClient";
import type { VoucherWithExpenses, Expense } from "@shared/schema";
import { format, differenceInDays } from "date-fns";

interface VoucherCardProps {
  voucher: VoucherWithExpenses;
  onAddExpense: (voucherId: string) => void;
}

const transportIcons = {
  bus: Bus,
  train: Train,
  cab: Car,
  auto: AutoRickshaw,
  fuel: Fuel,
  flight: Plane,
  parking: ParkingSquare,
  other: MoreHorizontal,
};

const transportColors = {
  bus: "text-primary",
  train: "text-green-600",
  cab: "text-secondary",
  auto: "text-yellow-600",
  fuel: "text-orange-600",
  flight: "text-blue-600",
  parking: "text-purple-600",
  other: "text-gray-600",
};

export function VoucherCard({ voucher, onAddExpense }: VoucherCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dayCount = voucher.start_date && voucher.end_date 
    ? differenceInDays(new Date(voucher.end_date), new Date(voucher.start_date)) + 1
    : 0;

  // Submit voucher mutation (Supabase)
  const submitVoucherMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("vouchers")
        .update({ status: "submitted" })
        .eq("id", voucher.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      const { dismiss } = toast({
        title: "Success",
        description: "Voucher submitted successfully",
        variant: "default",
      });
      setTimeout(() => dismiss(), 3000);
    },
    onError: (error) => {
      const { dismiss } = toast({
        title: "Error",
        description: error.message || "Failed to submit voucher",
        variant: "destructive",
      });
      setTimeout(() => dismiss(), 5000);
    },
  });

  // Delete voucher mutation (Backend API)
  const deleteVoucherMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/vouchers/${voucher.id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      const { dismiss } = toast({
        title: "Success",
        description: "Voucher deleted successfully",
        variant: "default",
      });
      setTimeout(() => dismiss(), 3000);
    },
    onError: (error) => {
      console.error("Delete voucher error:", error);
      
      let errorMessage = "Failed to delete voucher";
      if (isUnauthorizedError(error)) {
        errorMessage = "You are not authorized to delete this voucher";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const { dismiss } = toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setTimeout(() => dismiss(), 5000);
    },
  });

  // Delete expense mutation (Backend API)
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await apiRequest("DELETE", `/api/expenses/${expenseId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      const { dismiss } = toast({
        title: "Success",
        description: "Expense deleted successfully",
        variant: "default",
      });
      setTimeout(() => dismiss(), 3000);
    },
    onError: (error) => {
      console.error("Delete expense error:", error);
      
      let errorMessage = "Failed to delete expense";
      if (isUnauthorizedError(error)) {
        errorMessage = "You are not authorized to delete this expense";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const { dismiss } = toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setTimeout(() => dismiss(), 5000);
    },
  });

  const formatExpenseDate = (date: string) => {
    return format(new Date(date), "MMM dd, yyyy - hh:mm a");
  };

  const getTransportIcon = (type: string) => {
    const Icon =
      transportIcons[type as keyof typeof transportIcons] || MoreHorizontal;
    const colorClass =
      transportColors[type as keyof typeof transportColors] || "text-gray-600";
    return <Icon className={`text-sm ${colorClass}`} size={16} />;
  };

  // Print voucher function
  const printVoucher = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      const { dismiss } = toast({
        title: "Error",
        description: "Please allow popups to print voucher",
        variant: "destructive",
      });
      setTimeout(() => dismiss(), 5000);
      return;
    }

    const companyName =
      (import.meta as any).env?.VITE_COMPANY_NAME ||
      "PDSN Media Private Limited";
    // Allow a separate watermark logo variable; fallback to legacy COMPANy_LOGO if not provided
    const watermarkLogoEnv =
      (import.meta as any).env?.VITE_WATERMARK_LOGO ||
      (import.meta as any).env?.VITE_COMPANY_LOGO ||
      "";
    const watermarkLogoSrc = watermarkLogoEnv
      ? watermarkLogoEnv.startsWith("http://") ||
        watermarkLogoEnv.startsWith("https://")
        ? watermarkLogoEnv
        : `${window.location.origin}${
            watermarkLogoEnv.startsWith("/") ? "" : "/"
          }${watermarkLogoEnv}`
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Claim Voucher- ${voucher.name}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
            color: #333;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-20deg);
            opacity: 0.15;
            z-index: 0;
            pointer-events: none;
            user-select: none;
            text-align: center;
            white-space: nowrap;
          }
          .watermark img { max-width: 60vh; height: auto; filter: grayscale(100%); }
          .watermark-text { font-size: 12vh; font-weight: 800; letter-spacing: 0.1em; }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #333; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .brand { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
          .brand img { height: 40px; width: auto; }
          .brand-name { font-size: 22px; font-weight: 800; }
          .company-name { 
            font-size: 18px; 
            color: #555;
            margin-bottom: 5px; 
          }
          .document-title { 
            font-size: 20px; 
            color: #222; 
            margin-bottom: 6px; 
          }
          .document-subtitle { font-size: 13px; color: #666; margin-bottom: 10px; }
          .voucher-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px; 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
          }
          .info-section h3 { 
            margin: 0 0 10px 0; 
            color: #333; 
            font-size: 14px;
            font-weight: bold;
          }
          .info-section p { 
            margin: 5px 0; 
            font-size: 13px;
          }
          .expenses-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
          }
          .expenses-table th, 
          .expenses-table td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
          }
          .expenses-table th { 
            background: #f1f1f1; 
            font-weight: bold; 
            font-size: 12px;
          }
          .expenses-table td { 
            font-size: 11px;
          }
          .total-section { 
            margin-top: 30px; 
            text-align: right; 
            font-size: 16px; 
            font-weight: bold; 
          }
          .signatures { 
            margin-top: 50px; 
            display: flex; 
            justify-content: space-between; 
          }
          .signature-box { 
            width: 200px; 
            text-align: center; 
          }
          .signature-line { 
            border-top: 1px solid #333; 
            margin-top: 50px; 
            padding-top: 5px; 
            font-size: 12px; 
          }
          .status-badge { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 12px; 
            font-weight: bold; 
            ${
              voucher.status === "submitted"
                ? "background: #dcfce7; color: #166534;"
                : "background: #fef3c7; color: #92400e;"
            }
          }
          .no-expenses { 
            text-align: center; 
            color: #666; 
            font-style: italic; 
            padding: 20px; 
          }
          @media print { 
            body { margin: 0; } 
            .no-print { display: none; }
          }
          .transport-icon {
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-right: 5px;
          }
        </style>
      </head>
      <body>
        <div class="watermark">
          ${
            watermarkLogoSrc
              ? `<img src="${watermarkLogoSrc}" alt="${companyName} watermark" />`
              : `<div class="watermark-text">${companyName}</div>`
          }
        </div>
        <div class="header">
          <div class="brand">
            <div class="brand-name">${companyName}</div>
          </div>
          <div class="company-name">Employee Reimbursement Voucher</div>
          <div class="document-subtitle">Detailed statement of travel or other expenses for processing and approval</div>
        </div>

        <div class="voucher-info">
          <div class="info-section">
            <h3>Voucher Details</h3>
            <p><strong>Voucher Name:</strong> ${voucher.name}</p>
            <p><strong>Status:</strong> <span class="status-badge">${voucher.status.toUpperCase()}</span></p>
            <p><strong>Total Amount:</strong> ₹${parseFloat(
              voucher.totalAmount
            ).toLocaleString()}</p>
          </div>
          <div class="info-section">
            <h3>Travel Period</h3>
            <p><strong>Start Date:</strong> ${voucher.start_date 
              ? format(new Date(voucher.start_date), "dd MMM yyyy")
              : "Not set"
            }</p>
            <p><strong>End Date:</strong> ${voucher.end_date 
              ? format(new Date(voucher.end_date), "dd MMM yyyy")
              : "Not set"
            }</p>
            <p><strong>Duration:</strong> ${dayCount} day${
      dayCount !== 1 ? "s" : ""
    }</p>
          </div>
          <div class="info-section">
            <h3>Document Info</h3>
            <p><strong>Generated:</strong> ${format(
              new Date(),
              "dd MMM yyyy, HH:mm"
            )}</p>
            <p><strong>Total Expenses:</strong> ${voucher.expenses.length}</p>
          </div>
        </div>

        ${
          voucher.description
            ? `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px;">Description:</h3>
          <p style="margin: 0; font-size: 13px;">${voucher.description}</p>
        </div>
        `
            : ""
        }

        <h3 style="margin-bottom: 15px; font-size: 16px;">Expense Details:</h3>
        
        ${
          voucher.expenses.length > 0
            ? `
        <table class="expenses-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Description</th>
              <th>Transport Type</th>
              <th>Distance (KM)</th>
              <th>Amount (₹)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${voucher.expenses
              .map(
                (expense) => `
              <tr>
                <td>${format(
                  new Date(expense.datetime),
                  "dd MMM yyyy, HH:mm"
                )}</td>
                <td>${expense.description}</td>
                <td>${
                  expense.transport_type.charAt(0).toUpperCase() +
                  expense.transport_type.slice(1)
                }</td>
                <td>${
                  expense.transport_type === "fuel" && expense.distance
                    ? expense.distance + " km"
                    : "-"
                }</td>
                <td style="text-align: right;">₹${parseFloat(
                  expense.amount
                ).toLocaleString()}</td>
                <td>${expense.notes || "-"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        `
            : `
        <div class="no-expenses">No expenses recorded for this voucher.</div>
        `
        }

        <div class="total-section">
          <p>Total Amount: ₹${parseFloat(
            voucher.totalAmount
          ).toLocaleString()}</p>
        </div>

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">Employee Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">HOD / Manager Approval</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Accounts Team</div>
          </div>
        </div>

        <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #666;">
          This is a computer-generated document. No signature is required for system processing.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardContent className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg truncate">{voucher.name}</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {voucher.start_date && voucher.end_date ? (
                <>
                  {format(new Date(voucher.start_date), "MMM dd")} -{" "}
                  {format(new Date(voucher.end_date), "MMM dd, yyyy")}
                </>
              ) : (
                "Date not set"
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <Badge
              variant={voucher.status === "submitted" ? "default" : "secondary"}
              className={`text-xs ${
                voucher.status === "submitted"
                  ? "bg-secondary/10 text-secondary border-secondary/20"
                  : "bg-accent/10 text-accent border-accent/20"
              }`}
            >
              {voucher.status === "submitted" ? "Submitted" : "Draft"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 min-w-[36px] h-9"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown
                className={`transition-transform duration-300 ${
                  isExpanded ? "rotate-180" : ""
                }`}
                size={18}
              />
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center">
              <Calendar className="mr-1" size={14} />
              {dayCount} day{dayCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center">
              <ReceiptIndianRupee className="mr-1" size={14} />
              {voucher.expenseCount} expense
              {voucher.expenseCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">
              ₹{parseFloat(voucher.totalAmount).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {voucher.description && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {voucher.description}
                </p>
              </div>
            )}

            {/* Expenses List */}
            {voucher.expenses.length > 0 ? (
              <div className="space-y-2 sm:space-y-3 mb-4">
                {voucher.expenses.map((expense: Expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-2 sm:py-2 sm:px-0 border border-gray-100 dark:border-gray-600 rounded-lg sm:border-0 sm:border-b sm:border-gray-100 dark:sm:border-gray-600 last:border-b-0 sm:rounded-none"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        {getTransportIcon(expense.transport_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">
                          {expense.description}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatExpenseDate(expense.datetime.toString())}
                          {expense.distance && ` • ${expense.distance} km`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="font-semibold text-sm sm:text-base">
                        ₹{parseFloat(expense.amount).toLocaleString()}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 h-7 w-7 sm:h-6 sm:w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[90vw] max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this expense? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="w-full sm:w-auto bg-red-500 hover:bg-red-600"
                              onClick={() =>
                                deleteExpenseMutation.mutate(expense.id)
                              }
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 sm:py-6 text-gray-500 dark:text-gray-400">
                <ReceiptIndianRupee className="mx-auto h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-50" />
                <p className="text-sm">No expenses added yet</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
              {voucher.status === "draft" && (
                <>
                  <Button
                    className="flex-[2] xs:flex-[2] bg-primary hover:bg-blue-700 text-white h-10 text-xs xs:text-sm px-2 xs:px-3"
                    onClick={() => onAddExpense(voucher.id)}
                  >
                    <Plus className="mr-1 xs:mr-2" size={14} />
                    <span className="hidden xs:inline">Add </span>Expense
                  </Button>
                  {voucher.expenses.length > 0 && (
                    <Button
                      className="flex-[2] xs:flex-[2] bg-secondary hover:bg-green-700 text-white h-10 text-xs xs:text-sm px-2 xs:px-3"
                      onClick={() => submitVoucherMutation.mutate()}
                      disabled={submitVoucherMutation.isPending}
                    >
                      <Check className="mr-1 xs:mr-2" size={14} />
                      {submitVoucherMutation.isPending
                        ? "Submitting..."
                        : "Submit"}
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="outline"
                className="flex-[1] xs:flex-[1] border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 h-10 text-xs xs:text-sm px-1 xs:px-2"
                onClick={printVoucher}
              >
                <Printer className="mr-1 xs:mr-1" size={14} />
                <span className="hidden sm:inline">Print</span>
                <span className="sm:hidden">Print</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-[1] xs:flex-[1] border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 h-10 text-xs xs:text-sm px-1 xs:px-2"
                  >
                    <Trash2 className="mr-1 xs:mr-1" size={14} />
                    <span className="hidden sm:inline">Delete</span>
                    <span className="sm:hidden">Del</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[90vw] max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Voucher</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this voucher and all its
                      expenses? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="w-full sm:w-auto bg-red-500 hover:bg-red-600"
                      onClick={() => deleteVoucherMutation.mutate()}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
