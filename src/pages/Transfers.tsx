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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { collection, onSnapshot, getDocs, doc, updateDoc, runTransaction, getDoc, query, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { NewTransferForm } from "@/components/NewTransferForm";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Branch } from "./Branches";
import { Item } from "./Items";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/DataContext";

export interface Transfer {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  itemId: string;
  quantity: number;
  status: "pending" | "completed" | "rejected";
  createdAt: any; // Firebase Timestamp
  totalValue: number; // Menambahkan totalValue
}

const ITEMS_PER_PAGE = 10; // Jumlah item per halaman

const Transfers = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const { branches, items, loading: dataLoading } = useData();
  const [loading, setLoading] = useState(true);
  const [isAddTransferDialogOpen, setIsAddTransferDialogOpen] = useState(false);
  const [transferToProcess, setTransferToProcess] = useState<Transfer | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const { role, user } = useAuth();
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  // State untuk paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    document.title = "Eka Net Home - Inventory System - Transfer Management";
    if (user && role === 'manager') {
      const fetchUserBranch = async () => {
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists()) {
          setUserBranchId(userDocSnap.data().branchId || null);
        }
      }
      fetchUserBranch();
    }
  }, [user, role]);

  useEffect(() => {
    setLoading(true);
    let transfersQuery = query(
      collection(db, "transfers"),
      orderBy("createdAt", "desc"),
      limit(ITEMS_PER_PAGE)
    );

    if (currentPage > 1 && lastVisible) {
      transfersQuery = query(
        collection(db, "transfers"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(ITEMS_PER_PAGE)
      );
    } else if (currentPage === 1) {
      // Reset lastVisible if going back to first page
      setLastVisible(null);
    }

    const unsubscribe = onSnapshot(transfersQuery, (snapshot) => {
      const transfersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Transfer[];
      setTransfers(transfersData);
      setLoading(false);

      if (snapshot.docs.length > 0) {
        setFirstVisible(snapshot.docs[0]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
      } else {
        setFirstVisible(null);
        setLastVisible(null);
        setHasMore(false);
      }
    }, (error) => {
      console.error("Error fetching transfers: ", error);
      toast.error("Failed to fetch transfers data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentPage, lastVisible]); // lastVisible sebagai dependency untuk memicu fetch halaman berikutnya

  const processedTransfers = useMemo(() => {
    const branchesMap = new Map(branches.map(branch => [branch.id, branch.name]));
    const itemsMap = new Map(items.map(item => [item.id, item.name]));

    return transfers.map(transfer => ({
      ...transfer,
      fromBranchName: branchesMap.get(transfer.fromBranchId) || "Unknown Branch",
      toBranchName: branchesMap.get(transfer.toBranchId) || "Unknown Branch",
      itemName: itemsMap.get(transfer.itemId) || "Unknown Item",
    }));
  }, [transfers, branches, items]);

  const handleProcessTransfer = async () => {
    if (!transferToProcess || !actionType) return;

    const { fromBranchId, toBranchId, itemId, quantity, totalValue, id: transferId } = transferToProcess;

    try {
      if (actionType === "approve") {
        await runTransaction(db, async (transaction) => {
          const fromInventoryRef = doc(db, "inventory", `${fromBranchId}_${itemId}`);
          const toInventoryRef = doc(db, "inventory", `${toBranchId}_${itemId}`);
          const transferRef = doc(db, "transfers", transferId);

          const fromInventorySnap = await transaction.get(fromInventoryRef);
          const toInventorySnap = await transaction.get(toInventoryRef);

          if (!fromInventorySnap.exists() || fromInventorySnap.data().quantity < quantity) {
            throw new Error("Insufficient stock at source branch.");
          }

          // Decrease source inventory
          const fromData = fromInventorySnap.data();
          const newFromQuantity = fromData.quantity - quantity;
          const newFromTotalValue = (fromData.totalValue || 0) - totalValue;
          transaction.update(fromInventoryRef, {
            quantity: newFromQuantity,
            totalValue: newFromTotalValue,
          });

          // Increase destination inventory
          if (toInventorySnap.exists()) {
            const toData = toInventorySnap.data();
            const newToQuantity = toData.quantity + quantity;
            const newToTotalValue = (toData.totalValue || 0) + totalValue;
            transaction.update(toInventoryRef, {
              quantity: newToQuantity,
              totalValue: newToTotalValue,
            });
          } else {
            // Create new inventory record for destination
            transaction.set(toInventoryRef, {
              branchId: toBranchId,
              itemId: itemId,
              quantity: quantity,
              totalValue: totalValue,
            });
          }

          // Mark transfer as completed
          transaction.update(transferRef, { status: "completed" });
        });
        toast.success("Transfer approved and inventory updated.");
      } else if (actionType === "reject") {
        await updateDoc(doc(db, "transfers", transferId), { status: "rejected" });
        toast.info("Transfer rejected.");
      }
    } catch (error: any) {
      console.error("Error processing transfer: ", error);
      toast.error(error.message || "Failed to process transfer.");
    } finally {
      setTransferToProcess(null);
      setActionType(null);
    }
  };

  const canProcessTransfer = (transfer: Transfer) => {
    if (role === 'admin') return true;
    if (role === 'manager' && userBranchId) {
      return transfer.fromBranchId === userBranchId || transfer.toBranchId === userBranchId;
    }
    return false;
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      // Untuk kembali ke halaman sebelumnya, kita perlu query ulang dari awal
      // atau menyimpan daftar lastVisible dari setiap halaman.
      // Untuk kesederhanaan, kita akan reset lastVisible dan biarkan useEffect memicu ulang.
      setLastVisible(null); 
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Transfer Management</CardTitle>
              <CardDescription>Manage inventory transfers between branches.</CardDescription>
            </div>
            <Dialog open={isAddTransferDialogOpen} onOpenChange={setIsAddTransferDialogOpen}>
              <DialogTrigger asChild>
                <Button>New Transfer</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-black/20 backdrop-blur-lg border border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Transfer Request</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Fill in the details to request an item transfer.
                  </DialogDescription>
                </DialogHeader>
                <NewTransferForm setDialogOpen={setIsAddTransferDialogOpen} branches={branches} items={items} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From Branch</TableHead>
                <TableHead>To Branch</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || dataLoading ? (
                Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : processedTransfers.length > 0 ? (
                processedTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>{transfer.fromBranchName}</TableCell>
                    <TableCell>{transfer.toBranchName}</TableCell>
                    <TableCell>{transfer.itemName}</TableCell>
                    <TableCell className="text-center">{transfer.quantity}</TableCell>
                    <TableCell className="text-right">
                      {transfer.totalValue ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transfer.totalValue) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        transfer.status === "completed" ? "default" :
                        transfer.status === "rejected" ? "destructive" : "secondary"
                      }>
                        {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {transfer.status === "pending" && canProcessTransfer(transfer) && (
                        <div className="flex justify-end space-x-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setTransferToProcess(transfer); setActionType("approve"); }}
                              >
                                Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-black/20 backdrop-blur-lg border border-white/10 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Approve Transfer?</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-300">
                                  This action will move {transfer.quantity} of {transfer.itemName} from {transfer.fromBranchName} to {transfer.toBranchName}.
                                  This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10" onClick={() => { setTransferToProcess(null); setActionType(null); }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleProcessTransfer}>Approve</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => { setTransferToProcess(transfer); setActionType("reject"); }}
                              >
                                Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-black/20 backdrop-blur-lg border border-white/10 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Reject Transfer?</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-300">
                                  This action will reject the transfer request. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10" onClick={() => { setTransferToProcess(null); setActionType(null); }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleProcessTransfer} className="bg-red-600 hover:bg-red-500 text-white">Reject</AlertDialogAction>
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
                  <TableCell colSpan={7} className="text-center h-24">
                    No transfer requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center mt-4">
            <Button
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || loading || dataLoading}
              variant="outline"
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Previous
            </Button>
            <span className="text-white">Page {currentPage}</span>
            <Button
              onClick={handleNextPage}
              disabled={!hasMore || loading || dataLoading}
              variant="outline"
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default Transfers;