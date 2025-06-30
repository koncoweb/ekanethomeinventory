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
    <aside className="w-64 bg-black/20 backdrop-blur-lg border-r border-white/10 flex-col hidden md:flex">
      <div className="p-4 border-b border-white/10">
        <NavLink to="/" className="flex items-center gap-2">
          <Package className="h-6 w-6 text-white" />
          <h1 className="text-base font-bold text-white">Eka Net Home Inventory</h1>
        </NavLink>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map((link) => (
          <NavLink
            key={link.label}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-white/10 ${
                isActive ? "bg-white/20 text-white font-semibold" : ""
              }`
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
        {role === 'admin' && (
          <>
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase">
              Admin
            </div>
            {adminLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-white/10 ${
                    isActive ? "bg-white/20 text-white font-semibold" : ""
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
      <div className="p-4 mt-auto border-t border-white/10">
        <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-white/10 hover:text-white" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;