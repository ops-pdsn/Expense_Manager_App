import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plane,
  Moon,
  Sun,
  Plus,
  FileText,
  IndianRupee,
  Calendar,
  ReceiptIndianRupee,
  Home,
  BarChart3,
  User,
  LogOut,
  MapPinPlus,
} from "lucide-react";
import { VoucherCard } from "@/components/voucher-card";
import { CreateVoucherModal } from "@/components/create-voucher-modal";
import { AddExpenseModal } from "@/components/add-expense-modal";
import { UserAvatar } from "@/components/UserAvatar";
import { supabase } from "@/lib/supabaseClient";
import type { VoucherWithExpenses, User as UserType } from "@shared/schema";

type FilterType = "all" | "draft" | "submitted";

export default function Dashboard() {
  const { user, isLoading: authLoading, logoutMutation } = useAuth();
  const { toggleTheme, theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [filter, setFilter] = useState<FilterType>("all");
  const [showCreateVoucher, setShowCreateVoucher] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(
    null
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  // Fetch vouchers (Supabase)
  const { data: vouchers = [], isLoading: vouchersLoading } = useQuery<
    VoucherWithExpenses[]
  >({
    queryKey: ["vouchers"],
    enabled: !!user,
    retry: false,
    queryFn: async () => {
      if (!user) return [];
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('/api/vouchers', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vouchers: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  // Update user department mutation (Supabase)
  const updateUserMutation = useMutation({
    mutationFn: async (department: string) => {
      if (!user) throw new Error("No user");
      const { error } = await supabase.auth.updateUser({ data: { department } });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update department",
        variant: "destructive",
      });
    },
  });

  // Filter vouchers
  const filteredVouchers = vouchers.filter((voucher) => {
    if (filter === "all") return true;
    return voucher.status === filter;
  });

  // Calculate stats
  const stats = {
    totalVouchers: vouchers.length,
    totalAmount: vouchers.reduce(
      (sum, voucher) => sum + parseFloat(voucher.totalAmount),
      0
    ),
    draftCount: vouchers.filter((v) => v.status === "draft").length,
    submittedCount: vouchers.filter((v) => v.status === "submitted").length,
  };

  // Remove unused handleLogout (logout handled by logoutMutation)

  const handleAddExpense = (voucherId: string) => {
    setSelectedVoucherId(voucherId);
    setShowAddExpense(true);
  };

  // Show department selection if user doesn't have department
  if (user && !(user as UserType).department) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Plane className="text-white text-2xl" size={32} />
              </div>
              <h2 className="text-xl font-bold">Welcome to TravelExpense</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Please select your department to continue
              </p>
            </div>

            <div className="space-y-2">
              {[
                "Engineering",
                "Sales",
                "Marketing",
                "HR",
                "Finance",
                "Operations",
              ].map((dept) => (
                <Button
                  key={dept}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => updateUserMutation.mutate(dept)}
                  disabled={updateUserMutation.isPending}
                >
                  {dept}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading || vouchersLoading) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <div className="p-4 space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark pb-20 sm:pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPinPlus className="text-white" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-sm sm:text-lg truncate">PDSN - Expense Manager</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {(user as UserType)?.department} Dept
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 min-w-[40px] h-10"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              className="p-2 sm:p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 min-w-[40px] h-10"
              disabled={logoutMutation.isPending}
            >
              <LogOut size={16} />
            </Button>
            <UserAvatar 
              user={user} 
              size="md" 
              className="sm:h-10 sm:w-10 sm:text-base"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Total Vouchers
                  </p>
                  <p className="text-lg sm:text-2xl font-bold">{stats.totalVouchers}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <FileText className="text-blue-600 dark:text-blue-400" size={16} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Total Amount
                  </p>
                  <p className="text-lg sm:text-2xl font-bold">
                    ₹{stats.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <IndianRupee className="text-green-600 dark:text-green-400" size={16} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-4 sm:mb-6">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-lg transition-all text-xs sm:text-sm ${
              filter === "all"
                ? "bg-blue-600 text-white dark:bg-blue-600 dark:text-white shadow-sm"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("all")}
          >
            All ({stats.totalVouchers})
          </Button>
          <Button
            variant={filter === "draft" ? "default" : "ghost"}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-lg transition-all text-xs sm:text-sm ${
              filter === "draft"
                ? "bg-blue-600 text-white dark:bg-blue-600 dark:text-white shadow-sm"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("draft")}
          >
            <span className="hidden sm:inline">Drafts</span>
            <span className="sm:hidden">Draft</span> ({stats.draftCount})
          </Button>
          <Button
            variant={filter === "submitted" ? "default" : "ghost"}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-lg transition-all text-xs sm:text-sm ${
              filter === "submitted"
                ? "bg-blue-600 text-white dark:bg-blue-600 dark:text-white shadow-sm"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("submitted")}
          >
            <span className="hidden sm:inline">Submitted</span>
            <span className="sm:hidden">Submit</span> ({stats.submittedCount})
          </Button>
        </div>

        {/* Vouchers List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredVouchers.length === 0 ? (
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No vouchers found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {filter === "all"
                    ? "Get started by creating your first travel voucher."
                    : `No ${filter} vouchers found.`}
                </p>
                {filter === "all" && (
                  <Button onClick={() => setShowCreateVoucher(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Voucher
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredVouchers.map((voucher) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                onAddExpense={handleAddExpense}
              />
            ))
          )}
        </div>
      </main>

            {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-2 px-4 safe-area-pb">
        <div className="flex justify-around max-w-md mx-auto">
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-primary hover:text-primary hover:bg-primary/10 min-h-[60px] px-3"
          >
            <Home size={20} />
            <span className="text-xs">Dashboard</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/10 min-h-[60px] px-3"
            onClick={() => setShowCreateVoucher(true)}
          >
            <Plus size={20} />
            <span className="text-xs">Create</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/10 min-h-[60px] px-3"
            onClick={() => setLocation("/reports")}
            data-testid="button-reports"
          >
            <BarChart3 size={20} />
            <span className="text-xs">Reports</span>
          </Button>
        </div>
      </nav>

      {/* Modals */}
      <CreateVoucherModal
        open={showCreateVoucher}
        onOpenChange={setShowCreateVoucher}
      />

      {selectedVoucherId && (
        <AddExpenseModal
          open={showAddExpense}
          onOpenChange={setShowAddExpense}
          voucherId={selectedVoucherId}
        />
      )}
    </div>
  );
}
