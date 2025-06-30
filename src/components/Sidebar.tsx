import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Package, Warehouse, ArrowRightLeft, LogOut, Home } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";

const navLinks = [
  { to: "/", icon: Home, label: "Dashboard" },
  { to: "/branches", icon: Building2, label: "Branches" },
  { to: "/items", icon: Package, label: "Items" },
  { to: "/inventory", icon: Warehouse, label: "Inventory" },
  { to: "/transfers", icon: ArrowRightLeft, label: "Transfers" },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "An error occurred during logout.",
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
      </nav>
      <div className="p-4 mt-auto border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;