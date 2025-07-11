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
import { Building2, Package, ArrowRightLeft, Bell, ArrowRight, Info, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, getCountFromServer } from "firebase/firestore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { InventoryDoc } from "./Inventory";
import { Button } from "@/components/ui/button";
import { useData } from "@/contexts/DataContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IncomingItem } from "./IncomingItems";
import { OutgoingItemDoc } from "./OutgoingItems";

interface DashboardStats {
  totalBranches: number;
  totalItems: number;
  pendingTransfers: number;
  lowStockAlerts: number;
}

interface RecentActivity {
  id: string;
  type: 'in' | 'out';
  date: Date;
  itemName: string;
  branchName: string;
  quantity: number;
}

interface RecentInventoryItem {
  id: string;
  itemName: string;
  branchName: string;
  totalQuantity: number;
}

const Index = () => {
  const { user } = useAuth();
  const { branchesMap, itemsMap, loading: dataLoading } = useData();
  const [stats, setStats] = useState<DashboardStats>({
    totalBranches: 0,
    totalItems: 0,
    pendingTransfers: 0,
    lowStockAlerts: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [recentInventory, setRecentInventory] = useState<RecentInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Eka Net Home - Inventory System - Dasbor";
    if (dataLoading) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Stats Queries (some might be inefficient, kept as is for now)
        const branchesCountQuery = getCountFromServer(collection(db, "branches"));
        const itemsCountQuery = getCountFromServer(collection(db, "items"));
        const pendingTransfersCountQuery = getCountFromServer(query(collection(db, "transfers"), where("status", "==", "pending")));
        // Note: lowStockCountQuery is likely inaccurate as `quantity` is not a root field.
        const lowStockCountQuery = getCountFromServer(query(collection(db, "inventory"), where("quantity", "<", 10)));

        // Data for new cards
        const incomingQuery = getDocs(query(collection(db, "incoming_items"), orderBy("createdAt", "desc"), limit(5)));
        const outgoingQuery = getDocs(query(collection(db, "outgoing_items"), orderBy("createdAt", "desc"), limit(5)));
        const inventoryQuery = getDocs(query(collection(db, "inventory"), orderBy("branchId"), limit(5)));

        const [
          branchesCountSnap,
          itemsCountSnap,
          pendingTransfersCountSnap,
          lowStockCountSnap,
          incomingSnapshot,
          outgoingSnapshot,
          inventorySnapshot,
        ] = await Promise.all([
          branchesCountQuery,
          itemsCountQuery,
          pendingTransfersCountQuery,
          lowStockCountQuery,
          incomingQuery,
          outgoingQuery,
          inventoryQuery,
        ]);

        setStats({
          totalBranches: branchesCountSnap.data().count,
          totalItems: itemsCountSnap.data().count,
          pendingTransfers: pendingTransfersCountSnap.data().count,
          lowStockAlerts: lowStockCountSnap.data().count,
        });

        // Process Recent Activities
        const incomingActivities: RecentActivity[] = incomingSnapshot.docs.map(doc => {
          const data = doc.data() as IncomingItem;
          return {
            id: doc.id,
            type: 'in',
            date: data.createdAt.toDate(),
            itemName: itemsMap.get(data.itemId)?.name || "Item Tidak Dikenal",
            branchName: branchesMap.get(data.branchId) || "Tidak Dikenal",
            quantity: data.quantity,
          };
        });

        const outgoingActivities: RecentActivity[] = outgoingSnapshot.docs.map(doc => {
          const data = doc.data() as OutgoingItemDoc;
          return {
            id: doc.id,
            type: 'out',
            date: data.createdAt.toDate(),
            itemName: itemsMap.get(data.itemId)?.name || "Item Tidak Dikenal",
            branchName: branchesMap.get(data.branchId) || "Tidak Dikenal",
            quantity: data.quantity,
          };
        });

        const combinedActivities = [...incomingActivities, ...outgoingActivities]
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5);
        
        setRecentActivities(combinedActivities);

        // Process Recent Inventory
        const processedInventory = inventorySnapshot.docs.map(doc => {
          const data = doc.data() as InventoryDoc;
          const totalQuantity = (data.entries || []).reduce((sum, entry) => sum + entry.quantity, 0);
          return {
            id: doc.id,
            itemName: itemsMap.get(data.itemId)?.name || "Item Tidak Dikenal",
            branchName: branchesMap.get(data.branchId) || "Cabang Tidak Dikenal",
            totalQuantity: totalQuantity,
          };
        });
        setRecentInventory(processedInventory);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Tidak dapat memuat data dasbor.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dataLoading, branchesMap, itemsMap]);

  const renderStat = (value: number) => {
    if (loading || dataLoading) return <Skeleton className="h-8 w-12 bg-white/20" />;
    return <div className="text-2xl font-bold">{value}</div>;
  };
  
  const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <Card className={`bg-black/20 backdrop-blur-lg border border-white/10 text-white ${className}`}>
      {children}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Dasbor</h1>
        <p className="text-slate-300">Selamat datang kembali, {user?.email}!</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Cabang</CardTitle>
            <Building2 className="h-4 w-4 text-slate-300" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.totalBranches)}
            <p className="text-xs text-slate-400">Semua lokasi perusahaan</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Item</CardTitle>
            <Package className="h-4 w-4 text-slate-300" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.totalItems)}
            <p className="text-xs text-slate-400">Di semua cabang</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Transfer Tertunda</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-slate-300" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.pendingTransfers)}
            <p className="text-xs text-slate-400">Menunggu persetujuan</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Peringatan Stok Rendah</CardTitle>
            <Bell className="h-4 w-4 text-slate-300" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.lowStockAlerts)}
            <p className="text-xs text-slate-400">Item perlu diisi ulang</p>
          </CardContent>
        </GlassCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <GlassCard>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription className="text-slate-300">5 pergerakan inventaris terakhir (masuk & keluar).</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || dataLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full bg-white/20" />
                <Skeleton className="h-8 w-full bg-white/20" />
                <Skeleton className="h-8 w-full bg-white/20" />
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 bg-white/10 rounded-full ${act.type === 'in' ? 'text-green-400' : 'text-orange-400'}`}>
                        {act.type === 'in' ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{act.itemName} ({act.quantity})</p>
                        <p className="text-sm text-slate-300">{act.branchName}</p>
                      </div>
                    </div>
                    <Badge variant={act.type === 'in' ? 'default' : 'destructive'} className={act.type === 'in' ? 'bg-green-600/80' : 'bg-orange-600/80'}>
                      {act.type === 'in' ? 'Masuk' : 'Keluar'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Tidak ada aktivitas terbaru ditemukan.</p>
            )}
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Inventaris Terbaru</CardTitle>
              <CardDescription className="text-slate-300">Beberapa item dalam inventaris.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="bg-transparent border-white/20 hover:bg-white/10">
              <Link to="/inventory">
                Lihat Semua
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading || dataLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full bg-white/20" />
                <Skeleton className="h-6 w-full bg-white/20" />
                <Skeleton className="h-6 w-full bg-white/20" />
              </div>
            ) : recentInventory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-slate-200">Item</TableHead>
                    <TableHead className="text-slate-200">Cabang</TableHead>
                    <TableHead className="text-right text-slate-200">Kuantitas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInventory.map((item) => (
                    <TableRow key={item.id} className="border-white/20">
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-slate-300">{item.branchName}</TableCell>
                      <TableCell className="text-right font-bold">{item.totalQuantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Tidak ada data inventaris ditemukan.</p>
            )}
          </CardContent>
        </GlassCard>

        <div className="lg:col-span-1 xl:col-span-2">
          <Alert variant="default" className="bg-black/20 backdrop-blur-lg border-yellow-400/30 text-white">
            <Info className="h-4 w-4" />
            <AlertTitle>Grafik Dinonaktifkan</AlertTitle>
            <AlertDescription>
              Grafik distribusi inventaris dinonaktifkan sementara untuk optimasi performa dan penghematan kuota baca.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

export default Index;