"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProcessedInventory } from "@/pages/Inventory";

const formSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be a positive number."),
  purchasePrice: z.coerce.number().min(0, "Price must be non-negative."),
  supplier: z.string().min(1, "Supplier is required."),
});

interface AddStockFormProps {
  inventoryItem: ProcessedInventory;
  onClose: () => void;
}

export const AddStockForm = ({ inventoryItem, onClose }: AddStockFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 0,
      purchasePrice: 0,
      supplier: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const inventoryRef = doc(db, "inventory", inventoryItem.id);
      
      await runTransaction(db, async (transaction) => {
        const inventoryDoc = await transaction.get(inventoryRef);
        
        const newEntry = {
          ...values,
          purchaseDate: serverTimestamp(),
          totalValue: values.quantity * values.purchasePrice,
        };

        if (!inventoryDoc.exists()) {
          // This case should ideally not happen with the new workflow, but as a fallback:
          transaction.set(inventoryRef, {
            branchId: inventoryItem.branchId,
            itemId: inventoryItem.itemId,
            entries: [newEntry],
          });
        } else {
          const currentEntries = inventoryDoc.data().entries || [];
          const updatedEntries = [...currentEntries, newEntry];
          transaction.update(inventoryRef, { entries: updatedEntries });
        }
      });

      toast.success("Stock added successfully.");
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error adding stock: ", error);
      toast.error("Failed to add stock. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-200">Quantity</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Enter quantity" {...field} className="bg-black/30 border-white/20 text-white placeholder:text-slate-400" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="purchasePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-200">Purchase Price (per unit)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Enter price per unit" {...field} className="bg-black/30 border-white/20 text-white placeholder:text-slate-400" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-200">Supplier</FormLabel>
              <FormControl>
                <Input placeholder="Enter supplier name" {...field} className="bg-black/30 border-white/20 text-white placeholder:text-slate-400" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-transparent border-white/20 text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            {isSubmitting ? "Adding..." : "Add Stock"}
          </Button>
        </div>
      </form>
    </Form>
  );
};