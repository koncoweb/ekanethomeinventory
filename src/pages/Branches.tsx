import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { AddBranchForm } from "@/components/AddBranchForm";
import { EditBranchForm } from "@/components/EditBranchForm";
import { Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export interface Branch {
  id: string;
  name: string;
  location: string;
  address?: string;
  phone?: string;
}

const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null); // State untuk menyimpan ID cabang yang akan dihapus
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "branches"), (snapshot) => {
      const branchesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Branch[];
      setBranches(branchesData);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!isAdmin || !branchToDelete) {
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki izin atau cabang tidak valid untuk dihapus.",
        variant: "destructive",
      });
      return;
    }
    try {
      await deleteDoc(doc(db, "branches", branchToDelete));
      toast({
        title: "Success",
        description: "Branch deleted successfully.",
      });
      setBranchToDelete(null); // Reset state setelah penghapusan
    } catch (error) {
      console.error("Error deleting branch: ", error);
      toast({
        title: "Error",
        description: "Failed to delete branch.",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (branch: Branch) => {
    setEditingBranch(branch);
    setIsEditDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Branch Management</CardTitle>
            <CardDescription>
              Here you can manage your company branches.
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Branch</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Branch</DialogTitle>
                </DialogHeader>
                <AddBranchForm setDialogOpen={setIsAddDialogOpen} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.length > 0 ? (
              branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.location}</TableCell>
                  <TableCell>{branch.address || '-'}</TableCell>
                  <TableCell>{branch.phone || '-'}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <div className="flex justify-end items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(branch)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setBranchToDelete(branch.id)} // Set ID cabang yang akan dihapus
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the branch
                                and remove its data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setBranchToDelete(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteConfirm}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No branches found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {editingBranch && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Branch</DialogTitle>
            </DialogHeader>
            <EditBranchForm
              setDialogOpen={setIsEditDialogOpen}
              branch={editingBranch}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default Branches;