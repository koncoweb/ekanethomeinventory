import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { formatDateID, formatCurrencyIDR } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { NewOutgoingItemForm } from '@/components/NewOutgoingItemForm';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface OutgoingItemDoc {
  id: string;
  branchId: string;
  itemId: string;
  quantity: number;
  reason: string;
  totalValue: number;
  createdAt: Timestamp;
}

const OutgoingItems = () => {
  const { role } = useAuth();
  const { branchesMap, itemsMap } = useData();
  const [outgoingItems, setOutgoingItems] = useState<OutgoingItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "outgoing_items"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OutgoingItemDoc));
      setOutgoingItems(itemsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching outgoing items:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const canManage = role === 'admin' || role === 'manager';

  const handleTransactionComplete = () => {
    setIsFormOpen(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Riwayat Barang Keluar</CardTitle>
            <CardDescription>Daftar semua item yang telah dikeluarkan dari inventaris.</CardDescription>
          </div>
          {canManage && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Catat Barang Keluar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Formulir Barang Keluar</DialogTitle>
                </DialogHeader>
                <NewOutgoingItemForm onTransactionComplete={handleTransactionComplete} />
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Barang</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead className="text-right">Nilai Keluar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : outgoingItems.length > 0 ? (
                outgoingItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{formatDateID(item.createdAt.toDate())}</TableCell>
                    <TableCell>{itemsMap.get(item.itemId)?.name || 'Item tidak diketahui'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{branchesMap.get(item.branchId) || 'Cabang tidak diketahui'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrencyIDR(item.totalValue)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    Belum ada data barang keluar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OutgoingItems;