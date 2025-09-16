import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { supabase } from "@/lib/supabaseClient";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { insertVoucherSchema, type User as UserType } from "@shared/schema";

interface CreateVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Voucher name is required"),
  description: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type FormData = z.infer<typeof formSchema>;

export function CreateVoucherModal({ open, onOpenChange }: CreateVoucherModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      department: user?.department || "Operations",
    },
  });

  const createVoucherMutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        if (!user) throw new Error("User not authenticated");
        
        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('No authentication token found');
        }
        
        // Format data according to server schema
        const requestBody = {
          name: data.name,
          description: data.description || null,
          startDate: data.startDate,  // Send camelCase as server expects
          endDate: data.endDate,      // Send camelCase as server expects
          department: data.department,
        };
        
        // Make the request
        const response = await fetch('/api/vouchers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
        });
        
        
        // Handle non-OK responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('Error response:', errorData);
          throw new Error(errorData?.message || `Server responded with status ${response.status}`);
        }
        
        // Parse and return response
        const result = await response.json();
        return result;
      } catch (error) {
        console.error('Mutation error:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      
      // Invalidate to get fresh data from server
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      
      // Show success message with auto-dismiss
      const { dismiss } = toast({
        title: "Success",
        description: "Voucher created successfully. You can now add expenses.",
        variant: "default",
      });
      // Auto-dismiss success messages after 3 seconds
      setTimeout(() => dismiss(), 3000);

      // Reset and close
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      const { dismiss } = toast({
        title: "Error",
        description: error.message || "Failed to create voucher",
        variant: "destructive",
      });
      // Auto-dismiss error messages after 5 seconds
      setTimeout(() => dismiss(), 5000);
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Add validation logging
      const validationIssues = [];
      if (!data.name) validationIssues.push('Missing name');
      if (!data.startDate) validationIssues.push('Missing start date');
      if (!data.endDate) validationIssues.push('Missing end date');
      if (!data.department) validationIssues.push('Missing department');
      
      if (validationIssues.length > 0) {
        console.error('Validation issues:', validationIssues);
        return;
      }

      createVoucherMutation.mutate(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg sm:text-xl">Create New Voucher</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Voucher Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Mumbai Business Trip"
                      {...field}
                      className="bg-white dark:bg-gray-700 h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-white dark:bg-gray-700 h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Department</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      className="bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 h-10"
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500 mt-1">Auto-selected from your profile</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the trip purpose..."
                      className="bg-white dark:bg-gray-700 min-h-[80px] resize-none"
                      rows={3}
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
                disabled={createVoucherMutation.isPending}
              >
                {createVoucherMutation.isPending ? "Creating..." : "Create Voucher"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
