import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Package, Warehouse, ArrowRightLeft, LogOut, Home, Users } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { to: "/", icon: Home, label: "Dasbor" },
  { to: "/branches", icon: Building2, label: "Cabang" },
  { to: "/items", icon: Package, label: "Item" },
  { to: "/inventory", icon: Warehouse, label: "Inventaris" },
  { to: "/transfers", icon: ArrowRightLeft, label: "Transfer" },
];

const adminLinks = [
  { to: "/users", icon: Users, label: "Pengguna" },
]

const Sidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Berhasil Keluar",
        description: "Anda telah berhasil keluar.",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Gagal Keluar",
        description: "Terjadi kesalahan saat keluar.",
        variant: "destructive",
      });
    }
  };

  return (
    <aside className="w-64 bg-card border-r flex-col hidden md:flex">
      <div className="p-4 border-b">
        <NavLink to="/" className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">ISP Inventory</h1>
        </NavLink>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map((link) => (
          <NavLink
            key={link.label}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                isActive ? "bg-muted text-primary font-semibold" : ""
              }`
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
        {role === 'admin' && (
          <>
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
              Admin
            </div>
            {adminLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                    isActive ? "bg-muted text-primary font-semibold" : ""
                  }`
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="p-4 mt-auto border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;