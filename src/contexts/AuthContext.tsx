import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Import db
import { doc, getDoc } from 'firebase/firestore'; // Import doc and getDoc
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null; // Menambahkan properti role
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: null });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null); // State untuk menyimpan peran pengguna

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Jika ada pengguna yang login, ambil data perannya dari Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            // Pastikan role adalah string, jika tidak, set ke null
            const fetchedRole = typeof userData.role === 'string' ? userData.role : null;
            setUser(firebaseUser);
            setRole(fetchedRole);
          } else {
            // Pengguna ada di Auth tapi tidak di koleksi 'users' Firestore
            setUser(firebaseUser);
            setRole(null); // Atau peran default jika diperlukan
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUser(firebaseUser);
          setRole(null);
        }
      } else {
        // Tidak ada pengguna yang login
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center space-y-4">
                <h1 className="text-2xl font-bold">Loading Application...</h1>
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[300px]" />
                    <Skeleton className="h-8 w-[250px]" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading: false, role }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);