import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
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

export interface ProcessedInventoryItem {
  id: string;
  branchId: string;
  branchName: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
}

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryDoc[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdminOrManager = role === 'admin' || role === 'manager';

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const branchesSnapshot = await getDocs(collection(db, "branches"));
        const branchesData = branchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Branch[];
        setBranches(branchesData);

        const itemsSnapshot = await getDocs(collection(db, "items"));
        const itemsData = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Item[];
        setItems(itemsData);
      } catch (error) {
        console.error("Error fetching initial data: ", error);
        toast({ title: "Error", description: "Failed to fetch branches or items.", variant: "destructive" });
      }
    };

    fetchInitialData();

    const unsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryDoc[];
      setInventory(inventoryData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching inventory: ", error);
      toast({ title: "Error", description: "Failed to fetch inventory data.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const processedInventory = useMemo(() => {
    if (items.length === 0 || branches.length === 0) return [];
    const itemsMap = new Map(items.map(item => [item.id, item]));
    const branchesMap = new Map(branches.map(branch => [branch.id, branch]));

    return inventory.map(inv => {
      const item = itemsMap.get(inv.itemId);
      const branch = branchesMap.get(inv.branchId);
      return {
        id: inv.id,
        branchId: inv.branchId,
        branchName: branch?.name || "Unknown Branch",
        itemId: inv.itemId,
        itemName: item?.name || "Unknown Item",
        itemSku: item?.sku || "N/A",
        quantity: inv.quantity,
      };
    });
  }, [inventory, items, branches]);

  const filteredInventory = useMemo(() => {
    if (selectedBranch === "all") {
      return processedInventory;
    }
    return processedInventory.filter(item => item.branchId === selectedBranch);
  }, [processedInventory, selectedBranch]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Inventory Management</CardTitle>
            <CardDescription>View and manage stock levels across branches.</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdminOrManager && (
              <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">Manage Stock</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredInventory.length > 0 ? (
              filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell>{item.itemSku}</TableCell>
                  <TableCell>{item.branchName}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No inventory records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      
      <ManageStockForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        branches={branches}
        items={items}
      />
    </Card>
  );
};

export default Inventory;