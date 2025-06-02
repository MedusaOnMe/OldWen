import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { 
  Users, 
  DollarSign, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Settings, 
  Eye, 
  Ban, 
  Unlock,
  TrendingUp,
  Clock,
  Wallet,
  Shield,
  FileText,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  Globe,
  BarChart3,
  PieChart,
  LineChart,
  Calendar,
  CreditCard,
  Zap,
  Database,
  Server,
  Monitor
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

interface AdminStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalFunded: number;
  totalContributors: number;
  platformFees: number;
  successRate: number;
  avgCampaignSize: number;
}

interface Campaign {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  campaignType: string;
  targetAmount: number;
  currentAmount: number;
  status: string;
  createdAt: Date;
  deadline: Date;
  creatorAddress: string;
  contributorCount: number;
}

interface User {
  address: string;
  totalContributed: number;
  campaignsSupported: number;
  firstContribution: Date;
  lastActivity: Date;
  riskScore: number;
  status: 'active' | 'flagged' | 'banned';
}

interface Transaction {
  id: string;
  signature: string;
  campaignId: string;
  type: string;
  amount: number;
  status: string;
  timestamp: Date;
  fromAddress: string;
  toAddress: string;
  verificationMethod: string;
}

interface SystemHealth {
  apiStatus: 'healthy' | 'degraded' | 'down';
  dbStatus: 'healthy' | 'degraded' | 'down';
  blockchainStatus: 'healthy' | 'degraded' | 'down';
  webhookStatus: 'healthy' | 'degraded' | 'down';
  lastUpdate: Date;
  errorRate: number;
  responseTime: number;
}

const adminAPI = {
  getStats: () => axios.get<AdminStats>('/api/admin/stats'),
  getCampaigns: (filters?: any) => axios.get<Campaign[]>('/api/admin/campaigns', { params: filters }),
  getUsers: (filters?: any) => axios.get<User[]>('/api/admin/users', { params: filters }),
  getTransactions: (filters?: any) => axios.get<Transaction[]>('/api/admin/transactions', { params: filters }),
  getSystemHealth: () => axios.get<SystemHealth>('/api/admin/health'),
  updateCampaignStatus: (campaignId: string, status: string) => 
    axios.put(`/api/admin/campaigns/${campaignId}/status`, { status }),
  triggerRefund: (campaignId: string) => 
    axios.post(`/api/admin/campaigns/${campaignId}/refund`),
  banUser: (address: string) => 
    axios.post(`/api/admin/users/${address}/ban`),
  unbanUser: (address: string) => 
    axios.post(`/api/admin/users/${address}/unban`),
  triggerPurchase: (campaignId: string) => 
    axios.post(`/api/admin/campaigns/${campaignId}/purchase`),
  exportData: (type: string, filters?: any) => 
    axios.get(`/api/admin/export/${type}`, { params: filters, responseType: 'blob' }),
  reconcileBalances: () => 
    axios.post('/api/admin/reconcile'),
  pausePlatform: () => 
    axios.post('/api/admin/platform/pause'),
  resumePlatform: () => 
    axios.post('/api/admin/platform/resume')
};

