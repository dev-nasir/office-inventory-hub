import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Package, Building2, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { Department, UserRole } from '@/types/inventory';

const departments: Department[] = [
  'CMS',
  'Digital Marketing',
  'Management',
  'MERN Stack',
  'Sales',
  'UI/UX',
];

export default function Auth() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupDepartment, setSignupDepartment] = useState<Department | ''>('');
  const [signupRole, setSignupRole] = useState<UserRole>('employee');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const validatePakistaniPhone = (phone: string) => {
    // Only allow numbers starting with 03 and total 11 digits
    const pkRegex = /^03[0-9]{9}$/;
    return pkRegex.test(phone);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword || !signupName || !signupDepartment) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (signupPhone && !validatePakistaniPhone(signupPhone)) {
      toast.error('Invalid phone number. It must be 11 digits and start with "03" (e.g., 03001234567)');
      return;
    }

    setIsLoading(true);
    try {
      await signup(
        signupEmail, 
        signupPassword, 
        signupName, 
        signupDepartment, 
        signupRole,
        signupPhone,
        signupAddress
      );
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <Package className="h-7 w-7 text-accent-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary-foreground">InventoryPro</span>
          </div>
          <p className="text-primary-foreground/70 text-lg">
            Enterprise Inventory Management
          </p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-primary-foreground mb-4 leading-tight">
              Streamline Your<br />Office Inventory
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-md">
              Track, manage, and optimize your workplace assets with our powerful inventory management system.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Building2, label: 'Multi-Department' },
              { icon: User, label: 'Role-Based Access' },
              { icon: Package, label: 'Asset Tracking' },
              { icon: ArrowRight, label: 'Request System' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-primary-foreground/10 backdrop-blur-sm">
                <Icon className="h-5 w-5 text-accent-foreground" />
                <span className="text-primary-foreground text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-primary-foreground/60 text-sm">
          © 2024 InventoryPro. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">InventoryPro</span>
          </div>

          <Card className="shadow-elegant border-border/50">
            <Tabs defaultValue="login" className="w-full">
              <CardHeader className="pb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent>
                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <CardTitle className="text-xl">Welcome back</CardTitle>
                    <CardDescription className="pb-2">
                      Enter your credentials to access your account
                    </CardDescription>

                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@company.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <div className="text-sm text-muted-foreground text-center pt-2">
                      <p>Don't have an account? Sign up</p>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <CardTitle className="text-xl">Create account</CardTitle>
                    <CardDescription className="pb-2">
                      Join your team's inventory system
                    </CardDescription>

                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@company.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-department">Department</Label>
                      <Select value={signupDepartment} onValueChange={(value) => setSignupDepartment(value as Department)}>
                        <SelectTrigger>
                          <Building2 className="h-4 w-4 text-muted-foreground mr-2" />
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Phone Number</Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="03001234567"
                        maxLength={11}
                        value={signupPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setSignupPhone(val);
                        }}
                      />
                      {signupPhone && !validatePakistaniPhone(signupPhone) && (
                        <p className="text-[10px] text-destructive mt-1">Must start with 03 (e.g. 03001234567)</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-address">Address</Label>
                      <Input
                        id="signup-address"
                        type="text"
                        placeholder="123 Street, City"
                        value={signupAddress}
                        onChange={(e) => setSignupAddress(e.target.value)}
                      />
                    </div>



                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
