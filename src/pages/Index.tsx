import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Package, ArrowRightLeft, Bell } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalBranches: number;
  totalItems: number;
  pendingTransfers: number;
  lowStockAlerts: number;
}

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBranches: 0,
    totalItems: 0,
    pendingTransfers: 0,
    lowStockAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const lowStockThreshold = 10;

        const branchesQuery = getDocs(collection(db, "branches"));
        const itemsQuery = getDocs(collection(db, "items"));
        const pendingTransfersQuery = getDocs(query(collection(db, "transfers"), where("status", "==", "pending")));
        const lowStockQuery = getDocs(query(collection(db, "inventory"), where("quantity", "<", lowStockThreshold)));

        const [
          branchesSnapshot,
          itemsSnapshot,
          pendingTransfersSnapshot,
          lowStockSnapshot,
        ] = await Promise.all([
          branchesQuery,
          itemsQuery,
          pendingTransfersQuery,
          lowStockQuery,
        ]);

        setStats({
          totalBranches: branchesSnapshot.size,
          totalItems: itemsSnapshot.size,
          pendingTransfers: pendingTransfersSnapshot.size,
          lowStockAlerts: lowStockSnapshot.size,
        });
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
    if (loading) {
      return <Skeleton className="h-8 w-12" />;
    }
    return <div className="text-2xl font-bold">{value}</div>;
  };

  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default Index;