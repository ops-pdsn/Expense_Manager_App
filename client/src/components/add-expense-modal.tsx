import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { insertExpenseSchema } from "@shared/schema";
import { format } from "date-fns";

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherId: string;
}

const formSchema = insertExpenseSchema.omit({ voucher_id: true }).extend({
  datetime: z.string().min(1, "Date and time is required"),
  transport_type: z.enum(["bus", "train", "cab", "auto", "fuel", "flight", "parking", "other"]),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  distance: z.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const transportOptions = [
  { value: "bus", label: "Bus" },
  { value: "train", label: "Train" },
  { value: "cab", label: "Cab/Taxi" },
  { value: "auto", label: "Auto Rickshaw" },
  { value: "fuel", label: "Fuel (Personal Vehicle)" },
  { value: "flight", label: "Flight" },
  { value: "parking", label: "Parking" },
  { value: "other", label: "Other" },
];

export function AddExpenseModal({ open, onOpenChange, voucherId }: AddExpenseModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showFuelSection, setShowFuelSection] = useState(false);
  const [calculatedAmount, setCalculatedAmount] = useState(0);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      transport_type: "bus",
      amount: "",
      distance: undefined,
      datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      notes: "",
    },
  });

  const watchTransportType = form.watch("transport_type");
  const watchDistance = form.watch("distance");

  // Handle transport type change
  useEffect(() => {
    if (watchTransportType === "fuel") {
      setShowFuelSection(true);
      form.setValue("amount", "");
    } else {
      setShowFuelSection(false);
      form.setValue("distance", undefined);
      setCalculatedAmount(0);
    }
  }, [watchTransportType, form]);

  // Calculate fuel cost when distance changes
  useEffect(() => {
    if (showFuelSection && watchDistance) {
      const cost = watchDistance * 3.5;
      setCalculatedAmount(cost);
      form.setValue("amount", cost.toFixed(2));
    }
  }, [watchDistance, showFuelSection, form]);

  const createExpenseMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", `/api/vouchers/${voucherId}/expenses`, {
        ...data,
        voucher_id: voucherId,
      });
      return response.json();
    },
    onMutate: async (newExpense) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["vouchers"] });

      // Snapshot the previous value
      const previousVouchers = queryClient.getQueryData(["vouchers"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["vouchers"], (old: any[]) => {
        if (!old) return old;
        
        return old.map((voucher: any) => {
          if (voucher.id === voucherId) {
            const optimisticExpense = {
              id: `temp-${Date.now()}`, // Temporary ID
              description: newExpense.description,
              amount: newExpense.amount,
              transport_type: newExpense.transport_type,
              datetime: newExpense.datetime,
              distance: newExpense.distance,
              notes: newExpense.notes,
              voucher_id: voucherId,
            };
            
            return {
              ...voucher,
              expenses: [...(voucher.expenses || []), optimisticExpense],
              expenseCount: (voucher.expenseCount || 0) + 1,
              totalAmount: (parseFloat(voucher.totalAmount || "0") + parseFloat(newExpense.amount)).toString(),
            };
          }
          return voucher;
        });
      });

      // Return a context object with the snapshotted value
      return { previousVouchers };
    },
    onSuccess: () => {
      // Always invalidate to get the real data from server
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      
      const { dismiss } = toast({
        title: "Success",
        description: "Expense added successfully",
        variant: "default",
      });
      
      // Auto-dismiss success messages after 3 seconds
      setTimeout(() => dismiss(), 3000);
      
      form.reset();
      onOpenChange(false);
    },
    onError: (error, newExpense, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousVouchers) {
        queryClient.setQueryData(["vouchers"], context.previousVouchers);
      }
      
      if (isUnauthorizedError(error)) {
        const { dismiss } = toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        // Auto-dismiss after 5 seconds for error messages
        setTimeout(() => dismiss(), 5000);
        
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      const { dismiss } = toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
      // Auto-dismiss error messages after 5 seconds
      setTimeout(() => dismiss(), 5000);
    },
    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });

  const onSubmit = (data: FormData) => {
    createExpenseMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-md bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg sm:text-xl">Add Expense</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Expense Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Airport Transfer, Hotel Taxi"
                      {...field}
                      className="bg-white dark:bg-gray-700 h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transport_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Transport Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-gray-700 h-10">
                        <SelectValue placeholder="Select Transport Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transportOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fuel Calculation Section */}
            {showFuelSection && (
              <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4 space-y-3">
                  <FormField
                    control={form.control}
                    name="distance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                          Distance (KM)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter distance in kilometers"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            className="border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-900/10 h-10"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {calculatedAmount > 0 && (
                    <div className="flex items-center justify-between p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Calculated Amount (₹3.5/KM):
                      </span>
                      <span className="text-lg font-bold text-amber-900 dark:text-amber-100">
                        ₹{calculatedAmount.toFixed(0)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Manual Amount Section */}
            {!showFuelSection && (
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter amount in rupees"
                        {...field}
                        className="bg-white dark:bg-gray-700 h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="datetime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      className="bg-white dark:bg-gray-700 h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional details..."
                      className="bg-white dark:bg-gray-700 min-h-[60px] resize-none"
                      rows={2}
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-blue-700 text-white h-10"
                disabled={createExpenseMutation.isPending}
              >
                {createExpenseMutation.isPending ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
