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
} from "@/components/ui/alert-dialog";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
import { AddBranchForm } from "@/components/AddBranchForm";
import { EditBranchForm } from "@/components/EditBranchForm";
import { Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export interface Branch {
  id: string;
  name: string;
  location: string;
  address?: string;
  phone?: string;
}

const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  useEffect(() => {
    document.title = "Eka Net Home - Inventory System - Manajemen Cabang";
    const unsubscribe = onSnapshot(collection(db, "branches"), (snapshot) => {
      const branchesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Branch[];
      setBranches(branchesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching branches: ", error);
      toast({
        title: "Galat",
        description: "Gagal mengambil data cabang.",
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

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
        title: "Sukses",
        description: "Cabang berhasil dihapus.",
      });
      setBranchToDelete(null);
    } catch (error) {
      console.error("Error deleting branch: ", error);
      toast({
        title: "Galat",
        description: "Gagal menghapus cabang.",
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
            <CardTitle>Manajemen Cabang</CardTitle>
            <CardDescription>
              Di sini Anda dapat mengelola cabang perusahaan Anda.
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>Tambah Cabang</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Cabang Baru</DialogTitle>
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
              <TableHead>Nama Cabang</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : branches.length > 0 ? (
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
                              onClick={() => setBranchToDelete(branch.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini tidak dapat dibatalkan. Ini akan menghapus cabang secara permanen
                                dan menghilangkan datanya dari server kami.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setBranchToDelete(null)}>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteConfirm}>Lanjutkan</AlertDialogAction>
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
                  Tidak ada cabang yang ditemukan. Tambahkan satu untuk memulai.
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
              <DialogTitle>Ubah Cabang</DialogTitle>
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