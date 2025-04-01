import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, UserRole } from "@/contexts/AuthContext";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState({
    ambulance: 0,
    hospital: 0,
    police: 0,
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const usersRef = collection(db, "users");
    
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      let ambulanceCount = 0;
      let hospitalCount = 0;
      let policeCount = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      
      snapshot.forEach((doc) => {
        const userData = doc.data();
        
        if (userData.role === "ambulance") ambulanceCount++;
        if (userData.role === "hospital") hospitalCount++;
        if (userData.role === "police") policeCount++;
        
        if (userData.status === "pending") pendingCount++;
        if (userData.status === "approved") approvedCount++;
        if (userData.status === "rejected") rejectedCount++;
      });
      
      setUserStats({
        ambulance: ambulanceCount,
        hospital: hospitalCount,
        police: policeCount,
        total: snapshot.size,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      });
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user statistics",
        variant: "destructive",
      });
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [toast]);
  
  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("status", "==", "pending"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const users: User[] = [];
          snapshot.forEach((doc) => {
            users.push({
              id: doc.id,
              ...doc.data()
            } as User);
          });
          
          setPendingUsers(users);
        }, (error) => {
          console.error("Error fetching pending users:", error);
          toast({
            title: "Error",
            description: "Failed to fetch pending users",
            variant: "destructive",
          });
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up pending users listener:", error);
        toast({
          title: "Error",
          description: "Failed to fetch pending users",
          variant: "destructive",
        });
      }
    };
    
    fetchPendingUsers();
  }, [toast]);
  
  const handleApproveUser = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        status: "approved",
      });
      
      toast({
        title: "User Approved",
        description: "The user has been approved and can now log in.",
      });
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    }
  };
  
  const handleRejectUser = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        status: "rejected",
      });
      
      toast({
        title: "User Rejected",
        description: "The user registration has been rejected.",
      });
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout title="Admin Dashboard" role="admin">
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="space-y-6 pb-8">
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
                  Active ambulance drivers
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
                  Active hospital users
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
                  Active police officers
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="w-full sm:w-auto flex overflow-x-auto">
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
                  {loading ? (
                    <div className="text-center py-4">
                      Loading pending approvals...
                    </div>
                  ) : pendingUsers.length === 0 ? (
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
      </ScrollArea>
    </DashboardLayout>
  );
};

export default AdminDashboard;
