import { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useData } from '@/contexts/DataContext';
import { formatCurrencyIDR, formatDateID } from '@/lib/utils';

import { NewIncomingItemForm } from '@/components/NewIncomingItemForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Item } from './Items'; // Import Item interface

export interface IncomingItem {
  id: string;
  itemId: string;
  branchId: string;
  quantity: number;
  purchasePrice: number;
  totalValue: number;
  supplier: string;
  createdAt: Timestamp;
}

const IncomingItems = () => {
  const [incomingItems, setIncomingItems] = useState<IncomingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { itemsMap, branchesMap } = useData();

  const fetchIncomingItems = useCallback(() => {
    const q = query(collection(db, "incoming_items"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncomingItem));
      setIncomingItems(itemsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching incoming items:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchIncomingItems();
    return () => unsubscribe();
  }, [fetchIncomingItems]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Barang Masuk</h1>
      
      <NewIncomingItemForm onTransactionComplete={fetchIncomingItems} />

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Barang Masuk</CardTitle>
          <CardDescription>Daftar semua transaksi barang yang telah dicatat.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Barang</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Pemasok</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Total Nilai</TableHead>
                <TableHead>Tanggal Masuk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : incomingItems.length > 0 ? (
                incomingItems.map((item) => {
                  const itemData = itemsMap.get(item.itemId); // Get the Item object
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{itemData?.name || 'N/A'}</TableCell>
                      <TableCell>{branchesMap.get(item.branchId) || 'N/A'}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell className="text-right">{formatCurrencyIDR(item.purchasePrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyIDR(item.totalValue)}</TableCell>
                      <TableCell>{item.createdAt ? formatDateID(item.createdAt.toDate()) : 'N/A'}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Belum ada riwayat barang masuk.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomingItems;