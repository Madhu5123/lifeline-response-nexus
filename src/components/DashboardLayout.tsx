
import React, { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, X, Home, Users, Clipboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role: UserRole;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  title,
  role 
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const isMobile = useIsMobile();
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Get nav items based on role
  const getNavItems = () => {
    switch(role) {
      case "admin":
        return [
          { icon: Home, label: "Dashboard", path: "/admin" },
          { icon: Users, label: "Users", path: "/admin/users" },
          { icon: Settings, label: "Settings", path: "/admin/settings" }
        ];
      case "ambulance":
        return [
          { icon: Home, label: "Dashboard", path: "/ambulance" },
          { icon: Clipboard, label: "Cases", path: "/ambulance/cases" }
        ];
      case "hospital":
        return [
          { icon: Home, label: "Dashboard", path: "/hospital" },
          { icon: Clipboard, label: "Patients", path: "/hospital/patients" }
        ];
      case "police":
        return [
          { icon: Home, label: "Dashboard", path: "/police" },
          { icon: Clipboard, label: "Reports", path: "/police/reports" }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  // Handle click outside to close the sidebar on mobile
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarOpen && isMobile) {
        const sidebar = document.getElementById('mobile-sidebar');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen, isMobile]);

  const getRoleBgColor = () => {
    switch(role) {
      case "ambulance": return "ambulance-gradient";
      case "hospital": return "hospital-gradient";
      case "police": return "police-gradient";
      case "admin": return "admin-gradient";
      default: return "admin-gradient";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Mobile Header */}
      <header className="flex items-center justify-between p-4 bg-white shadow-sm z-30">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold truncate">{title}</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
          </Button>
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-gray-600 bg-opacity-75 z-40 transition-opacity duration-300 lg:hidden",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Mobile Sidebar */}
      <div 
        id="mobile-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 flex flex-col w-64 z-50 transform transition-transform duration-300 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          getRoleBgColor()
        )}
      >
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-white">Lifeline Response</h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white hover:bg-opacity-10"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="px-4 py-3 border-b border-white border-opacity-20">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <span className="text-white font-semibold">{user?.name?.charAt(0) || 'U'}</span>
            </div>
            <div>
              <div className="text-white font-medium">{user?.name}</div>
              <div className="text-white text-opacity-80 text-xs">
                {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
              </div>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {navItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white hover:bg-opacity-10 py-3"
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setSidebarOpen(false);
                }}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-white border-opacity-20">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-white hover:bg-white hover:bg-opacity-10"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-white border-r fixed h-full">
        <div className={cn("p-4", getRoleBgColor())}>
          <h1 className="text-xl font-bold text-white">Lifeline Response</h1>
        </div>
        
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="font-semibold">{user?.name?.charAt(0) || 'U'}</span>
            </div>
            <div>
              <div className="font-medium">{user?.name}</div>
              <div className="text-gray-500 text-xs">
                {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
              </div>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:text-gray-800 hover:bg-gray-100 py-3"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </nav>
        </ScrollArea>
        
        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-0 lg:pt-4 lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 pt-4">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
