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
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { UserData } from "@/pages/Users";
import { Branch } from "@/pages/Branches";
import { useState } from "react";

const formSchema = z.object({
  role: z.enum(["admin", "manager", "staff"]),
  branchId: z.string().optional(),
}).refine(data => data.role !== 'manager' || (data.role === 'manager' && data.branchId), {
  message: "A branch must be assigned for managers.",
  path: ["branchId"],
});

interface EditUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData;
  branches: Branch[];
}

const EditUserForm = ({ isOpen, onClose, user, branches }: EditUserFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: user.role,
      branchId: user.branchId || "",
    },
  });

  const selectedRole = form.watch("role");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", user.id);
      const dataToUpdate: Partial<UserData> = { role: values.role };

      if (values.role === 'manager') {
        dataToUpdate.branchId = values.branchId;
      } else {
        dataToUpdate.branchId = ""; // Or use deleteField() if you want to remove it
      }

      await updateDoc(userRef, dataToUpdate);
      toast.success(`User ${user.email} updated successfully.`);
      onClose();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("An error occurred while updating the user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.email}</DialogTitle>
          <DialogDescription>
            Modify the user's role and branch assignment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedRole === 'manager' && (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Branch</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserForm;