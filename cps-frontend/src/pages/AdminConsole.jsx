import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { 
  Shield, LogOut, Users, FileText, Activity, Settings,
  Search, RefreshCw, UserCheck, UserX, ClipboardList,
  BarChart3, AlertTriangle, CheckCircle2, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

const AdminConsole = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, logsRes, complianceRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getAuditLogs({ limit: 200 }),
        adminApi.getComplianceReport()
      ]);
      setUsers(usersRes.data);
      setAuditLogs(logsRes.data);
      setCompliance(complianceRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      toast.success('User role updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await adminApi.updateUserStatus(userId, !currentStatus);
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredLogs = auditLogs.filter(log => {
    return actionFilter === 'all' || log.action.includes(actionFilter);
  });

  const getActionBadge = (action) => {
    const colorMap = {
      'CREATED': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'UPDATED': 'bg-blue-50 text-blue-700 border-blue-100',
      'DELETED': 'bg-red-50 text-red-700 border-red-100',
      'LOGIN': 'bg-slate-100 text-slate-700 border-slate-200',
      'APPROVED': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'REJECTED': 'bg-red-50 text-red-700 border-red-100',
      'ASSIGNED': 'bg-amber-50 text-amber-700 border-amber-100',
    };
    const key = Object.keys(colorMap).find(k => action.includes(k)) || 'LOGIN';
    return <Badge className={`${colorMap[key]} border text-xs`}>{action}</Badge>;
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-purple-50 text-purple-700 border-purple-100',
      adjuster: 'bg-blue-50 text-blue-700 border-blue-100',
      claimant: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return <Badge className={`${colors[role]} border capitalize`}>{role}</Badge>;
  };

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
                <p className="text-xs text-slate-500">Admin Console</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
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
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" data-testid="users-tab">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="audit-tab">
              <Activity className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="compliance" data-testid="compliance-tab">
              <ClipboardList className="h-4 w-4 mr-2" />
              Compliance
            </TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Total Users</p>
                      <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-[#1e40af]" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Admins</p>
                      <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === 'admin').length}</p>
                    </div>
                    <Shield className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Adjusters</p>
                      <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'adjuster').length}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Active Users</p>
                      <p className="text-2xl font-bold text-emerald-600">{users.filter(u => u.is_active).length}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-users-input"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40" data-testid="role-filter-select">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="adjuster">Adjuster</SelectItem>
                  <SelectItem value="claimant">Claimant</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Users Table */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-['Plus_Jakarta_Sans']">User Management (RBAC)</CardTitle>
                <CardDescription>Manage user roles and access permissions</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e40af]"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{u.name}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-slate-600">{u.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              <Select 
                                value={u.role} 
                                onValueChange={(v) => handleUpdateRole(u.id, v)}
                                disabled={u.id === user?.id}
                              >
                                <SelectTrigger className="w-32" data-testid={`role-select-${u.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="claimant">Claimant</SelectItem>
                                  <SelectItem value="adjuster">Adjuster</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-slate-600">{format(new Date(u.created_at), 'MMM d, yyyy')}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Switch 
                                  checked={u.is_active} 
                                  onCheckedChange={() => handleToggleStatus(u.id, u.is_active)}
                                  disabled={u.id === user?.id}
                                  data-testid={`status-switch-${u.id}`}
                                />
                                <span className={`text-xs ${u.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {u.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {getRoleBadge(u.role)}
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

          {/* Audit Logs Tab */}
          <TabsContent value="audit">
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48" data-testid="action-filter-select">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="LOGIN">Logins</SelectItem>
                  <SelectItem value="CLAIM">Claims</SelectItem>
                  <SelectItem value="USER">Users</SelectItem>
                  <SelectItem value="DOCUMENT">Documents</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Card className="bg-white border-slate-200">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#1e40af]" />
                  Audit Trail
                </CardTitle>
                <CardDescription>Complete activity log for compliance and security monitoring</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Resource</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-900">{format(new Date(log.timestamp), 'MMM d, yyyy')}</p>
                            <p className="text-xs text-slate-500">{format(new Date(log.timestamp), 'HH:mm:ss')}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-700">{log.user_email}</p>
                          </td>
                          <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-600 capitalize">{log.resource_type}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-600 max-w-xs truncate">{log.details}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance">
            {compliance && (
              <div className="space-y-6">
                {/* Report Header */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-['Plus_Jakarta_Sans']">Compliance Report</CardTitle>
                        <CardDescription>Generated: {format(new Date(compliance.report_date), 'MMMM d, yyyy HH:mm')}</CardDescription>
                      </div>
                      <Button onClick={fetchData} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* User Metrics */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                        <Users className="h-5 w-5 text-[#1e40af]" />
                        User Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">Total Users</span>
                        <span className="font-semibold text-slate-900">{compliance.user_metrics.total_users}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <span className="text-sm text-emerald-700">Active Users</span>
                        <span className="font-semibold text-emerald-700">{compliance.user_metrics.active_users}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <span className="text-sm text-red-700">Inactive Users</span>
                        <span className="font-semibold text-red-700">{compliance.user_metrics.inactive_users}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Claims Metrics */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#1e40af]" />
                        Claims Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">Total Claims</span>
                        <span className="font-semibold text-slate-900">{compliance.claims_metrics.total_claims}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-blue-700">Processed</span>
                        <span className="font-semibold text-blue-700">{compliance.claims_metrics.processed_claims}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <span className="text-sm text-amber-700">Pending</span>
                        <span className="font-semibold text-amber-700">{compliance.claims_metrics.pending_claims}</span>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600">Processing Rate</span>
                          <span className="font-semibold text-[#1e40af]">{compliance.claims_metrics.processing_rate}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-[#1e40af] h-2 rounded-full" 
                            style={{ width: `${compliance.claims_metrics.processing_rate}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Metrics */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Risk Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <span className="text-sm text-red-700">High Risk Claims</span>
                        <span className="font-semibold text-red-700">{compliance.risk_metrics.high_risk_claims}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">High Risk %</span>
                        <span className="font-semibold text-slate-900">{compliance.risk_metrics.high_risk_percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-blue-700">Total Audit Entries</span>
                        <span className="font-semibold text-blue-700">{compliance.audit_metrics.total_audit_entries}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Compliance Summary */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="font-['Plus_Jakarta_Sans']">Compliance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-medium text-slate-900">System Health</h4>
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <span className="text-sm text-emerald-700">All audit logging active</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <span className="text-sm text-emerald-700">RBAC enforcement active</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <span className="text-sm text-emerald-700">Fraud detection enabled</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-medium text-slate-900">Recommendations</h4>
                        {compliance.claims_metrics.pending_claims > 10 && (
                          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            <span className="text-sm text-amber-700">High pending claims backlog - review required</span>
                          </div>
                        )}
                        {compliance.risk_metrics.high_risk_percentage > 20 && (
                          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <span className="text-sm text-red-700">High fraud risk ratio - investigate flagged claims</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <span className="text-sm text-blue-700">Regular compliance reviews recommended</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminConsole;