export function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [campaignFilters, setCampaignFilters] = useState({});
  const [userFilters, setUserFilters] = useState({});
  const [transactionFilters, setTransactionFilters] = useState({});
  const [dateRange, setDateRange] = useState('7d');
  const [platformPaused, setPlatformPaused] = useState(false);

  // Data queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats', dateRange],
    queryFn: () => adminAPI.getStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['admin-campaigns', campaignFilters],
    queryFn: () => adminAPI.getCampaigns(campaignFilters),
    refetchInterval: 60000,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', userFilters],
    queryFn: () => adminAPI.getUsers(userFilters),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['admin-transactions', transactionFilters],
    queryFn: () => adminAPI.getTransactions(transactionFilters),
    refetchInterval: 30000,
  });

  const { data: systemHealth } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => adminAPI.getSystemHealth(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Mutations
  const updateCampaignMutation = useMutation({
    mutationFn: ({ campaignId, status }: { campaignId: string; status: string }) =>
      adminAPI.updateCampaignStatus(campaignId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast({ title: 'Campaign updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });

  const triggerRefundMutation = useMutation({
    mutationFn: (campaignId: string) => adminAPI.triggerRefund(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast({ title: 'Refund initiated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Refund failed', description: error.message, variant: 'destructive' });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: (address: string) => adminAPI.banUser(address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'User banned successfully' });
    },
    onError: (error) => {
      toast({ title: 'Ban failed', description: error.message, variant: 'destructive' });
    },
  });

  const triggerPurchaseMutation = useMutation({
    mutationFn: (campaignId: string) => adminAPI.triggerPurchase(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast({ title: 'Purchase triggered successfully' });
    },
    onError: (error) => {
      toast({ title: 'Purchase trigger failed', description: error.message, variant: 'destructive' });
    },
  });

  const reconcileBalancesMutation = useMutation({
    mutationFn: () => adminAPI.reconcileBalances(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast({ title: 'Balance reconciliation completed' });
    },
    onError: (error) => {
      toast({ title: 'Reconciliation failed', description: error.message, variant: 'destructive' });
    },
  });

  const platformControlMutation = useMutation({
    mutationFn: (action: 'pause' | 'resume') => 
      action === 'pause' ? adminAPI.pausePlatform() : adminAPI.resumePlatform(),
    onSuccess: (_, action) => {
      setPlatformPaused(action === 'pause');
      toast({ 
        title: `Platform ${action === 'pause' ? 'paused' : 'resumed'} successfully`,
        variant: action === 'pause' ? 'destructive' : 'default'
      });
    },
    onError: (error) => {
      toast({ title: 'Platform control failed', description: error.message, variant: 'destructive' });
    },
  });

  // Export functions
  const handleExport = async (type: string) => {
    try {
      const response = await adminAPI.exportData(type, { dateRange });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wendex_${type}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: `${type} data exported successfully` });
    } catch (error) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-500',
      funded: 'bg-blue-500',
      completed: 'bg-purple-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500',
      refunding: 'bg-orange-500'
    };
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}>
        {status}
      </Badge>
    );
  };

  const getHealthStatus = (status: string) => {
    const colors = {
      healthy: 'text-green-500',
      degraded: 'text-yellow-500',
      down: 'text-red-500'
    };
    return <span className={colors[status as keyof typeof colors]}>{status}</span>;
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive platform management and monitoring
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={platformPaused ? 'default' : 'destructive'}
              onClick={() => platformControlMutation.mutate(platformPaused ? 'resume' : 'pause')}
            >
              {platformPaused ? <Unlock className="mr-2 h-4 w-4" /> : <Ban className="mr-2 h-4 w-4" />}
              {platformPaused ? 'Resume Platform' : 'Pause Platform'}
            </Button>
            <Button variant="outline" onClick={() => reconcileBalancesMutation.mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reconcile Balances
            </Button>
          </div>
        </div>

        {/* Platform Status Alert */}
        {platformPaused && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Platform is currently paused. New campaigns and contributions are disabled.
            </AlertDescription>
          </Alert>
        )}

        {/* System Health Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Server className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="font-semibold">API</div>
                <div>{getHealthStatus(systemHealth?.data?.apiStatus || 'unknown')}</div>
              </div>
              <div className="text-center">
                <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="font-semibold">Database</div>
                <div>{getHealthStatus(systemHealth?.data?.dbStatus || 'unknown')}</div>
              </div>
              <div className="text-center">
                <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="font-semibold">Blockchain</div>
                <div>{getHealthStatus(systemHealth?.data?.blockchainStatus || 'unknown')}</div>
              </div>
              <div className="text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="font-semibold">Webhooks</div>
                <div>{getHealthStatus(systemHealth?.data?.webhookStatus || 'unknown')}</div>
              </div>
            </div>
            {systemHealth?.data && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Response Time: {systemHealth.data.responseTime}ms | 
                Error Rate: {systemHealth.data.errorRate.toFixed(2)}% |
                Last Update: {format(new Date(systemHealth.data.lastUpdate), 'HH:mm:ss')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.data?.totalCampaigns || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.data?.activeCampaigns || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Funded</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.data?.totalFunded?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                ${stats?.data?.avgCampaignSize?.toFixed(0) || 0} avg campaign
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contributors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.data?.totalContributors || 0}</div>
              <p className="text-xs text-muted-foreground">
                Unique addresses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.data?.successRate?.toFixed(1) || 0}%</div>
              <Progress value={stats?.data?.successRate || 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="campaigns" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Campaign Management</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('campaigns')}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Select value={campaignFilters.status || 'all'} onValueChange={(value) => 
                      setCampaignFilters({ ...campaignFilters, status: value === 'all' ? undefined : value })
                    }>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="funded">Funded</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns?.data?.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{campaign.tokenName}</div>
                            <div className="text-sm text-muted-foreground">{campaign.tokenSymbol}</div>
                          </div>
                        </TableCell>
                        <TableCell>{campaign.campaignType.replace('_', ' ')}</TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress 
                              value={(campaign.currentAmount / campaign.targetAmount) * 100} 
                              className="h-2"
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                              ${campaign.currentAmount.toFixed(0)} / ${campaign.targetAmount.toFixed(0)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>{format(new Date(campaign.createdAt), 'MMM dd')}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                setShowCampaignModal(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {campaign.status === 'funded' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => triggerPurchaseMutation.mutate(campaign.id)}
                              >
                                <Zap className="h-3 w-3" />
                              </Button>
                            )}
                            {['active', 'funded'].includes(campaign.status) && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => triggerRefundMutation.mutate(campaign.id)}
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>User Management</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('users')}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Select value={userFilters.status || 'all'} onValueChange={(value) => 
                      setUserFilters({ ...userFilters, status: value === 'all' ? undefined : value })
                    }>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="flagged">Flagged</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>Contributed</TableHead>
                      <TableHead>Campaigns</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.data?.map((user) => (
                      <TableRow key={user.address}>
                        <TableCell>
                          <code className="text-xs">
                            {user.address.slice(0, 8)}...{user.address.slice(-6)}
                          </code>
                        </TableCell>
                        <TableCell>${user.totalContributed.toLocaleString()}</TableCell>
                        <TableCell>{user.campaignsSupported}</TableCell>
                        <TableCell>
                          <Badge variant={user.riskScore > 75 ? 'destructive' : user.riskScore > 50 ? 'secondary' : 'default'}>
                            {user.riskScore}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {user.status === 'active' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => banUserMutation.mutate(user.address)}
                              >
                                <Ban className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Transaction Monitoring</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('transactions')}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Select value={transactionFilters.type || 'all'} onValueChange={(value) => 
                      setTransactionFilters({ ...transactionFilters, type: value === 'all' ? undefined : value })
                    }>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="contribution">Contributions</SelectItem>
                        <SelectItem value="refund">Refunds</SelectItem>
                        <SelectItem value="service_purchase">Purchases</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Signature</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.data?.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <code className="text-xs">
                            {tx.signature.slice(0, 8)}...{tx.signature.slice(-6)}
                          </code>
                        </TableCell>
                        <TableCell>{tx.type.replace('_', ' ')}</TableCell>
                        <TableCell>${tx.amount.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell>{format(new Date(tx.timestamp), 'MMM dd HH:mm')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.verificationMethod}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Platform Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    ${stats?.data?.platformFees?.toLocaleString() || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    2% fee on successful campaigns
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Campaign Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Enhanced Token Info</span>
                      <Badge>65%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Advertising</span>
                      <Badge>25%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Boost</span>
                      <Badge>10%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">98.5%</div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">156ms</div>
                      <div className="text-sm text-muted-foreground">Avg Response</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">99.2%</div>
                      <div className="text-sm text-muted-foreground">Payment Success</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">4.2s</div>
                      <div className="text-sm text-muted-foreground">Tx Confirmation</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Platform Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="platform-pause">Platform Status</Label>
                    <Switch 
                      id="platform-pause"
                      checked={!platformPaused}
                      onCheckedChange={(checked) => 
                        platformControlMutation.mutate(checked ? 'resume' : 'pause')
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-campaigns">Allow New Campaigns</Label>
                    <Switch id="new-campaigns" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contributions">Allow Contributions</Label>
                    <Switch id="contributions" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-purchase">Auto Purchase Services</Label>
                    <Switch id="auto-purchase" defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="min-contribution">Minimum Contribution (USDC)</Label>
                    <Input id="min-contribution" type="number" defaultValue="5" />
                  </div>
                  <div>
                    <Label htmlFor="max-contribution">Maximum Contribution (USDC)</Label>
                    <Input id="max-contribution" type="number" defaultValue="10000" />
                  </div>
                  <div>
                    <Label htmlFor="platform-fee">Platform Fee (%)</Label>
                    <Input id="platform-fee" type="number" defaultValue="2" step="0.1" />
                  </div>
                  <div>
                    <Label htmlFor="fraud-threshold">Fraud Detection Threshold</Label>
                    <Input id="fraud-threshold" type="number" defaultValue="75" />
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    System Maintenance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => reconcileBalancesMutation.mutate()}
                      disabled={reconcileBalancesMutation.isPending}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reconcile All Balances
                    </Button>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Backup Database
                    </Button>
                    <Button variant="outline">
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Campaign Detail Modal */}
        <Dialog open={showCampaignModal} onOpenChange={setShowCampaignModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Campaign Details</DialogTitle>
              <DialogDescription>
                Detailed information and management for {selectedCampaign?.tokenName}
              </DialogDescription>
            </DialogHeader>
            {selectedCampaign && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Token Address</Label>
                    <code className="block text-xs bg-muted p-2 rounded">
                      {selectedCampaign.creatorAddress}
                    </code>
                  </div>
                  <div>
                    <Label>Creator</Label>
                    <code className="block text-xs bg-muted p-2 rounded">
                      {selectedCampaign.creatorAddress}
                    </code>
                  </div>
                  <div>
                    <Label>Progress</Label>
                    <div className="space-y-1">
                      <Progress 
                        value={(selectedCampaign.currentAmount / selectedCampaign.targetAmount) * 100} 
                      />
                      <div className="text-sm text-muted-foreground">
                        ${selectedCampaign.currentAmount} / ${selectedCampaign.targetAmount}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Contributors</Label>
                    <div className="text-lg font-semibold">{selectedCampaign.contributorCount}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select 
                    value={selectedCampaign.status} 
                    onValueChange={(value) => 
                      updateCampaignMutation.mutate({ 
                        campaignId: selectedCampaign.id, 
                        status: value 
                      })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="funded">Funded</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline"
                    onClick={() => triggerPurchaseMutation.mutate(selectedCampaign.id)}
                  >
                    Trigger Purchase
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => triggerRefundMutation.mutate(selectedCampaign.id)}
                  >
                    Process Refunds
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCampaignModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Detail Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                User activity and risk assessment
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Wallet Address</Label>
                    <code className="block text-xs bg-muted p-2 rounded">
                      {selectedUser.address}
                    </code>
                  </div>
                  <div>
                    <Label>Risk Score</Label>
                    <Badge 
                      variant={selectedUser.riskScore > 75 ? 'destructive' : 
                              selectedUser.riskScore > 50 ? 'secondary' : 'default'}
                      className="text-lg"
                    >
                      {selectedUser.riskScore}/100
                    </Badge>
                  </div>
                  <div>
                    <Label>Total Contributed</Label>
                    <div className="text-lg font-semibold">${selectedUser.totalContributed.toLocaleString()}</div>
                  </div>
                  <div>
                    <Label>Campaigns Supported</Label>
                    <div className="text-lg font-semibold">{selectedUser.campaignsSupported}</div>
                  </div>
                  <div>
                    <Label>First Activity</Label>
                    <div className="text-sm">{format(new Date(selectedUser.firstContribution), 'PPP')}</div>
                  </div>
                  <div>
                    <Label>Last Activity</Label>
                    <div className="text-sm">{format(new Date(selectedUser.lastActivity), 'PPP')}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedUser.status === 'active' && (
                    <Button 
                      variant="destructive"
                      onClick={() => banUserMutation.mutate(selectedUser.address)}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Ban User
                    </Button>
                  )}
                  {selectedUser.status === 'banned' && (
                    <Button 
                      variant="outline"
                      onClick={() => banUserMutation.mutate(selectedUser.address)}
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      Unban User
                    </Button>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUserModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}