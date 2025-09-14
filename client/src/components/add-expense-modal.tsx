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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
      toast({
        title: "Success",
        description: "Expense added successfully",
        variant: "default",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createExpenseMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Airport Transfer, Hotel Taxi"
                      {...field}
                      className="bg-white dark:bg-gray-700"
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
                  <FormLabel>Transport Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-gray-700">
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
                        <FormLabel className="text-amber-800 dark:text-amber-200">
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
                            className="border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-900/10"
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
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter amount in rupees"
                        {...field}
                        className="bg-white dark:bg-gray-700"
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
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      className="bg-white dark:bg-gray-700"
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
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional details..."
                      className="bg-white dark:bg-gray-700"
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

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-blue-700 text-white"
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
