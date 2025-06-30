import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { AuthProvider } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext"; // New import
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Branches from "./pages/Branches";
import Items from "./pages/Items";
import Inventory from "./pages/Inventory";
import Transfers from "./pages/Transfers";
import Users from "./pages/Users";
import Tutorial from "./pages/Tutorial"; // New import

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <DataProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/branches" element={<Branches />} />
                  <Route path="/items" element={<Items />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/transfers" element={<Transfers />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/tutorial" element={<Tutorial />} /> {/* New route */}
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DataProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;