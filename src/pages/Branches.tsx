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
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { AddBranchForm } from "@/components/AddBranchForm";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

export interface Branch {
  id: string;
  name: string;
  location: string;
}

const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { role } = useAuth(); // Dapatkan peran pengguna dari AuthContext
  const isAdmin = role === 'admin'; // Cek apakah pengguna adalah admin

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

  const handleDelete = async (id: string) => {
    if (!isAdmin) { // Tambahkan cek peran sebelum menghapus
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki izin untuk menghapus cabang.",
        variant: "destructive",
      });
      return;
    }
    if (window.confirm("Are you sure you want to delete this branch?")) {
      try {
        await deleteDoc(doc(db, "branches", id));
        toast({
          title: "Success",
          description: "Branch deleted successfully.",
        });
      } catch (error) {
        console.error("Error deleting branch: ", error);
        toast({
          title: "Error",
          description: "Failed to delete branch.",
          variant: "destructive",
        });
      }
    }
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
          {isAdmin && ( // Tampilkan tombol "Add Branch" hanya jika admin
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Branch</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Branch</DialogTitle>
                </DialogHeader>
                <AddBranchForm setDialogOpen={setIsDialogOpen} />
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.length > 0 ? (
              branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.location}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && ( // Tampilkan tombol hapus hanya jika admin
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(branch.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No branches found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default Branches;