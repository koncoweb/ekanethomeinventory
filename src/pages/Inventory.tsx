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
import { collection, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Branch } from "./Branches";
import { Item } from "./Items";
import ManageStockForm from "@/components/ManageStockForm";

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

    return filteredInventory.map(inv => ({
      ...inv,
      branchName: branchesMap.get(inv.branchId)?.name || "Unknown Branch",
      itemName: itemsMap.get(inv.itemId)?.name || "Unknown Item",
      itemSku: itemsMap.get(inv.itemId)?.sku || "N/A",
    }));
  }, [inventory, items, branches, role, userBranchId]);

  const handleManageStockClick = (inv: InventoryDoc) => {
    setSelectedInventory(inv);
    setIsManageStockFormOpen(true);
  };

  return (
    <>
      <Card className="bg-black/20 backdrop-blur-lg border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Manajemen Inventaris</CardTitle>
          <CardDescription className="text-slate-300">Lihat dan kelola tingkat stok di seluruh cabang.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-white/10">
                <TableHead className="text-slate-200">Cabang</TableHead>
                <TableHead className="text-slate-200">Nama Barang</TableHead>
                <TableHead className="text-slate-200">SKU</TableHead>
                <TableHead className="text-slate-200 text-center">Jumlah</TableHead>
                <TableHead className="text-slate-200 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : processedInventory.length > 0 ? (
                processedInventory.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-white/10">
                    <TableCell className="font-medium text-white">{inv.branchName}</TableCell>
                    <TableCell className="text-slate-200">{inv.itemName}</TableCell>
                    <TableCell className="text-slate-200">{inv.itemSku}</TableCell>
                    <TableCell className="text-center text-slate-200">{inv.quantity}</TableCell>
                    <TableCell className="text-right">
                      {(role === 'admin' || (role === 'manager' && inv.branchId === userBranchId)) && (
                        <Button variant="ghost" size="icon" onClick={() => handleManageStockClick(inv)} className="text-slate-400 hover:text-white">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-slate-300">
                    Tidak ada catatan inventaris ditemukan.
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
    </>
  );
};

export default Inventory;