import { useState, useEffect, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { EditUserForm } from "@/components/EditUserForm";
import { AddUserForm } from "@/components/AddUserForm";
import { Branch } from "./Branches";
import { Badge } from "@/components/ui/badge";

export interface UserData {
  id: string;
  email: string;
  role: "admin" | "manager";
  branchId?: string;
}

const Users = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  useEffect(() => {
    document.title = "Eka Net Home - Inventory System - User Management";
    const fetchBranches = async () => {
      try {
        const branchesSnapshot = await getDocs(collection(db, "branches"));
        setBranches(branchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Branch[]);
      } catch (error) {
        console.error("Error fetching branches:", error);
        toast.error("Failed to load branch data.");
      }
    };

    fetchBranches();

    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserData[];
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      toast.error("Failed to fetch users data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const processedUsers = useMemo(() => {
    const branchesMap = new Map(branches.map(branch => [branch.id, branch.name]));
    return users.map(user => ({
      ...user,
      branchName: user.branchId ? branchesMap.get(user.branchId) || "Invalid Branch" : "N/A",
    }));
  }, [users, branches]);

  const handleEditClick = (user: UserData) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  return (
    <Card className="bg-black/20 backdrop-blur-lg border border-white/10 text-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Manajemen Pengguna</CardTitle>
            <CardDescription className="text-slate-300">Kelola akun pengguna dan izin.</CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">Tambah Pengguna</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-black/20 backdrop-blur-lg border border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Tambah Pengguna Baru</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Buat akun pengguna baru dan tetapkan peran.
                  </DialogDescription>
                </DialogHeader>
                <AddUserForm setDialogOpen={setIsAddDialogOpen} branches={branches} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-white/10">
              <TableHead className="text-slate-200">Email</TableHead>
              <TableHead className="text-slate-200">Peran</TableHead>
              <TableHead className="text-slate-200">Cabang Ditugaskan</TableHead>
              <TableHead className="text-slate-200 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : processedUsers.length > 0 ? (
              processedUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-white/10">
                  <TableCell className="font-medium text-white">{user.email}</TableCell>
                  <TableCell className="text-slate-200">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-200">{user.branchName}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(user)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-300">
                  Tidak ada pengguna ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {editingUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-black/20 backdrop-blur-lg border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Pengguna</DialogTitle>
              <DialogDescription className="text-slate-300">
                Perbarui peran dan cabang untuk pengguna ini.
              </DialogDescription>
            </DialogHeader>
            <EditUserForm
              setDialogOpen={setIsEditDialogOpen}
              user={editingUser}
              branches={branches}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default Users;