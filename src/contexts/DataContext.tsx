import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Branch } from '@/pages/Branches';
import { Item } from '@/pages/Items';
import { toast } from 'sonner';

interface DataContextValue {
  branches: Branch[];
  items: Item[];
  branchesMap: Map<string, string>;
  itemsMap: Map<string, Item>;
  loading: boolean;
  error: Error | null;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const branchesSnapshot = await getDocs(collection(db, "branches"));
        const fetchedBranches = branchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Branch[];
        setBranches(fetchedBranches);

        const itemsSnapshot = await getDocs(collection(db, "items"));
        const fetchedItems = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Item[];
        setItems(fetchedItems);
        
        setError(null);
      } catch (err) {
        console.error("Failed to fetch common data:", err);
        setError(err as Error);
        toast.error("Failed to load essential application data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const branchesMap = useMemo(() => new Map(branches.map(b => [b.id, b.name])), [branches]);
  const itemsMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  const value = { branches, items, branchesMap, itemsMap, loading, error };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};