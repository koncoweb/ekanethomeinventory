import { useState, useEffect, useMemo } from "react";
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
import { collection, onSnapshot, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react"; // Import Trash2
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Branch } from "./Branches";
import { Item } from "./Items";
import ManageStockForm from "@/components/ManageStockForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, // Import AlertDialog components
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddInventoryForm from "@/components/AddInventoryForm";

export interface InventoryDoc {
  id: string;
  branchId: string;
  itemId: string;
  quantity: number;
}

interface ProcessedInventory extends InventoryDoc {
  branchName: string;
  itemName: string;
  itemSku: string;
  price?: number;
  supplier?: string;
  totalValue?: number; // Menambahkan properti totalValue
}

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryDoc[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManageStockFormOpen, setIsManageStockFormOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryDoc | null>(null);
  const { role, user } = useAuth();
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [isAddInventoryFormOpen, setIsAddInventoryFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false); // State untuk AlertDialog
  const [inventoryToDeleteId, setInventoryToDeleteId] = useState<string | null>(null); // State untuk ID inventaris yang akan dihapus

  useEffect(() => {
    document.title = "Eka Net Home - Inventory System - Inventory Management";
    const fetchInitialData = async () => {
      try {
        const branchesSnapshot = await getDocs(collection(db, "branches"));
        setBranches(branchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Branch[]);

        const itemsSnapshot = await getDocs(collection(db, "items"));
        setItems(itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Item[]);

        if (user && role === 'manager') {
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          if (userDocSnap.exists()) {
            setUserBranchId(userDocSnap.data().branchId || null);
          }
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast.error("Failed to load required data.");
      }
    };

    fetchInitialData();

    const unsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryDoc[];
      setInventory(inventoryData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to fetch inventory data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, role]);

  const processedInventory = useMemo(() => {
    const itemsMap = new Map(items.map(item => [item.id, item]));
    const branchesMap = new Map(branches.map(branch => [branch.id, branch]));

    let filteredInventory = inventory;
    if (role === 'manager' && userBranchId) {
      filteredInventory = inventory.filter(inv => inv.branchId === userBranchId);
    }

    return filteredInventory.map(inv => {
      const item = itemsMap.get(inv.itemId);
      const price = item?.price;
      const totalValue = (price !== undefined && inv.quantity !== undefined) ? price * inv.quantity : undefined;
      return {
        ...inv,
        branchName: branchesMap.get(inv.branchId)?.name || "Unknown Branch",
        itemName: item?.name || "Unknown Item",
        itemSku: item?.sku || "N/A",
        price: price,
        supplier: item?.supplier,
        totalValue: totalValue, // Assign total value
      };
    });
  }, [inventory, items, branches, role, userBranchId]);

  const handleManageStockClick = (inv: InventoryDoc) => {
    setSelectedInventory(inv);
    setIsManageStockFormOpen(true);
  };

  const handleDeleteClick = (inventoryId: string) => {
    setInventoryToDeleteId(inventoryId);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteInventory = async () => {
    if (!inventoryToDeleteId) return;
    try {
      await deleteDoc(doc(db, "inventory", inventoryToDeleteId));
      toast.success("Inventory record deleted successfully.");
    } catch (error) {
      console.error("Error deleting inventory record: ", error);
      toast.error("Failed to delete inventory record.");
    } finally {
      setIsDeleteAlertOpen(false);
      setInventoryToDeleteId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>View and manage stock levels across branches.</CardDescription>
            </div>
            {(role === 'admin' || role === 'manager') && (
              <Dialog open={isAddInventoryFormOpen} onOpenChange={setIsAddInventoryFormOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">Add New Inventory</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-black/20 backdrop-blur-lg border border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Inventory Record</DialogTitle>
                    <DialogDescription className="text-slate-300">
                      Create a new inventory record for an item at a specific branch.
                    </DialogDescription>
                  </DialogHeader>
                  <AddInventoryForm setDialogOpen={setIsAddInventoryFormOpen} branches={branches} items={items} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Supplier/Toko</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Total Value</TableHead> {/* Kolom baru: Total Value */}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell> {/* Skeleton untuk Total Value */}
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : processedInventory.length > 0 ? (
                processedInventory.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.branchName}</TableCell>
                    <TableCell>{inv.itemName}</TableCell>
                    <TableCell>{inv.itemSku}</TableCell>
                    <TableCell>
                      {inv.price ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(inv.price) : '-'}
                    </TableCell>
                    <TableCell>{inv.supplier || '-'}</TableCell>
                    <TableCell className="text-center">{inv.quantity}</TableCell>
                    <TableCell className="text-right">
                      {inv.totalValue ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(inv.totalValue) : '-'}
                    </TableCell> {/* Menampilkan Total Value */}
                    <TableCell className="text-right">
                      {(role === 'admin' || (role === 'manager' && inv.branchId === userBranchId)) && (
                        <div className="flex justify-end items-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleManageStockClick(inv)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {role === 'admin' && ( // Hanya admin yang bisa menghapus
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(inv.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24"> {/* Mengubah colspan */}
                    No inventory records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedInventory && (
        <ManageStockForm
          isOpen={isManageStockFormOpen}
          onClose={() => {
            setIsManageStockFormOpen(false);
            setSelectedInventory(null);
          }}
          inventoryItem={selectedInventory}
        />
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-black/20 backdrop-blur-lg border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              This action cannot be undone. This will permanently delete this inventory record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInventory} className="bg-red-600 hover:bg-red-500 text-white">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Inventory;