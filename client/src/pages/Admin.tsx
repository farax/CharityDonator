import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Donation {
  id: number;
  type: string;
  amount: number;
  currency: string;
  frequency: string;
  status: string;
  paymentMethod: string | null;
  stripePaymentId: string | null;
  caseId: number | null;
  destinationProject: string | null;
  createdAt: string;
  email: string | null;
  name: string | null;
}

interface PaymentStatistics {
  totalDonations: number;
  totalDonated: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  byDestination: Record<string, number>;
}

const statusColors: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'processing': 'bg-blue-100 text-blue-800',
  'completed': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800',
  'unknown': 'bg-gray-100 text-gray-800'
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch payment history
  const { 
    data: paymentHistory, 
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery({
    queryKey: ['/api/payment-history'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });
  
  // Fetch payment statistics
  const { 
    data: paymentStats, 
    isLoading: isLoadingStats,
    error: statsError
  } = useQuery({
    queryKey: ['/api/payment-statistics'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });
  
  // Check for 401 Unauthorized errors
  useEffect(() => {
    if (historyError || statsError) {
      const error = historyError || statsError;
      if (error instanceof Error && 'status' in error && error.status === 401) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access the admin dashboard",
          variant: "destructive",
        });
        setLocation('/admin/login');
      }
    }
  }, [historyError, statsError, toast, setLocation]);
  
  if (isLoadingHistory || isLoadingStats) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (historyError || statsError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">There was a problem fetching the payment data.</p>
        </div>
      </div>
    );
  }
  
  const donations = paymentHistory as Donation[];
  const stats = paymentStats as PaymentStatistics;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Payment Dashboard</h1>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await apiRequest('POST', '/api/admin/logout');
                  toast({
                    title: "Logged out",
                    description: "You have been logged out successfully",
                  });
                  setLocation('/admin/login');
                } catch (error) {
                  toast({
                    title: "Logout failed",
                    description: "There was a problem logging out",
                    variant: "destructive",
                  });
                }
              }}
            >
              Logout
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Total Donations</CardTitle>
                    <CardDescription>Number of donation attempts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats?.totalDonations || 0}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Total Amount</CardTitle>
                    <CardDescription>Successfully processed donations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">${stats?.totalDonated.toFixed(2) || '0.00'}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Success Rate</CardTitle>
                    <CardDescription>Completed vs total donations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {stats && stats.totalDonations > 0
                        ? `${Math.round((stats.byStatus.completed || 0) / stats.totalDonations * 100)}%`
                        : '0%'
                      }
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Most Popular</CardTitle>
                    <CardDescription>Most used payment method</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold capitalize">
                      {stats && Object.entries(stats.byPaymentMethod).length > 0
                        ? Object.entries(stats.byPaymentMethod)
                            .sort((a, b) => b[1] - a[1])[0][0]
                            .replace('_', ' ')
                        : 'None'
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Last 5 donation attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donations && donations.length > 0 ? (
                        [...donations]
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .slice(0, 5)
                          .map((donation) => (
                            <TableRow key={donation.id}>
                              <TableCell>{donation.id}</TableCell>
                              <TableCell className="capitalize">{donation.type}</TableCell>
                              <TableCell>{donation.currency} {donation.amount.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge className={statusColors[donation.status] || statusColors.unknown}>
                                  {donation.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="capitalize">{donation.paymentMethod?.replace('_', ' ') || 'Unknown'}</TableCell>
                              <TableCell>{new Date(donation.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="transactions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                  <CardDescription>Complete history of all donations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {donations && donations.length > 0 ? (
                          [...donations]
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((donation) => (
                              <TableRow key={donation.id}>
                                <TableCell>{donation.id}</TableCell>
                                <TableCell className="capitalize">{donation.type}</TableCell>
                                <TableCell>{donation.currency} {donation.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge className={statusColors[donation.status] || statusColors.unknown}>
                                    {donation.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="capitalize">{donation.paymentMethod?.replace('_', ' ') || 'Unknown'}</TableCell>
                                <TableCell>
                                  {donation.caseId ? `Case ID: ${donation.caseId}` : 
                                  donation.destinationProject || 'Unknown'}
                                </TableCell>
                                <TableCell>{new Date(donation.createdAt).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="statistics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Donations by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {stats && Object.entries(stats.byStatus).length > 0 ? (
                        Object.entries(stats.byStatus)
                          .sort((a, b) => b[1] - a[1])
                          .map(([status, count]) => (
                            <li key={status} className="flex justify-between items-center">
                              <span className="capitalize">
                                <Badge className={statusColors[status] || statusColors.unknown}>
                                  {status}
                                </Badge>
                              </span>
                              <span className="font-medium">{count} donations</span>
                            </li>
                          ))
                      ) : (
                        <li className="text-center py-4 text-gray-500">No data available</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Donations by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {stats && Object.entries(stats.byType).length > 0 ? (
                        Object.entries(stats.byType)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, count]) => (
                            <li key={type} className="flex justify-between items-center">
                              <span className="capitalize">{type}</span>
                              <span className="font-medium">{count} donations</span>
                            </li>
                          ))
                      ) : (
                        <li className="text-center py-4 text-gray-500">No data available</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Donations by Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {stats && Object.entries(stats.byPaymentMethod).length > 0 ? (
                        Object.entries(stats.byPaymentMethod)
                          .sort((a, b) => b[1] - a[1])
                          .map(([method, count]) => (
                            <li key={method} className="flex justify-between items-center">
                              <span className="capitalize">{method.replace('_', ' ')}</span>
                              <span className="font-medium">{count} donations</span>
                            </li>
                          ))
                      ) : (
                        <li className="text-center py-4 text-gray-500">No data available</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Donations by Destination</CardTitle>
                    <CardDescription>Completed donations only</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {stats && Object.entries(stats.byDestination).length > 0 ? (
                        Object.entries(stats.byDestination)
                          .sort((a, b) => b[1] - a[1])
                          .map(([destination, amount]) => (
                            <li key={destination} className="flex justify-between items-center">
                              <span>{destination}</span>
                              <span className="font-medium">${amount.toFixed(2)}</span>
                            </li>
                          ))
                      ) : (
                        <li className="text-center py-4 text-gray-500">No completed donations</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}