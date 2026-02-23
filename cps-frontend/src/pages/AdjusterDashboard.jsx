import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { claimsApi, notesApi, alertsApi, analyticsApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Shield, LogOut, FileText, Users, AlertTriangle, CheckCircle2, 
  XCircle, Clock, Eye, Send, RefreshCw, ChevronRight, Bell,
  BarChart3, TrendingUp, DollarSign, Filter, Search
} from 'lucide-react';
import { format } from 'date-fns';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const AdjusterDashboard = () => {
  const { user, logout } = useAuth();
  const [claims, setClaims] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('queue');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const [claimsRes, alertsRes, analyticsRes] = await Promise.all([
        claimsApi.getAll(params),
        alertsApi.getAll({ resolved: false }),
        analyticsApi.getDashboard()
      ]);
      setClaims(claimsRes.data);
      setAlerts(alertsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClaim = async (claimId) => {
    try {
      await claimsApi.assign(claimId);
      toast.success('Claim assigned to you');
      fetchData();
      if (selectedClaim?.id === claimId) {
        const response = await claimsApi.getById(claimId);
        setSelectedClaim(response.data);
      }
    } catch (error) {
      toast.error('Failed to assign claim');
    }
  };

  const handleApproveClaim = async (claimId) => {
    try {
      await claimsApi.approve(claimId);
      toast.success('Claim approved');
      fetchData();
      setSelectedClaim(null);
    } catch (error) {
      toast.error('Failed to approve claim');
    }
  };

  const handleRejectClaim = async (claimId) => {
    try {
      await claimsApi.reject(claimId);
      toast.success('Claim rejected');
      fetchData();
      setSelectedClaim(null);
    } catch (error) {
      toast.error('Failed to reject claim');
    }
  };

  const handleTriggerFraudAnalysis = async (claimId) => {
    try {
      await claimsApi.analyzeFraud(claimId);
      toast.success('Fraud analysis triggered');
    } catch (error) {
      toast.error('Failed to trigger analysis');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedClaim) return;
    try {
      await notesApi.create(selectedClaim.id, newNote);
      toast.success('Note added');
      setNewNote('');
      const notesRes = await notesApi.getAll(selectedClaim.id);
      setNotes(notesRes.data);
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await alertsApi.resolve(alertId);
      toast.success('Alert resolved');
      fetchData();
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  const openClaimDetails = async (claim) => {
    setSelectedClaim(claim);
    try {
      const notesRes = await notesApi.getAll(claim.id);
      setNotes(notesRes.data);
    } catch (error) {
      setNotes([]);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      submitted: { color: 'bg-blue-50 text-blue-700 border-blue-100', icon: Clock },
      under_review: { color: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle },
      approved: { color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
      rejected: { color: 'bg-red-50 text-red-700 border-red-100', icon: XCircle },
    };
    const config = statusConfig[status] || statusConfig.submitted;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getRiskBadge = (score) => {
    if (score === null || score === undefined) return null;
    const config = score > 70 ? { color: 'bg-red-100 text-red-700', label: 'High Risk' } :
                   score > 40 ? { color: 'bg-amber-100 text-amber-700', label: 'Medium Risk' } :
                   { color: 'bg-emerald-100 text-emerald-700', label: 'Low Risk' };
    return <Badge className={config.color}>{score}% - {config.label}</Badge>;
  };

  const filteredClaims = claims.filter(claim => 
    claim.claim_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.claimant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const COLORS = ['#1e40af', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-[#1e40af]" />
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">TrustClaim</h1>
                <p className="text-xs text-slate-500">Adjuster Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Bell className="h-5 w-5 text-slate-500" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {alerts.length}
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-btn">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="queue" data-testid="queue-tab">
              <FileText className="h-4 w-4 mr-2" />
              Claims Queue
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="analytics-tab">
              <BarChart3 className="h-4 w-4 mr-2" />
              Fraud Analytics
            </TabsTrigger>
            <TabsTrigger value="alerts" data-testid="alerts-tab">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts ({alerts.length})
            </TabsTrigger>
          </TabsList>

          {/* Claims Queue Tab */}
          <TabsContent value="queue">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Total Claims</p>
                      <p className="text-2xl font-bold text-slate-900">{analytics?.total_claims || 0}</p>
                    </div>
                    <FileText className="h-8 w-8 text-[#1e40af]" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Pending Review</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {(analytics?.status_distribution?.submitted || 0) + (analytics?.status_distribution?.under_review || 0)}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">High Risk Alerts</p>
                      <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Total Amount</p>
                      <p className="text-2xl font-bold text-slate-900">${(analytics?.total_amount || 0).toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search claims..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-claims-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="status-filter-select">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Claims</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Claims Table */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-['Plus_Jakarta_Sans']">Claims Queue</CardTitle>
                <CardDescription>Review and process insurance claims</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e40af]"></div>
                  </div>
                ) : filteredClaims.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No claims found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Claim</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Claimant</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClaims.map((claim) => (
                          <tr key={claim.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{claim.claim_number}</p>
                              <p className="text-xs text-slate-500">{format(new Date(claim.created_at), 'MMM d, yyyy')}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-slate-900">{claim.claimant_name}</p>
                              <p className="text-xs text-slate-500">{claim.claimant_email}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="capitalize text-sm text-slate-700">{claim.claim_type}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-900">${claim.amount.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(claim.status)}</td>
                            <td className="px-4 py-3">{getRiskBadge(claim.risk_score)}</td>
                            <td className="px-4 py-3">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openClaimDetails(claim)}
                                data-testid={`view-claim-${claim.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fraud Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Claims Trend */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#1e40af]" />
                    Claims Trend (30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={analytics?.trend_data || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line type="monotone" dataKey="count" stroke="#1e40af" strokeWidth={2} dot={{ fill: '#1e40af' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="font-['Plus_Jakarta_Sans']">Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={Object.entries(analytics?.status_distribution || {}).map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {Object.keys(analytics?.status_distribution || {}).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Claims by Type */}
              <Card className="bg-white border-slate-200 md:col-span-2">
                <CardHeader>
                  <CardTitle className="font-['Plus_Jakarta_Sans']">Claims by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics?.type_distribution || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="type" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                        formatter={(value, name) => [name === 'amount' ? `$${value.toLocaleString()}` : value, name]}
                      />
                      <Bar dataKey="count" fill="#1e40af" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Fraud Alerts
                </CardTitle>
                <CardDescription>High-risk claims requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                    <p className="font-medium text-emerald-700">All clear!</p>
                    <p className="text-sm">No pending fraud alerts</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`p-4 rounded-lg border ${
                          alert.severity === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`h-5 w-5 mt-0.5 ${alert.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                            <div>
                              <p className="font-medium text-slate-900">{alert.claim_number}</p>
                              <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                              <p className="text-xs text-slate-500 mt-2">{format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}</p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleResolveAlert(alert.id)}
                            data-testid={`resolve-alert-${alert.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Claim Detail Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedClaim && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="font-['Plus_Jakarta_Sans'] text-xl">{selectedClaim.claim_number}</DialogTitle>
                    <DialogDescription>Submitted by {selectedClaim.claimant_name}</DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedClaim.status)}
                    {getRiskBadge(selectedClaim.risk_score)}
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-6 mt-4">
                {/* Left Column - Claim Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Type</p>
                      <p className="font-medium text-slate-900 capitalize">{selectedClaim.claim_type}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Amount</p>
                      <p className="font-medium text-slate-900">${selectedClaim.amount.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Incident Date</p>
                      <p className="font-medium text-slate-900">{selectedClaim.incident_date}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Policy</p>
                      <p className="font-medium text-slate-900">{selectedClaim.policy_number}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Description</p>
                    <p className="text-sm text-slate-700">{selectedClaim.description}</p>
                  </div>

                  {selectedClaim.risk_score !== null && (
                    <div className={`p-4 rounded-lg border ${
                      selectedClaim.risk_score > 70 ? 'bg-red-50 border-red-200' :
                      selectedClaim.risk_score > 40 ? 'bg-amber-50 border-amber-200' :
                      'bg-emerald-50 border-emerald-200'
                    }`}>
                      <p className="text-xs uppercase tracking-wider mb-2 font-medium">AI Fraud Analysis</p>
                      <div className="flex items-center gap-4 mb-2">
                        <Progress value={selectedClaim.risk_score} className="flex-1 h-2" />
                        <span className="font-bold text-lg">{selectedClaim.risk_score}%</span>
                      </div>
                      {selectedClaim.fraud_analysis && (
                        <p className="text-sm">{selectedClaim.fraud_analysis}</p>
                      )}
                    </div>
                  )}

                  {/* Documents */}
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Documents ({selectedClaim.documents?.length || 0})</p>
                    {selectedClaim.documents?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedClaim.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <span className="text-sm text-slate-700">{doc.filename}</span>
                            <Badge variant="outline">{doc.document_type}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No documents uploaded</p>
                    )}
                  </div>
                </div>

                {/* Right Column - Notes & Actions */}
                <div className="space-y-4">
                  {/* Actions */}
                  <Card className="border-slate-200">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {!selectedClaim.assigned_adjuster_id && (
                        <Button 
                          className="w-full bg-[#1e40af] hover:bg-[#1e3a8a]" 
                          onClick={() => handleAssignClaim(selectedClaim.id)}
                          data-testid="assign-claim-btn"
                        >
                          Assign to Me
                        </Button>
                      )}
                      {selectedClaim.assigned_adjuster_id === user?.id && selectedClaim.status === 'under_review' && (
                        <>
                          <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700" 
                            onClick={() => handleApproveClaim(selectedClaim.id)}
                            data-testid="approve-claim-btn"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve Claim
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="w-full" 
                            onClick={() => handleRejectClaim(selectedClaim.id)}
                            data-testid="reject-claim-btn"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Claim
                          </Button>
                        </>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleTriggerFraudAnalysis(selectedClaim.id)}
                        data-testid="analyze-fraud-btn"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Re-analyze Fraud Risk
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card className="border-slate-200">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">Adjuster Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48 mb-4">
                        {notes.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-4">No notes yet</p>
                        ) : (
                          <div className="space-y-3">
                            {notes.map((note) => (
                              <div key={note.id} className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-slate-700">{note.user_name}</span>
                                  <span className="text-xs text-slate-500">{format(new Date(note.created_at), 'MMM d, HH:mm')}</span>
                                </div>
                                <p className="text-sm text-slate-600">{note.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Add a note..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          rows={2}
                          data-testid="note-input"
                        />
                        <Button 
                          onClick={handleAddNote} 
                          disabled={!newNote.trim()}
                          className="bg-[#1e40af] hover:bg-[#1e3a8a]"
                          data-testid="add-note-btn"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdjusterDashboard;
