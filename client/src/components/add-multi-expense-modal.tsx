import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

interface AddMultiExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherId: string;
}

type TransportType =
  | "bus"
  | "train"
  | "cab"
  | "auto"
  | "fuel"
  | "flight"
  | "parking"
  | "food"
  | "other";

type LineItem = {
  description: string;
  transport_type: TransportType;
  amount: string; // keep as string to match API expectation
  distance?: number;
  datetime: string; // datetime-local input value
  notes?: string;
};

const transportOptions: { value: TransportType; label: string }[] = [
  { value: "bus", label: "Bus" },
  { value: "train", label: "Train" },
  { value: "cab", label: "Cab/Taxi" },
  { value: "auto", label: "Auto Rickshaw" },
  { value: "fuel", label: "Fuel (Personal Vehicle)" },
  { value: "flight", label: "Flight" },
  { value: "parking", label: "Parking" },
  { value: "food", label: "Food" },
  { value: "other", label: "Other" },
];

const itemSchema = z.object({
  description: z.string().min(1),
  transport_type: z.enum([
    "bus",
    "train",
    "cab",
    "auto",
    "fuel",
    "flight",
    "parking",
    "food",
    "other",
  ]),
  amount: z.string().min(1),
  distance: z.number().optional(),
  datetime: z.string().min(1),
  notes: z.string().optional(),
});

const bulkSchema = z.array(itemSchema).min(1);

