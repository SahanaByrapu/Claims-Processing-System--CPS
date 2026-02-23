import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Shield, FileText, Users, BarChart3 } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', name: '', role: 'claimant' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(loginForm.email, loginForm.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigateByRole(user.role);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(registerForm.email, registerForm.password, registerForm.name, registerForm.role);
      toast.success(`Welcome, ${user.name}! Account created successfully.`);
      navigateByRole(user.role);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const navigateByRole = (role) => {
    switch (role) {
      case 'admin':
        navigate('/admin');
        break;
      case 'adjuster':
        navigate('/adjuster');
        break;
      default:
        navigate('/claims');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1e40af] p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <Shield className="h-10 w-10 text-white" />
            <span className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">TrustClaim</span>
          </div>
          <h1 className="text-4xl font-bold text-white font-['Plus_Jakarta_Sans'] leading-tight mb-6">
            Enterprise Claims<br />Processing System
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            Streamline your insurance claims workflow with AI-powered fraud detection, 
            real-time analytics, and comprehensive compliance tools.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/10 rounded-lg p-4">
            <FileText className="h-8 w-8 text-white mb-3" />
            <h3 className="text-white font-semibold mb-1">Claims Portal</h3>
            <p className="text-blue-100 text-sm">Submit and track claims easily</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <Users className="h-8 w-8 text-white mb-3" />
            <h3 className="text-white font-semibold mb-1">Adjuster Dashboard</h3>
            <p className="text-blue-100 text-sm">Review and process efficiently</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <BarChart3 className="h-8 w-8 text-white mb-3" />
            <h3 className="text-white font-semibold mb-1">Fraud Analytics</h3>
            <p className="text-blue-100 text-sm">AI-powered risk detection</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <Shield className="h-8 w-8 text-white mb-3" />
            <h3 className="text-white font-semibold mb-1">Admin Console</h3>
            <p className="text-blue-100 text-sm">Full RBAC & compliance</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-lg border-slate-200">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
              <Shield className="h-8 w-8 text-[#1e40af]" />
              <span className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">TrustClaim</span>
            </div>
            <CardTitle className="text-2xl font-['Plus_Jakarta_Sans'] text-slate-900">Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="login-tab">Sign In</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      data-testid="login-email-input"
                      type="email"
                      placeholder="you@company.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      data-testid="login-password-input"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-[#1e40af] hover:bg-[#1e3a8a]" 
                    disabled={loading}
                    data-testid="login-submit-btn"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      data-testid="register-name-input"
                      type="text"
                      placeholder="John Doe"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      data-testid="register-email-input"
                      type="email"
                      placeholder="you@company.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      data-testid="register-password-input"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-role">Account Type</Label>
                    <Select 
                      value={registerForm.role} 
                      onValueChange={(value) => setRegisterForm({ ...registerForm, role: value })}
                    >
                      <SelectTrigger data-testid="register-role-select">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claimant">Claimant (Submit Claims)</SelectItem>
                        <SelectItem value="adjuster">Claims Adjuster</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-[#1e40af] hover:bg-[#1e3a8a]" 
                    disabled={loading}
                    data-testid="register-submit-btn"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
