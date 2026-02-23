import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { claimsApi, documentsApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  Plus, FileText, Upload, Clock, CheckCircle2, XCircle, 
  AlertTriangle, Eye, Download, Calendar, DollarSign,
  ChevronRight, Shield, LogOut
} from 'lucide-react';
import { format } from 'date-fns';

const ClaimsPortal = () => {
  const { user, logout } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [step, setStep] = useState(1);
  
  const [newClaim, setNewClaim] = useState({
    claim_type: '',
    description: '',
    incident_date: '',
    amount: '',
    policy_number: ''
  });
  
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState('supporting_document');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const response = await claimsApi.getAll();
      setClaims(response.data);
    } catch (error) {
      toast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClaim = async (e) => {
    e.preventDefault();
    try {
      const response = await claimsApi.create({
        ...newClaim,
        amount: parseFloat(newClaim.amount)
      });
      toast.success('Claim submitted successfully!');
      setClaims([response.data, ...claims]);
      setShowNewClaim(false);
      setNewClaim({ claim_type: '', description: '', incident_date: '', amount: '', policy_number: '' });
      setStep(1);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit claim');
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile || !selectedClaim) return;
    setUploading(true);
    try {
      await documentsApi.upload(selectedClaim.id, uploadFile, uploadType);
      toast.success('Document uploaded successfully!');
      setUploadFile(null);
      // Refresh claim details
      const response = await claimsApi.getById(selectedClaim.id);
      setSelectedClaim(response.data);
      fetchClaims();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (docId, filename) => {
    try {
      const response = await documentsApi.download(selectedClaim.id, docId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download document');
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

  const getClaimTypeIcon = (type) => {
    const icons = {
      auto: '🚗',
      health: '🏥',
      property: '🏠',
      life: '❤️'
    };
    return icons[type] || '📋';
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
                <p className="text-xs text-slate-500">Claims Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-btn">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Claims</p>
                  <p className="text-2xl font-bold text-slate-900">{claims.length}</p>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-[#1e40af]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {claims.filter(c => ['submitted', 'under_review'].includes(c.status)).length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Approved</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {claims.filter(c => c.status === 'approved').length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Amount</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${claims.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans']">My Claims</h2>
          <Dialog open={showNewClaim} onOpenChange={setShowNewClaim}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e40af] hover:bg-[#1e3a8a]" data-testid="new-claim-btn">
                <Plus className="h-4 w-4 mr-2" />
                Submit New Claim
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-['Plus_Jakarta_Sans']">Submit a New Claim</DialogTitle>
                <DialogDescription>Complete the form below to submit your insurance claim.</DialogDescription>
              </DialogHeader>
              
              {/* Stepper */}
              <div className="flex items-center justify-center gap-4 py-4">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= s ? 'bg-[#1e40af] text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {s}
                    </div>
                    {s < 3 && <ChevronRight className="w-4 h-4 text-slate-400 mx-2" />}
                  </div>
                ))}
              </div>
              
              <form onSubmit={handleCreateClaim}>
                {step === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                      <Label>Claim Type</Label>
                      <Select 
                        value={newClaim.claim_type} 
                        onValueChange={(v) => setNewClaim({...newClaim, claim_type: v})}
                      >
                        <SelectTrigger data-testid="claim-type-select">
                          <SelectValue placeholder="Select claim type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">🚗 Auto Insurance</SelectItem>
                          <SelectItem value="health">🏥 Health Insurance</SelectItem>
                          <SelectItem value="property">🏠 Property Insurance</SelectItem>
                          <SelectItem value="life">❤️ Life Insurance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Policy Number</Label>
                      <Input
                        data-testid="policy-number-input"
                        placeholder="e.g., POL-123456"
                        value={newClaim.policy_number}
                        onChange={(e) => setNewClaim({...newClaim, policy_number: e.target.value})}
                        required
                      />
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => setStep(2)} 
                      className="w-full bg-[#1e40af] hover:bg-[#1e3a8a]"
                      disabled={!newClaim.claim_type || !newClaim.policy_number}
                    >
                      Continue
                    </Button>
                  </div>
                )}
                
                {step === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                      <Label>Incident Date</Label>
                      <Input
                        data-testid="incident-date-input"
                        type="date"
                        value={newClaim.incident_date}
                        onChange={(e) => setNewClaim({...newClaim, incident_date: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Claim Amount ($)</Label>
                      <Input
                        data-testid="claim-amount-input"
                        type="number"
                        placeholder="0.00"
                        value={newClaim.amount}
                        onChange={(e) => setNewClaim({...newClaim, amount: e.target.value})}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                        Back
                      </Button>
                      <Button 
                        type="button" 
                        onClick={() => setStep(3)} 
                        className="flex-1 bg-[#1e40af] hover:bg-[#1e3a8a]"
                        disabled={!newClaim.incident_date || !newClaim.amount}
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}
                
                {step === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        data-testid="claim-description-input"
                        placeholder="Please describe the incident and what you are claiming..."
                        rows={4}
                        value={newClaim.description}
                        onChange={(e) => setNewClaim({...newClaim, description: e.target.value})}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-[#1e40af] hover:bg-[#1e3a8a]"
                        disabled={!newClaim.description}
                        data-testid="submit-claim-btn"
                      >
                        Submit Claim
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Claims List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e40af]"></div>
          </div>
        ) : claims.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No claims yet</h3>
              <p className="text-slate-500 mb-4">Submit your first claim to get started</p>
              <Button onClick={() => setShowNewClaim(true)} className="bg-[#1e40af] hover:bg-[#1e3a8a]">
                <Plus className="h-4 w-4 mr-2" />
                Submit New Claim
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <Card key={claim.id} className="bg-white border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedClaim(claim)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">
                        {getClaimTypeIcon(claim.claim_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-slate-900">{claim.claim_number}</h3>
                          {getStatusBadge(claim.status)}
                        </div>
                        <p className="text-sm text-slate-500 mb-2">{claim.claim_type.charAt(0).toUpperCase() + claim.claim_type.slice(1)} Insurance</p>
                        <p className="text-sm text-slate-600 line-clamp-2">{claim.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-900">${claim.amount.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {format(new Date(claim.created_at), 'MMM d, yyyy')}
                      </p>
                      {claim.risk_score !== null && (
                        <div className="mt-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            claim.risk_score > 70 ? 'bg-red-100 text-red-700' :
                            claim.risk_score > 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            Risk: {claim.risk_score}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Claim Detail Dialog */}
        <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedClaim && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="font-['Plus_Jakarta_Sans'] text-xl">{selectedClaim.claim_number}</DialogTitle>
                      <DialogDescription>{selectedClaim.claim_type.charAt(0).toUpperCase() + selectedClaim.claim_type.slice(1)} Insurance Claim</DialogDescription>
                    </div>
                    {getStatusBadge(selectedClaim.status)}
                  </div>
                </DialogHeader>

                <Tabs defaultValue="details" className="mt-4">
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="documents">Documents ({selectedClaim.documents?.length || 0})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Incident Date</p>
                        <p className="font-medium text-slate-900">{selectedClaim.incident_date}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Claim Amount</p>
                        <p className="font-medium text-slate-900">${selectedClaim.amount.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Policy Number</p>
                        <p className="font-medium text-slate-900">{selectedClaim.policy_number}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Submitted</p>
                        <p className="font-medium text-slate-900">{format(new Date(selectedClaim.created_at), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Description</p>
                      <p className="text-slate-700">{selectedClaim.description}</p>
                    </div>

                    {selectedClaim.assigned_adjuster_name && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Assigned Adjuster</p>
                        <p className="font-medium text-blue-900">{selectedClaim.assigned_adjuster_name}</p>
                      </div>
                    )}

                    {selectedClaim.risk_score !== null && (
                      <div className={`p-4 rounded-lg border ${
                        selectedClaim.risk_score > 70 ? 'bg-red-50 border-red-100' :
                        selectedClaim.risk_score > 40 ? 'bg-amber-50 border-amber-100' :
                        'bg-emerald-50 border-emerald-100'
                      }`}>
                        <p className="text-xs uppercase tracking-wider mb-2">AI Risk Assessment</p>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <Progress value={selectedClaim.risk_score} className="h-2" />
                          </div>
                          <span className="font-semibold">{selectedClaim.risk_score}%</span>
                        </div>
                        {selectedClaim.fraud_analysis && (
                          <p className="text-sm mt-2">{selectedClaim.fraud_analysis}</p>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4 mt-4">
                    {/* Upload Section */}
                    <Card className="border-dashed border-2 border-slate-300">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <Input
                              type="file"
                              data-testid="document-upload-input"
                              onChange={(e) => setUploadFile(e.target.files[0])}
                              accept=".pdf,.jpg,.jpeg,.png,.tiff"
                            />
                          </div>
                          <Select value={uploadType} onValueChange={setUploadType}>
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="supporting_document">Supporting Document</SelectItem>
                              <SelectItem value="receipt">Receipt</SelectItem>
                              <SelectItem value="medical_report">Medical Report</SelectItem>
                              <SelectItem value="police_report">Police Report</SelectItem>
                              <SelectItem value="photo">Photo Evidence</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            onClick={handleUploadDocument} 
                            disabled={!uploadFile || uploading}
                            className="bg-[#1e40af] hover:bg-[#1e3a8a]"
                            data-testid="upload-document-btn"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? 'Uploading...' : 'Upload'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Documents List */}
                    {selectedClaim.documents?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedClaim.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-slate-400" />
                              <div>
                                <p className="font-medium text-slate-900">{doc.filename}</p>
                                <p className="text-xs text-slate-500">
                                  {doc.document_type.replace('_', ' ')} • {(doc.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadDocument(doc.id, doc.filename)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Upload className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p>No documents uploaded yet</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ClaimsPortal;
