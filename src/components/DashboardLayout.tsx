
import React, { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Handle click outside to close the sidebar on mobile
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarOpen && window.innerWidth < 1024) {
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
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div 
        className={cn(
          "fixed inset-0 flex z-40 lg:hidden transition-opacity duration-300 ease-in-out",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        role="dialog" 
        aria-modal="true"
      >
        <div 
          className={cn(
            "fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-in-out duration-300",
            sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        ></div>

        {/* Mobile Sidebar Content */}
        <div 
          id="mobile-sidebar"
          className={cn(
            "relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 transition-transform ease-in-out duration-300",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            role === "ambulance" ? "ambulance-gradient" : null,
            role === "hospital" ? "hospital-gradient" : null,
            role === "police" ? "police-gradient" : null,
            role === "admin" ? "admin-gradient" : null,
          )}
        >
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <Button
              variant="ghost"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex-shrink-0 flex items-center px-4">
            <h1 className="text-xl font-bold text-white">Lifeline Response</h1>
          </div>
          
          {/* Scrollable sidebar content for mobile */}
          <ScrollArea className="mt-5 flex-1 h-0 overflow-y-auto">
            <div className="px-2 space-y-1">
              {/* Sidebar content here */}
              <div className="px-4 py-4 text-sm text-white">
                <div className="font-medium mb-1">
                  {user?.name}
                </div>
                <div className="opacity-80 text-xs">
                  {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
                </div>
              </div>
              
              {/* Mobile logout button */}
              <div className="mt-auto px-4 py-4">
                <Button 
                  variant="ghost" 
                  className="group flex items-center text-white hover:bg-white hover:bg-opacity-10 rounded-md w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-3 h-6 w-6" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
      
      {/* Static sidebar for desktop */}
      <div className={cn(
        "hidden lg:flex lg:flex-shrink-0 transition-all",
        role === "ambulance" ? "ambulance-gradient" : null,
        role === "hospital" ? "hospital-gradient" : null,
        role === "police" ? "police-gradient" : null,
        role === "admin" ? "admin-gradient" : null,
      )}>
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-white">Lifeline Response</h1>
              </div>
              <ScrollArea className="mt-5 flex-1 px-4 space-y-1">
                {/* Sidebar content here */}
                <div className="px-4 py-4 text-sm text-white">
                  <div className="font-medium mb-1">
                    {user?.name}
                  </div>
                  <div className="opacity-80 text-xs">
                    {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
                  </div>
                </div>
              </ScrollArea>
            </div>
            <div className="flex-shrink-0 flex border-t border-white border-opacity-20 p-4">
              <Button 
                variant="ghost" 
                className="group flex items-center text-white hover:bg-white hover:bg-opacity-10 rounded-md w-full"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-6 w-6" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <Button
            variant="ghost"
            className="lg:hidden px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </Button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <Button variant="ghost" className="p-1 rounded-full text-gray-400 hover:text-gray-500 relative">
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" aria-hidden="true" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
              </Button>
              
              <div className="ml-3 relative hidden lg:block">
                <Button
                  variant="ghost"
                  className="group flex items-center text-gray-500 hover:text-gray-900"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
