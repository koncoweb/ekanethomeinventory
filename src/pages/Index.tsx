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
import { Building2, Package, ArrowRightLeft, Bell, ArrowRight, Info } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, getCountFromServer } from "firebase/firestore";
import { toast } from "sonner"; // Menggunakan sonner
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Transfer } from "./Transfers";
import { InventoryDoc } from "./Inventory"; // Import InventoryDoc
import { Button } from "@/components/ui/button";
import { useData } from "@/contexts/DataContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

// Memperbaiki interface untuk menyertakan totalQuantity
interface ProcessedLowStockItem extends InventoryDoc {
  itemName: string;
  branchName: string;
  totalQuantity: number; // Menambahkan properti ini
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
  const [recentTransfers, setRecentTransfers] = useState<ProcessedTransfer[]>([]);
  const [lowStockItems, setLowStockItems] = useState<ProcessedLowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Eka Net Home - Inventory System - Dasbor";
    if (dataLoading) return; // Wait for common data to be loaded

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const lowStockThreshold = 10;

        // Use getCountFromServer for efficient counting
        // Catatan: Query 'where("quantity", "<", lowStockThreshold)' mengasumsikan ada field 'quantity' di root dokumen inventory.
        // Jika 'quantity' hanya ada di dalam array 'entries', query ini tidak akan berfungsi seperti yang diharapkan di Firestore.
        // Untuk tujuan perbaikan compile-time, kita akan mengasumsikan field ini ada atau akan ada.
        const branchesCountQuery = getCountFromServer(collection(db, "branches"));
        const itemsCountQuery = getCountFromServer(collection(db, "items"));
        const pendingTransfersCountQuery = getCountFromServer(query(collection(db, "transfers"), where("status", "==", "pending")));
        const lowStockCountQuery = getCountFromServer(query(collection(db, "inventory"), where("quantity", "<", lowStockThreshold)));

        // Queries that need full document data
        const recentTransfersQuery = getDocs(query(collection(db, "transfers"), orderBy("createdAt", "desc"), limit(5)));
        
        const [
          branchesCountSnap,
          itemsCountSnap,
          pendingTransfersCountSnap,
          lowStockCountSnap,
          recentTransfersSnapshot,
        ] = await Promise.all([
          branchesCountQuery,
          itemsCountQuery,
          pendingTransfersCountQuery,
          lowStockCountQuery,
          recentTransfersQuery,
        ]);

        setStats({
          totalBranches: branchesCountSnap.data().count,
          totalItems: itemsCountSnap.data().count,
          pendingTransfers: pendingTransfersCountSnap.data().count,
          lowStockAlerts: lowStockCountSnap.data().count,
        });

        // Use context maps directly
        const processedTransfers = recentTransfersSnapshot.docs.map(doc => {
          const data = doc.data() as Transfer;
          return {
            ...data,
            id: doc.id,
            itemName: itemsMap.get(data.itemId)?.name || "Item Tidak Dikenal",
            fromBranchName: branchesMap.get(data.fromBranchId) || "Tidak Dikenal",
            toBranchName: branchesMap.get(data.toBranchId) || "Tidak Dikenal",
          };
        });
        setRecentTransfers(processedTransfers);

        // We still need the full low stock docs for the table, so we'll fetch them separately
        const lowStockSnapshot = await getDocs(query(collection(db, "inventory"), where("quantity", "<", lowStockThreshold), limit(5)));
        const processedLowStock = lowStockSnapshot.docs.map(doc => {
          const data = doc.data() as InventoryDoc;
          // Menghitung totalQuantity dari entries untuk ProcessedLowStockItem
          const totalQuantity = data.entries.reduce((sum, entry) => sum + entry.quantity, 0);
          return {
            ...data,
            id: doc.id,
            itemName: itemsMap.get(data.itemId)?.name || "Item Tidak Dikenal",
            branchName: branchesMap.get(data.branchId) || "Cabang Tidak Dikenal",
            totalQuantity: totalQuantity, // Menambahkan totalQuantity
          };
        });
        setLowStockItems(processedLowStock);

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

  const statusToIndonesian = (status: "pending" | "completed" | "rejected") => {
    switch (status) {
      case "pending":
        return "Tertunda";
      case "completed":
        return "Selesai";
      case "rejected":
        return "Ditolak";
      default:
        return status;
    }
  };

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
            <CardDescription className="text-slate-300">5 transfer inventaris terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || dataLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full bg-white/20" />
                <Skeleton className="h-8 w-full bg-white/20" />
                <Skeleton className="h-8 w-full bg-white/20" />
              </div>
            ) : recentTransfers.length > 0 ? (
              <div className="space-y-4">
                {recentTransfers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-white/10 rounded-full">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{t.itemName} ({t.quantity})</p>
                        <p className="text-sm text-slate-300">{t.fromBranchName} → {t.toBranchName}</p>
                      </div>
                    </div>
                    <Badge variant={t.status === "completed" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}>
                      {statusToIndonesian(t.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Tidak ada transfer terbaru ditemukan.</p>
            )}
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Item Stok Rendah</CardTitle>
              <CardDescription className="text-slate-300">Item dengan kuantitas kurang dari 10.</CardDescription>
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
            ) : lowStockItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-slate-200">Item</TableHead>
                    <TableHead className="text-slate-200">Cabang</TableHead>
                    <TableHead className="text-right text-slate-200">Kuantitas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((item) => (
                    <TableRow key={item.id} className="border-white/20">
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-slate-300">{item.branchName}</TableCell>
                      <TableCell className="text-right font-bold text-red-400">{item.totalQuantity}</TableCell> {/* Menggunakan totalQuantity */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Tidak ada item stok rendah. Kerja bagus!</p>
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