export function AddMultiExpenseModal({ open, onOpenChange, voucherId }: AddMultiExpenseModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commonDescription, setCommonDescription] = useState("");
  const [dateTime, setDateTime] = useState<string>(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  type Row = { transport_type: TransportType; amount: string; distance?: number };
  const [rows, setRows] = useState<Row[]>([{ transport_type: "auto", amount: "", distance: undefined }]);

  useEffect(() => {
    if (!open) {
      // reset when modal closes
      setCommonDescription("");
      setDateTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setAdditionalNotes("");
      setRows([{ transport_type: "auto", amount: "", distance: undefined }]);
    }
  }, [open]);

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.amount || "0") || 0), 0);
  }, [rows]);

  const plannedItemsCount = useMemo(() => {
    return rows.filter((r) => {
      if (r.transport_type === "fuel") {
        return (r.distance || 0) > 0;
      }
      return (parseFloat(r.amount || "0") || 0) > 0;
    }).length;
  }, [rows]);

  const setRow = (index: number, updater: (prev: Row) => Row) => {
    setRows((prev) => prev.map((it, i) => (i === index ? updater(it) : it)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { transport_type: "auto", amount: "", distance: undefined }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const onChangeTransport = (index: number, type: TransportType) => {
    setRow(index, (prev) => {
      if (type === "fuel") {
        const km = prev.distance ?? 0;
        const computed = km * 3.5;
        return { ...prev, transport_type: type, distance: km, amount: km ? computed.toFixed(2) : "" };
      }
      return { ...prev, transport_type: type, distance: undefined };
    });
  };

  const onChangeDistance = (index: number, value: string) => {
    const km = value ? parseInt(value) : undefined;
    setRow(index, (prev) => {
      const computed = km ? km * 3.5 : 0;
      return { ...prev, distance: km, amount: km ? computed.toFixed(2) : "" };
    });
  };

  // Advanced list mode removed for simplicity per new grid UI

  const createExpensesMutation = useMutation({
    mutationFn: async (payload: { items: LineItem[] }) => {
      const response = await apiRequest("POST", `/api/vouchers/${voucherId}/expenses/bulk`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      toast({ title: "Success", description: "Expenses added successfully", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/"; }, 500);
        return;
      }
      toast({ title: "Error", description: error?.message || "Failed to add expenses", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    }
  });

  const handleSubmit = () => {
    const desc = commonDescription.trim();
    if (!desc) {
      toast({ title: "Missing description", description: "Please enter an expense description.", variant: "destructive" });
      return;
    }

    const itemsToSend: LineItem[] = [];
    const dt = dateTime;
    const pushIf = (amountNum: number, transport_type: TransportType) => {
      if (amountNum > 0) {
        itemsToSend.push({
          description: desc,
          transport_type,
          amount: amountNum.toFixed(2),
          datetime: dt,
          notes: additionalNotes,
        });
      }
    };

    rows.forEach((row) => {
      if (row.transport_type === "fuel") {
        const km = row.distance || 0;
        if (km > 0) {
          itemsToSend.push({
            description: desc,
            transport_type: "fuel",
            amount: (km * 3.5).toFixed(2),
            distance: km,
            datetime: dt,
            notes: additionalNotes,
          });
        }
      } else {
        const amt = parseFloat(row.amount || "0") || 0;
        pushIf(amt, row.transport_type);
      }
    });

    if (itemsToSend.length === 0) {
      toast({ title: "Nothing to add", description: "Enter at least one amount or fuel KM.", variant: "destructive" });
      return;
    }

    const parsed = bulkSchema.safeParse(itemsToSend);
    if (!parsed.success) {
      toast({ title: "Validation error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    createExpensesMutation.mutate({ items: parsed.data });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg sm:text-xl">Add Multiple Expenses</DialogTitle>
          <DialogDescription>
            Add several transport expenses at once (e.g., Auto, Bus, Train for the same work/day).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Description and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <Input
                value={commonDescription}
                onChange={(e) => setCommonDescription(e.target.value)}
                placeholder="Expense description (e.g., Tata Steel document submission)"
                className="bg-white dark:bg-gray-700 h-10"
              />
            </div>
            <div className="sm:col-span-1">
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="bg-white dark:bg-gray-700 h-10"
              />
            </div>
          </div>

          {/* Dynamic Items List */}
          <div className="space-y-2">
            {rows.map((row, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-4">
                      <label className="block text-xs font-medium mb-1">Transport Type</label>
                      <Select value={row.transport_type} onValueChange={(v) => onChangeTransport(index, v as TransportType)}>
                        <SelectTrigger className="bg-white dark:bg-gray-700 h-10">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {transportOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {row.transport_type === "fuel" ? (
                      <>
                        <div className="col-span-6 sm:col-span-3">
                          <label className="block text-xs font-medium mb-1">Distance (KM)</label>
                          <Input
                            type="number"
                            value={row.distance ?? ""}
                            onChange={(e) => onChangeDistance(index, e.target.value)}
                            placeholder="KM"
                            className="bg-white dark:bg-gray-700 h-10"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <label className="block text-xs font-medium mb-1">Amount (₹)</label>
                          <Input
                            value={row.amount}
                            readOnly
                            placeholder="Auto"
                            className="bg-amber-50 dark:bg-amber-900/20 h-10"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-6 sm:col-span-4">
                        <label className="block text-xs font-medium mb-1">Amount (₹)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => setRow(index, (prev) => ({ ...prev, amount: e.target.value }))}
                          placeholder="Amount"
                          className="bg-white dark:bg-gray-700 h-10"
                        />
                      </div>
                    )}

                    <div className="col-span-6 sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => removeRow(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div>
              <Button type="button" variant="outline" onClick={addRow} className="h-10">
                <Plus className="mr-1" size={16} /> Add another
              </Button>
            </div>
          </div>

          {/* Notes and Total */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
            <div className="sm:col-span-2">
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Additional Notes (Optional)"
                className="bg-white dark:bg-gray-700 min-h-[60px] resize-none"
                rows={2}
              />
            </div>
            <div className="sm:col-span-1 text-right font-semibold">Total: ₹{totalAmount.toFixed(2)}</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-primary hover:bg-blue-700 text-white h-10"
              disabled={createExpensesMutation.isPending}
              onClick={handleSubmit}
            >
              {createExpensesMutation.isPending ? "Adding..." : `Add ${plannedItemsCount} Expense${plannedItemsCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddMultiExpenseModal;


