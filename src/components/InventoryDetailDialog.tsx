import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProcessedInventory } from "@/pages/Inventory";
import { format } from 'date-fns';

interface InventoryDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItem: ProcessedInventory | null;
}

export const InventoryDetailDialog = ({ isOpen, onClose, inventoryItem }: InventoryDetailDialogProps) => {
  if (!inventoryItem) return null;

  const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return format(timestamp.toDate(), 'dd MMM yyyy, HH:mm');
    }
    return 'N/A';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-black/20 backdrop-blur-lg border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Stock Details for {inventoryItem.itemName}</DialogTitle>
          <DialogDescription className="text-slate-300">
            Showing all stock entries for this item at {inventoryItem.branchName}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Price per Unit</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryItem.entries && inventoryItem.entries.length > 0 ? (
                inventoryItem.entries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDate(entry.purchaseDate)}</TableCell>
                    <TableCell>{entry.supplier}</TableCell>
                    <TableCell className="text-center">{entry.quantity}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(entry.purchasePrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(entry.totalValue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No stock entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};