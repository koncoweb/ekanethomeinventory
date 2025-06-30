import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Package, ArrowRightLeft, Bell, ArrowRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Item } from "./Items";
import { Branch } from "./Branches";
import { Transfer } from "./Transfers";
import { InventoryDoc } from "./Inventory";
import { Button } from "@/components/ui/button";
import BranchInventoryChart from "@/components/BranchInventoryChart"; // Import komponen grafik baru

interface DashboardStats {
  totalBranches: number;
  totalItems: number;
  pendingTransfers: number;
  lowStockAlerts: number;
}

interface ProcessedTransfer extends Transfer {
  itemName: string;
  fromBranchName: string;
  toBranchName: string;
}

interface ProcessedLowStockItem extends InventoryDoc {
  itemName: string;
  branchName: string;
}

interface BranchInventoryData {
  name: string;
  totalQuantity: number;
}

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBranches: 0,
    totalItems: 0,
    pendingTransfers: 0,
    lowStockAlerts: 0,
  });
  const [recentTransfers, setRecentTransfers] = useState<ProcessedTransfer[]>([]);
  const [lowStockItems, setLowStockItems] = useState<ProcessedLowStockItem[]>([]);
  const [branchInventoryChartData, setBranchInventoryChartData] = useState<BranchInventoryData[]>([]); // State baru untuk data grafik
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const lowStockThreshold = 10;

        // Define all queries
        const branchesQuery = getDocs(collection(db, "branches"));
        const itemsQuery = getDocs(collection(db, "items"));
        const pendingTransfersQuery = getDocs(query(collection(db, "transfers"), where("status", "==", "pending")));
        const lowStockQuery = getDocs(query(collection(db, "inventory"), where("quantity", "<", lowStockThreshold)));
        const recentTransfersQuery = getDocs(query(collection(db, "transfers"), orderBy("createdAt", "desc"), limit(5)));
        const allInventoryQuery = getDocs(collection(db, "inventory")); // Query baru untuk semua inventaris

        const [
          branchesSnapshot,
          itemsSnapshot,
          pendingTransfersSnapshot,
          lowStockSnapshot,
          recentTransfersSnapshot,
          allInventorySnapshot, // Snapshot baru
        ] = await Promise.all([
          branchesQuery,
          itemsQuery,
          pendingTransfersQuery,
          lowStockQuery,
          recentTransfersQuery,
          allInventoryQuery, // Tambahkan ke Promise.all
        ]);

        // Create maps for easy data lookup
        const branchesData = branchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Branch[];
        const branchesMap = new Map(branchesData.map(b => [b.id, b.name]));
        const itemsData = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Item[];
        const itemsMap = new Map(itemsData.map(i => [i.id, i]));

        // Set stats
        setStats({
          totalBranches: branchesSnapshot.size,
          totalItems: itemsSnapshot.size,
          pendingTransfers: pendingTransfersSnapshot.size,
          lowStockAlerts: lowStockSnapshot.size,
        });

        // Process and set recent transfers
        const processedTransfers = recentTransfersSnapshot.docs.map(doc => {
          const data = doc.data() as Transfer;
          return {
            ...data,
            id: doc.id,
            itemName: itemsMap.get(data.itemId)?.name || "Unknown Item",
            fromBranchName: branchesMap.get(data.fromBranchId) || "Unknown",
            toBranchName: branchesMap.get(data.toBranchId) || "Unknown",
          };
        });
        setRecentTransfers(processedTransfers);

        // Process and set low stock items (show up to 5)
        const processedLowStock = lowStockSnapshot.docs.slice(0, 5).map(doc => {
          const data = doc.data() as InventoryDoc;
          return {
            ...data,
            id: doc.id,
            itemName: itemsMap.get(data.itemId)?.name || "Unknown Item",
            branchName: branchesMap.get(data.branchId) || "Unknown Branch",
          };
        });
        setLowStockItems(processedLowStock);

        // Process and set branch inventory chart data
        const inventoryByBranch: { [key: string]: number } = {};
        allInventorySnapshot.docs.forEach(doc => {
          const data = doc.data() as InventoryDoc;
          if (inventoryByBranch[data.branchId]) {
            inventoryByBranch[data.branchId] += data.quantity;
          } else {
            inventoryByBranch[data.branchId] = data.quantity;
          }
        });

        const processedBranchInventoryData: BranchInventoryData[] = Object.keys(inventoryByBranch).map(branchId => ({
          name: branchesMap.get(branchId) || "Unknown Branch",
          totalQuantity: inventoryByBranch[branchId],
        }));
        setBranchInventoryChartData(processedBranchInventoryData);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const renderStat = (value: number) => {
    if (loading) return <Skeleton className="h-8 w-12" />;
    return <div className="text-2xl font-bold">{value}</div>;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.email}! Here's an overview of your inventory.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.totalBranches)}
            <p className="text-xs text-muted-foreground">All company locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.totalItems)}
            <p className="text-xs text-muted-foreground">Across all branches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.pendingTransfers)}
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.lowStockAlerts)}
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>The last 5 inventory transfers.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : recentTransfers.length > 0 ? (
              <div className="space-y-4">
                {recentTransfers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-muted rounded-full">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{t.itemName} ({t.quantity})</p>
                        <p className="text-sm text-muted-foreground">{t.fromBranchName} → {t.toBranchName}</p>
                      </div>
                    </div>
                    <Badge variant={t.status === "completed" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}>
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent transfers found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Items with quantities less than 10.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/inventory">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : lowStockItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>{item.branchName}</TableCell>
                      <TableCell className="text-right font-bold text-destructive">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No low stock items. Great job!</p>
            )}
          </CardContent>
        </Card>

        {/* Komponen grafik baru */}
        <BranchInventoryChart data={branchInventoryChartData} loading={loading} />
      </div>
    </div>
  );
};

export default Index;