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
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Branch } from "./Branches";
import EditUserForm from "@/components/EditUserForm";

export interface UserData {
  id: string; // Firestore document ID (same as auth uid)
  email: string;
  role: 'admin' | 'manager' | 'staff';
  branchId?: string;
}

const Users = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { role } = useAuth();

  useEffect(() => {
    if (role !== 'admin') return;

    const fetchBranches = async () => {
      try {
        const branchesSnapshot = await getDocs(collection(db, "branches"));
        setBranches(branchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Branch[]);
      } catch (error) {
        toast.error("Failed to fetch branches.");
      }
    };

    fetchBranches();

    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserData[];
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [role]);

  const branchesMap = useMemo(() => {
    return new Map(branches.map(branch => [branch.id, branch.name]));
  }, [branches]);

  const handleEditClick = (user: UserData) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  if (role !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user roles and branch assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Branch</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-10 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                    <TableCell>{user.branchId ? branchesMap.get(user.branchId) || 'N/A' : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {editingUser && (
        <EditUserForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingUser(null); }}
          user={editingUser}
          branches={branches}
        />
      )}
    </>
  );
};

export default Users;