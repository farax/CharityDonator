import { useEffect, useState } from 'react';
import { Loader2, Calendar } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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

interface ClinicStats {
  id: number;
  totalPatients: number;
  monthlyPatients: number;
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
  
  // Filter states
  const [donationType, setDonationType] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    // Default to first day of current month
    const date = new Date();
    date.setDate(1); // First day of month
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
  });
  
  // For patient stats management
  const [totalPatients, setTotalPatients] = useState<string>('');
  const [monthlyPatients, setMonthlyPatients] = useState<string>('');
  const [statsUpdateMessage, setStatsUpdateMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
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
  
  // Fetch clinic statistics (for patient counts)
  const {
    data: clinicStats,
    isLoading: isLoadingClinicStats,
    error: clinicStatsError,
    refetch: refetchClinicStats
  } = useQuery<ClinicStats>({
    queryKey: ['/api/stats']
  });
  
  // Check for authentication status and redirect if unauthorized
  useEffect(() => {
    // First, attempt to verify admin status with a simple request
    const checkAdminStatus = async () => {
      try {
        const res = await apiRequest('GET', '/api/payment-history');
        if (!res.ok) {
          if (res.status === 401) {
            toast({
              title: "Authentication Required",
              description: "Please log in to access the admin dashboard",
              variant: "destructive",
            });
            setLocation('/admin/login');
          }
        }
      } catch (error) {
        toast({
          title: "Authentication Error",
          description: "Unable to verify authentication status",
          variant: "destructive",
        });
        setLocation('/admin/login');
      }
    };
    
    checkAdminStatus();
  }, [toast, setLocation]);
  
  // Effect to initialize form fields when clinic stats are loaded
  useEffect(() => {
    if (clinicStats) {
      const stats = clinicStats as ClinicStats;
      setTotalPatients(stats.totalPatients.toString());
      setMonthlyPatients(stats.monthlyPatients.toString());
    }
  }, [clinicStats]);
  
  // Handler for updating patient stats
  const handleUpdateStats = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatsUpdateMessage(null);
    
    try {
      const totalPatientsNum = parseInt(totalPatients);
      const monthlyPatientsNum = parseInt(monthlyPatients);
      
      if (isNaN(totalPatientsNum) || isNaN(monthlyPatientsNum)) {
        setStatsUpdateMessage({
          type: 'error',
          message: 'Both fields must be valid numbers'
        });
        return;
      }
      
      if (totalPatientsNum < 0 || monthlyPatientsNum < 0) {
        setStatsUpdateMessage({
          type: 'error',
          message: 'Patient counts cannot be negative'
        });
        return;
      }
      
      const response = await apiRequest('POST', '/api/admin/update-stats', {
        totalPatients: totalPatientsNum,
        monthlyPatients: monthlyPatientsNum
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update statistics');
      }
      
      // Refresh the stats data
      await refetchClinicStats();
      
      setStatsUpdateMessage({
        type: 'success',
        message: 'Patient statistics updated successfully'
      });
      
      toast({
        title: "Statistics Updated",
        description: "Patient counts have been updated successfully",
      });
    } catch (error: any) {
      setStatsUpdateMessage({
        type: 'error',
        message: error.message || 'Failed to update statistics'
      });
      
      toast({
        title: "Update Failed",
        description: error.message || 'Failed to update statistics',
        variant: "destructive",
      });
    }
  };

  if (isLoadingHistory || isLoadingStats || isLoadingClinicStats) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (historyError || statsError || clinicStatsError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">There was a problem fetching the data.</p>
        </div>
      </div>
    );
  }
  
  const donations = paymentHistory as Donation[];
  const stats = paymentStats as PaymentStatistics;
  const clinicStatsData = clinicStats as ClinicStats;
  
  // Filter donations based on selected type and date range
  const filteredDonations = donations ? donations.filter(donation => {
    // Filter by type
    if (donationType !== 'all' && donation.type !== donationType) {
      return false;
    }
    
    // Filter by date range
    const donationDate = new Date(donation.createdAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the full end date
    
    return donationDate >= start && donationDate <= end;
  }) : [];
  
  // Calculate summary for filtered donations
  const filteredSummary = {
    count: filteredDonations.length,
    totalIncoming: filteredDonations
      .filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + d.amount, 0),
    totalOutgoing: 0, // Placeholder for outgoing funds (not in current data model)
    byType: filteredDonations.reduce((acc, donation) => {
      const type = donation.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
  
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
              <TabsTrigger value="manage-stats">Manage Stats</TabsTrigger>
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
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Filter Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Donation Type Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="donationType">Donation Type</Label>
                      <Select
                        value={donationType}
                        onValueChange={setDonationType}
                      >
                        <SelectTrigger id="donationType">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="zakaat">Zakaat</SelectItem>
                          <SelectItem value="sadqah">Sadqah</SelectItem>
                          <SelectItem value="interest">Interest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Date Range - Start */}
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 opacity-50" />
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {/* Date Range - End */}
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 opacity-50" />
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Filter Summary */}
              {filteredDonations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Filter Summary</CardTitle>
                    <CardDescription>
                      Showing {filteredDonations.length} {donationType === 'all' ? '' : donationType} donations from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Total Donations</h3>
                        <p className="text-2xl font-bold">{filteredSummary.count}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Total Incoming</h3>
                        <p className="text-2xl font-bold text-green-600">
                          ${filteredSummary.totalIncoming.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Total Outgoing</h3>
                        <p className="text-2xl font-bold text-red-600">
                          ${filteredSummary.totalOutgoing.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {donationType === 'all' && Object.keys(filteredSummary.byType).length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Breakdown by Type</h3>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(filteredSummary.byType).map(([type, count]) => (
                            <Badge key={type} variant="outline" className="capitalize">
                              {type}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Filtered Transactions</CardTitle>
                  <CardDescription>
                    {filteredDonations.length 
                      ? `Showing ${filteredDonations.length} ${donationType === 'all' ? '' : donationType} donations` 
                      : 'No donations match the selected filters'}
                  </CardDescription>
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
                        {filteredDonations.length > 0 ? (
                          filteredDonations
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
                              No transactions found matching the filters
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
            
            <TabsContent value="manage-stats" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Update Patient Statistics</CardTitle>
                  <CardDescription>
                    Use this form to update the patient count displayed on the homepage.
                    Changes are immediate and do not require a server restart.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateStats} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Current Values Display */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg font-medium">Current Values</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-500">Total Patients</p>
                              <p className="text-xl font-bold">{clinicStatsData?.totalPatients || 'Loading...'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Monthly Patients</p>
                              <p className="text-xl font-bold">{clinicStatsData?.monthlyPatients || 'Loading...'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Update Form */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="totalPatients">Total Patients</Label>
                          <Input
                            id="totalPatients"
                            type="number"
                            placeholder="Enter total patients"
                            value={totalPatients}
                            onChange={(e) => setTotalPatients(e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="monthlyPatients">Monthly Patients</Label>
                          <Input
                            id="monthlyPatients"
                            type="number"
                            placeholder="Enter monthly patients"
                            value={monthlyPatients}
                            onChange={(e) => setMonthlyPatients(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Message */}
                    {statsUpdateMessage && (
                      <div className={`p-3 rounded-md ${
                        statsUpdateMessage.type === 'success' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {statsUpdateMessage.message}
                      </div>
                    )}
                    
                    <Button type="submit">
                      Update Statistics
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}