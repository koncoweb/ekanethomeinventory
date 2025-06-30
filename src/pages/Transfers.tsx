import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, getDocs, runTransaction, doc, query, where, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Branch } from "./Branches";
import { Item } from "./Items";
import { InventoryDoc } from "./Inventory";
import NewTransferForm from "@/components/NewTransferForm";
import { ArrowRight } from "lucide-react";

interface TransferDoc {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  itemId: string;
  quantity: number;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: any;
}

interface ProcessedTransfer extends TransferDoc {
  fromBranchName: string;
  toBranchName: string;
  itemName: string;
  itemSku: string;
}

const Transfers = () => {
  const [transfers, setTransfers] = useState<TransferDoc[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [inventory, setInventory] = useState<InventoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { role, user } = useAuth();
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const isAdminOrManager = role === 'admin' || role === 'manager';

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const branchesSnapshot = await getDocs(collection(db, "branches"));
        setBranches(branchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Branch[]);

        const itemsSnapshot = await getDocs(collection(db, "items"));
        setItems(itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Item[]);

        const inventorySnapshot = await getDocs(collection(db, "inventory"));
        setInventory(inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryDoc[]);

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

    const unsubscribe = onSnapshot(collection(db, "transfers"), (snapshot) => {
      const transfersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TransferDoc[];
      setTransfers(transfersData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transfers:", error);
      toast.error("Failed to fetch transfers data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, role]);

  const processedTransfers = useMemo(() => {
    const itemsMap = new Map(items.map(item => [item.id, item]));
    const branchesMap = new Map(branches.map(branch => [branch.id, branch]));

    return transfers.map(t => ({
      ...t,
      fromBranchName: branchesMap.get(t.fromBranchId)?.name || "N/A",
      toBranchName: branchesMap.get(t.toBranchId)?.name || "N/A",
      itemName: itemsMap.get(t.itemId)?.name || "Unknown Item",
      itemSku: itemsMap.get(t.itemId)?.sku || "N/A",
    }));
  }, [transfers, items, branches]);

  const handleApproveTransfer = async (transfer: ProcessedTransfer) => {
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Define document references
        const transferRef = doc(db, "transfers", transfer.id);
        const fromInventoryQuery = query(collection(db, "inventory"), where("branchId", "==", transfer.fromBranchId), where("itemId", "==", transfer.itemId));
        const toInventoryQuery = query(collection(db, "inventory"), where("branchId", "==", transfer.toBranchId), where("itemId", "==", transfer.itemId));

        // 2. Get inventory documents
        const fromInventorySnapshot = await getDocs(fromInventoryQuery);
        if (fromInventorySnapshot.empty) throw new Error("Source inventory not found.");
        const fromInventoryRef = fromInventorySnapshot.docs[0].ref;
        const fromInventoryData = fromInventorySnapshot.docs[0].data();

        // 3. Check for sufficient stock
        if (fromInventoryData.quantity < transfer.quantity) {
          throw new Error("Insufficient stock at source branch.");
        }

        // 4. Update source inventory
        transaction.update(fromInventoryRef, { quantity: fromInventoryData.quantity - transfer.quantity });

        // 5. Update destination inventory (or create if not exists)
        const toInventorySnapshot = await getDocs(toInventoryQuery);
        if (!toInventorySnapshot.empty) {
          const toInventoryRef = toInventorySnapshot.docs[0].ref;
          const toInventoryData = toInventorySnapshot.docs[0].data();
          transaction.update(toInventoryRef, { quantity: toInventoryData.quantity + transfer.quantity });
        } else {
          const newInventoryRef = doc(collection(db, "inventory"));
          transaction.set(newInventoryRef, {
            branchId: transfer.toBranchId,
            itemId: transfer.itemId,
            quantity: transfer.quantity,
          });
        }

        // 6. Update transfer status
        transaction.update(transferRef, { status: "completed" });
      });

      toast.success("Transfer approved and stock updated successfully!");
    } catch (error: any) {
      console.error("Transfer approval failed:", error);
      toast.error(error.message || "Failed to approve transfer.");
    }
  };

  const getStatusBadge = (status: TransferDoc['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Inventory Transfers</CardTitle>
              <CardDescription>Track and manage item movements between branches.</CardDescription>
            </div>
            {isAdminOrManager && (
              <Button onClick={() => setIsFormOpen(true)}>New Transfer</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Transfer Route</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : processedTransfers.length > 0 ? (
                processedTransfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.itemName}</div>
                      <div className="text-sm text-muted-foreground">{t.itemSku}</div>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <span>{t.fromBranchName}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span>{t.toBranchName}</span>
                    </TableCell>
                    <TableCell className="text-center">{t.quantity}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(t.status)}</TableCell>
                    <TableCell className="text-right">
                      {role === 'admin' && t.status === 'pending' && (
                        <Button size="sm" onClick={() => handleApproveTransfer(t)}>Approve (Admin)</Button>
                      )}
                      {role === 'manager' && t.toBranchId === userBranchId && t.status === 'pending' && (
                        <Button size="sm" onClick={() => handleApproveTransfer(t)}>Approve</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No transfers found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <NewTransferForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        branches={branches}
        items={items}
        inventory={inventory}
      />
    </>
  );
};
export default Transfers;