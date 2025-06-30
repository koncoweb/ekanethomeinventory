import { useState, useEffect, useMemo, useRef } from "react";
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
import { collection, onSnapshot, doc, getDoc, deleteDoc, query, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { PlusCircle, Eye, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/contexts/DataContext";
import { AddStockForm } from "@/components/AddStockForm";
import { InventoryDetailDialog } from "@/components/InventoryDetailDialog";
import { AddInventoryForm } from "@/components/AddInventoryForm"; // Import the form
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
} from "@/components/ui/alert-dialog";

// New Data Structures
export interface InventoryEntry {
  quantity: number;
  purchasePrice: number;
  supplier: string;
  purchaseDate: any; // Firebase Timestamp
  totalValue: number;
}

export interface InventoryDoc {
  id: string;
  branchId: string;
  itemId: string;
  entries: InventoryEntry[];
  rackLocation?: string;
}

export interface ProcessedInventory extends InventoryDoc {
  branchName: string;
  itemName: string;
  itemSku: string;
  totalQuantity: number;
  totalValue: number;
  averagePrice: number;
}

const ITEMS_PER_PAGE = 15;

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryDoc[]>([]);
  const { branches, items, loading: dataLoading } = useData();
  const [loading, setLoading] = useState(true);
  const { role, user } = useAuth();
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  
  // State for dialogs
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false); // State for the new form
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<ProcessedInventory | null>(null);
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [inventoryToDeleteId, setInventoryToDeleteId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageCursorsRef = useRef<Array<QueryDocumentSnapshot<DocumentData> | null>>([null]);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    document.title = "Eka Net Home - Inventory System - Inventory Management";
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
    if (dataLoading) {
      setLoading(true);
      return;
    }

    setLoading(true);
    let inventoryQuery = query(
      collection(db, "inventory"),
      orderBy("branchId"),
      orderBy("itemId"),
      limit(ITEMS_PER_PAGE)
    );

    const currentCursor = pageCursorsRef.current[currentPage - 1];
    if (currentCursor) {
      inventoryQuery = query(
        collection(db, "inventory"),
        orderBy("branchId"),
        orderBy("itemId"),
        startAfter(currentCursor),
        limit(ITEMS_PER_PAGE)
      );
    }

    const unsubscribe = onSnapshot(inventoryQuery, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryDoc[];
      setInventory(inventoryData);
      setLoading(false);

      if (snapshot.docs.length > 0) {
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        if (pageCursorsRef.current.length <= currentPage) {
          pageCursorsRef.current.push(lastDoc);
        } else {
          pageCursorsRef.current[currentPage] = lastDoc;
        }
        setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    }, (error) => {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to fetch inventory data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentPage, dataLoading]);

  const processedInventory: ProcessedInventory[] = useMemo(() => {
    const itemsMap = new Map(items.map(item => [item.id, item]));
    const branchesMap = new Map(branches.map(branch => [branch.id, branch.name]));

    let filteredInventory = inventory;
    if (role === 'manager' && userBranchId) {
      filteredInventory = inventory.filter(inv => inv.branchId === userBranchId);
    }

    return filteredInventory.map(inv => {
      const item = itemsMap.get(inv.itemId);
      const entries = inv.entries || [];
      
      const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
      const totalValue = entries.reduce((sum, entry) => sum + entry.totalValue, 0);
      const averagePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;

      return {
        ...inv,
        branchName: branchesMap.get(inv.branchId) || "Unknown Branch",
        itemName: item?.name || "Unknown Item",
        itemSku: item?.sku || "N/A",
        totalQuantity,
        totalValue,
        averagePrice,
      };
    }).filter(inv => inv.totalQuantity > 0); // Only show items with stock
  }, [inventory, items, branches, role, userBranchId]);

  const handleAddStockClick = (inv: ProcessedInventory) => {
    setSelectedInventory(inv);
    setIsAddStockOpen(true);
  };

  const handleViewDetailsClick = (inv: ProcessedInventory) => {
    setSelectedInventory(inv);
    setIsDetailOpen(true);
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

  const handleNextPage = () => {
    if (hasMore) setCurrentPage(prev => prev + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
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
            {role === 'admin' && (
              <Dialog open={isAddInventoryOpen} onOpenChange={setIsAddInventoryOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Initial Stock
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-black/20 backdrop-blur-lg border border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add Initial Stock</DialogTitle>
                    <DialogDescription className="text-slate-300">
                      Create the first inventory record for an item at a specific branch.
                    </DialogDescription>
                  </DialogHeader>
                  <AddInventoryForm 
                    setDialogOpen={setIsAddInventoryOpen} 
                    branches={branches} 
                    items={items} 
                  />
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
                <TableHead className="text-center">Total Quantity</TableHead>
                <TableHead className="text-right">Avg. Price</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || dataLoading ? (
                Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : processedInventory.length > 0 ? (
                processedInventory.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.branchName}</TableCell>
                    <TableCell>{inv.itemName}</TableCell>
                    <TableCell>{inv.itemSku}</TableCell>
                    <TableCell className="text-center">{inv.totalQuantity}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inv.averagePrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inv.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(role === 'admin' || (role === 'manager' && inv.branchId === userBranchId)) && (
                        <div className="flex justify-end items-center space-x-1">
                          <Button variant="outline" size="sm" onClick={() => handleAddStockClick(inv)}>
                            <PlusCircle className="h-4 w-4 mr-1" /> Add
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleViewDetailsClick(inv)}>
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                          {role === 'admin' && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(inv.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    No inventory records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center mt-4">
            <Button onClick={handlePreviousPage} disabled={currentPage === 1 || loading || dataLoading} variant="outline">
              Previous
            </Button>
            <span className="text-sm">Page {currentPage}</span>
            <Button onClick={handleNextPage} disabled={!hasMore || loading || dataLoading} variant="outline">
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Stock Dialog */}
      <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
        <DialogContent className="sm:max-w-[425px] bg-black/20 backdrop-blur-lg border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Stock for {selectedInventory?.itemName}</DialogTitle>
            <DialogDescription className="text-slate-300">
              Enter new stock details for this item at {selectedInventory?.branchName}.
            </DialogDescription>
          </DialogHeader>
          {selectedInventory && <AddStockForm inventoryItem={selectedInventory} onClose={() => setIsAddStockOpen(false)} />}
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <InventoryDetailDialog 
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        inventoryItem={selectedInventory}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-black/20 backdrop-blur-lg border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              This action cannot be undone. This will permanently delete this entire inventory record and all its stock entries.
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