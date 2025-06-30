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
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import AddItemForm from "@/components/AddItemForm";
import EditItemForm from "@/components/EditItemForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Item {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  description?: string;
}

const Items = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Eka Net Home - Inventory System - Item Master Management";
    const unsubscribe = onSnapshot(collection(db, "items"), (snapshot) => {
      const itemsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];
      setItems(itemsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching items: ", error);
      toast({
        title: "Error",
        description: "Failed to fetch items data.",
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEditClick = (item: Item) => {
    setSelectedItem(item);
    setIsEditFormOpen(true);
  };

  const handleDeleteClick = (itemId: string) => {
    setItemToDeleteId(itemId);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDeleteId) return;
    try {
      await deleteDoc(doc(db, "items", itemToDeleteId));
      toast({
        title: "Success",
        description: "Item deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting item: ", error);
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteAlertOpen(false);
      setItemToDeleteId(null);
    }
  };

  return (
    <Card className="bg-black/20 backdrop-blur-lg border border-white/10 text-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Manajemen Master Barang</CardTitle>
            <CardDescription className="text-slate-300">
              Kelola master barang inventaris Anda di sini.
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsAddFormOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white">Tambah Barang</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-white/10">
              <TableHead className="text-slate-200">Nama Barang</TableHead>
              <TableHead className="text-slate-200">SKU</TableHead>
              <TableHead className="text-slate-200">Kategori</TableHead>
              <TableHead className="text-slate-200">Satuan</TableHead>
              <TableHead className="text-slate-200 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-white/10">
                  <TableCell className="font-medium text-white">{item.name}</TableCell>
                  <TableCell className="text-slate-200">{item.sku}</TableCell>
                  <TableCell className="text-slate-200">{item.category}</TableCell>
                  <TableCell className="text-slate-200">{item.unit}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <div className="flex justify-end items-center space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)} className="text-slate-400 hover:text-white">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item.id)} className="text-slate-400 hover:text-white">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-300">
                  Tidak ada barang ditemukan. Tambahkan untuk memulai.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      
      <AddItemForm
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
      />

      <EditItemForm
        isOpen={isEditFormOpen}
        onClose={() => {
          setIsEditFormOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-black/20 backdrop-blur-lg border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Apakah Anda benar-benar yakin?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus item secara permanen
              dari inventaris Anda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-red-600 hover:bg-red-500 text-white">Lanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default Items;