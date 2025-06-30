import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import { Branch } from "@/pages/Branches";
import { Item } from "@/pages/Items";
import { InventoryDoc } from "@/pages/Inventory";

const formSchema = z.object({
  fromBranchId: z.string().min(1, "Source branch is required."),
  toBranchId: z.string().min(1, "Destination branch is required."),
  itemId: z.string().min(1, "Item is required."),
  quantity: z.coerce.number().int().positive("Quantity must be a positive number."),
}).refine(data => data.fromBranchId !== data.toBranchId, {
  message: "Source and destination branches cannot be the same.",
  path: ["toBranchId"],
});

interface NewTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  items: Item[];
  inventory: InventoryDoc[];
}

const NewTransferForm = ({ isOpen, onClose, branches, items, inventory }: NewTransferFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromBranchId: "",
      toBranchId: "",
      itemId: "",
      quantity: 1,
    },
  });

  const fromBranchId = form.watch("fromBranchId");

  useEffect(() => {
    if (fromBranchId) {
      const itemsInBranch = inventory
        .filter(inv => inv.branchId === fromBranchId && inv.quantity > 0)
        .map(inv => inv.itemId);
      const filteredItems = items.filter(item => itemsInBranch.includes(item.id));
      setAvailableItems(filteredItems);
      form.setValue("itemId", ""); // Reset item selection when branch changes
    } else {
      setAvailableItems([]);
    }
  }, [fromBranchId, inventory, items, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    const sourceInventory = inventory.find(
      (inv) => inv.branchId === values.fromBranchId && inv.itemId === values.itemId
    );

    if (!sourceInventory || sourceInventory.quantity < values.quantity) {
      toast.error("Not enough stock in the source branch for this transfer.");
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "transfers"), {
        ...values,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      toast.success("Transfer initiated successfully. Pending approval.");
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast.error("An error occurred while creating the transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Inventory Transfer</DialogTitle>
          <DialogDescription>
            Move items from one branch to another. This requires approval from the destination branch manager.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fromBranchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Branch</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select source branch" /></SelectTrigger></FormControl>
                    <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toBranchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Branch</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select destination branch" /></SelectTrigger></FormControl>
                    <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!fromBranchId}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select an item to transfer" /></SelectTrigger></FormControl>
                    <SelectContent>{availableItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.sku})</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl><Input type="number" placeholder="Enter quantity" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit Transfer"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTransferForm;