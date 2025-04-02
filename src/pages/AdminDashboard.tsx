
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, UserRole } from "@/contexts/AuthContext";
import { Check, X, Users, Clipboard, AlertCircle, UserCheck, UserX } from "lucide-react";
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
        <div className="space-y-8 pb-8 px-2">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-xl overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{userStats.total}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {userStats.approved} active users
                </p>
              </CardContent>
            </Card>
            
            <Card className="rounded-xl overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30">
                <CardTitle className="text-sm font-medium">
                  Ambulance Drivers
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-red-600 dark:text-red-300">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.6-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                    <circle cx="7" cy="17" r="2"></circle>
                    <path d="M9 17h6"></path>
                    <circle cx="17" cy="17" r="2"></circle>
                  </svg>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{userStats.ambulance}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Active ambulance drivers
                </p>
              </CardContent>
            </Card>
            
            <Card className="rounded-xl overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30">
                <CardTitle className="text-sm font-medium">
                  Hospital Staff
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-blue-600 dark:text-blue-300">
                    <path d="M19 9h-5V4H8v5H3v8h5v5h6v-5h5V9z"></path>
                  </svg>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{userStats.hospital}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Active hospital users
                </p>
              </CardContent>
            </Card>
            
            <Card className="rounded-xl overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30">
                <CardTitle className="text-sm font-medium">
                  Police Officers
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-green-600 dark:text-green-300">
                    <path d="M12 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm7 11h-1v-5.7c0-1.8-3.1-3.1-6-3.1s-6 1.3-6 3.1V15H5c-.6 0-1 .4-1 1v3c0 .6.4 1 1 1h14c.6 0 1-.4 1-1v-3c0-.6-.4-1-1-1zm-13-2v-3.7c0-.5 2-1.3 4-1.3s4 .8 4 1.3V13H6zm4 4.5L8.5 16l1.5-1.5L11.5 16l-1.5 1.5z"></path>
                  </svg>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{userStats.police}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Active police officers
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="w-full sm:w-auto flex overflow-x-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-full h-14">
              <TabsTrigger value="pending" className="rounded-full flex items-center space-x-2 px-5 h-12">
                <AlertCircle className="h-4 w-4" />
                <span>Pending Approvals</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="rounded-full flex items-center space-x-2 px-5 h-12">
                <Users className="h-4 w-4" />
                <span>All Users</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-full flex items-center space-x-2 px-5 h-12">
                <Clipboard className="h-4 w-4" />
                <span>Activity Log</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Pending Approvals</h2>
                <Badge variant="outline" className="font-normal bg-yellow-50 text-yellow-700 border-yellow-200 px-3 py-1">
                  {userStats.pending} pending
                </Badge>
              </div>
              
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <UserCheck className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    No pending approval requests at the moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map(user => (
                    <Card key={user.id} className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-lg font-medium text-gray-700 dark:text-gray-300">
                                {user.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <h3 className="font-semibold">{user.name}</h3>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                              <Badge className={`ml-2 ${getRoleBadgeClass(user.role)}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </Badge>
                            </div>
                            
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {user.details?.organization && (
                                <div>
                                  <span className="text-gray-500">Organization:</span> {user.details.organization}
                                </div>
                              )}
                              
                              {user.details?.phone && (
                                <div>
                                  <span className="text-gray-500">Phone:</span> {user.details.phone}
                                </div>
                              )}
                              
                              {user.details?.licenseNumber && (
                                <div>
                                  <span className="text-gray-500">License:</span> {user.details.licenseNumber}
                                </div>
                              )}
                              
                              {user.details?.position && (
                                <div>
                                  <span className="text-gray-500">Position:</span> {user.details.position}
                                </div>
                              )}
                              
                              {user.details?.address && (
                                <div className="md:col-span-2">
                                  <span className="text-gray-500">Address:</span> {user.details.address}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 md:self-end">
                            <Button 
                              variant="outline" 
                              className="rounded-full border-red-200 hover:bg-red-50 text-red-700 flex items-center gap-1 px-4"
                              onClick={() => handleRejectUser(user.id)}
                            >
                              <X className="h-4 w-4" />
                              <span>Reject</span>
                            </Button>
                            <Button 
                              className="rounded-full bg-green-600 hover:bg-green-700 flex items-center gap-1 px-4"
                              onClick={() => handleApproveUser(user.id)}
                            >
                              <Check className="h-4 w-4" />
                              <span>Approve</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="users" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">All Users</h2>
                <Badge variant="outline" className="font-normal bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                  {userStats.total} users
                </Badge>
              </div>
              
              <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Users className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  User management interface will be implemented here.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="activity" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Activity Log</h2>
                <Badge variant="outline" className="font-normal bg-purple-50 text-purple-700 border-purple-200 px-3 py-1">
                  System
                </Badge>
              </div>
              
              <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Clipboard className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  Activity log will be displayed here.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
};

export default AdminDashboard;
