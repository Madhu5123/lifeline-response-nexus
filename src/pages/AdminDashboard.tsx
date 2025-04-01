
import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, UserRole } from "@/contexts/AuthContext";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock user registration requests for demo purposes
const mockPendingUsers: User[] = [
  {
    id: "pending-1",
    name: "David Smith",
    email: "david@ambulance.com",
    role: "ambulance",
    status: "pending",
    details: {
      organization: "City Ambulance Services",
      licenseNumber: "AMB54321",
      phone: "555-909-8765",
    }
  },
  {
    id: "pending-2",
    name: "Jennifer Lee",
    email: "jennifer@hospital.com",
    role: "hospital",
    status: "pending",
    details: {
      organization: "County Medical Center",
      position: "ER Nurse",
      address: "456 Health Blvd",
      phone: "555-123-4567",
    }
  },
  {
    id: "pending-3",
    name: "Carlos Rodriguez",
    email: "carlos@police.com",
    role: "police",
    status: "pending",
    details: {
      organization: "City Police Department",
      position: "Patrol Officer",
      phone: "555-567-8901",
    }
  },
];

// User statistics for the dashboard
const userStats = {
  ambulance: 12,
  hospital: 8,
  police: 15,
  total: 35,
  pending: 3,
  approved: 32,
  rejected: 5,
};

// Helper function to get badge color for role
const getRoleBadgeClass = (role: UserRole) => {
  switch(role) {
    case "ambulance": return "bg-emergency-ambulance text-white";
    case "hospital": return "bg-emergency-hospital text-white";
    case "police": return "bg-emergency-police text-white";
    case "admin": return "bg-green-600 text-white";
    default: return "bg-gray-500 text-white";
  }
};

const AdminDashboard: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState(mockPendingUsers);
  const { toast } = useToast();
  
  const handleApproveUser = (userId: string) => {
    // In a real app, this would make an API call to update the user's status
    setPendingUsers(pendingUsers.filter(user => user.id !== userId));
    
    toast({
      title: "User Approved",
      description: "The user has been approved and can now log in.",
    });
  };
  
  const handleRejectUser = (userId: string) => {
    // In a real app, this would make an API call to update the user's status
    setPendingUsers(pendingUsers.filter(user => user.id !== userId));
    
    toast({
      title: "User Rejected",
      description: "The user registration has been rejected.",
    });
  };

  return (
    <DashboardLayout title="Admin Dashboard" role="admin">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Users
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.total}</div>
              <p className="text-xs text-muted-foreground">
                {userStats.approved} active users
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ambulance Drivers
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
                <path d="M8 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
                <path d="M19 14v4a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-6" />
                <circle cx="14" cy="14" r="4" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.ambulance}</div>
              <p className="text-xs text-muted-foreground">
                +2 since last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Hospital Staff
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.hospital}</div>
              <p className="text-xs text-muted-foreground">
                +1 since last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Police Officers
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.police}</div>
              <p className="text-xs text-muted-foreground">
                +3 since last month
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approval Requests</CardTitle>
                <CardDescription>
                  Review and approve new user registration requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No pending approval requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map(user => (
                      <div key={user.id} className="border rounded-md p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{user.name}</h3>
                              <Badge className={getRoleBadgeClass(user.role)}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <p className="text-sm">{user.details?.organization}</p>
                            
                            {user.details?.phone && (
                              <p className="text-sm">Phone: {user.details.phone}</p>
                            )}
                            
                            {user.details?.licenseNumber && (
                              <p className="text-sm">License: {user.details.licenseNumber}</p>
                            )}
                            
                            {user.details?.position && (
                              <p className="text-sm">Position: {user.details.position}</p>
                            )}
                            
                            {user.details?.address && (
                              <p className="text-sm">Address: {user.details.address}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-200 hover:bg-red-50 text-red-700"
                              onClick={() => handleRejectUser(user.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-green-200 hover:bg-green-50 text-green-700"
                              onClick={() => handleApproveUser(user.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  Manage all registered users in the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  User management interface will be implemented here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  View system activity and audit logs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Activity log will be displayed here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
