import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { AddUserForm } from "@/components/AddUserForm";
import { EditUserForm } from "@/components/EditUserForm";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteDoc } from "firebase/firestore";
import { Branch } from "./Branches";

export interface User {
  id: string;
  email: string;
  role: "admin" | "manager";
  branchId?: string;
  branchName?: string;
}

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || currentUser.role !== "admin") {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch branches
        const branchSnapshot = await getDocs(collection(db, "branches"));
        const branchesData = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
        setBranches(branchesData);
        const branchMap = new Map(branchesData.map(b => [b.id, b.name]));

        // Fetch users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                branchName: data.branchId ? branchMap.get(data.branchId) : 'N/A',
            } as User;
        });
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast.error("Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, addDialogOpen, editDialogOpen]);

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };
  
  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers(users.filter(user => user.id !== userId));
      toast.success("User deleted successfully.");
    } catch (error) {
      console.error("Error deleting user: ", error);
      toast.error("Failed to delete user. Note: You may need to delete the user from Firebase Authentication manually.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (currentUser?.role !== "admin") {
    return <div>You do not have permission to view this page.</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Users</h1>
        <ResponsiveDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          trigger={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add User
            </Button>
          }
          title="Add New User"
          description="Fill in the details to create a new user."
        >
          <AddUserForm setDialogOpen={setAddDialogOpen} branches={branches} />
        </ResponsiveDialog>
      </div>

      {editDialogOpen && selectedUser && (
        <ResponsiveDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          trigger={<></>}
          title="Edit User"
          description="Update the user's details."
        >
          <EditUserForm
            setDialogOpen={setEditDialogOpen}
            user={selectedUser}
            branches={branches}
          />
        </ResponsiveDialog>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.branchName || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the user account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Users;