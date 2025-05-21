
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/types';
import { AppLogo } from '@/components/AppLogo';
import { Github, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';

export default function LoginPage() {
  const [email, setEmail] = useState('alice@example.com');
  const [password, setPassword] = useState('password');
  const { login, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Login Error', description: 'Please enter email and password.', variant: 'destructive' });
      return;
    }
    try {
      await login(email, password);
      // AuthProvider will redirect on successful login
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials or server error.',
        variant: 'destructive',
      });
    }
  };
  
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const response = await apiClient.getGoogleAuthUrl();
      if (response.url) {
        window.location.href = response.url;
      } else {
        toast({ title: 'Google Login Error', description: 'Could not retrieve Google login URL.', variant: 'destructive'});
        setIsGoogleLoading(false);
      }
    } catch (error: any) {
       toast({
        title: 'Google Login Failed',
        description: error.message || 'Could not initiate Google login.',
        variant: 'destructive',
      });
      setIsGoogleLoading(false);
    }
    // No setIsGoogleLoading(false) here because the page will navigate away on success
  };

  const handleGitHubLogin = async () => {
    setIsGithubLoading(true);
    toast({
      title: "GitHub Login Not Implemented",
      description: "GitHub OAuth flow needs backend and frontend setup.",
      variant: "default"
    });
    // Similar flow to Google:
    // 1. Get /api/auth/github/url
    // 2. window.location.href = data.url
    // 3. Callback page /auth/github/callback (or a generic one) handles code exchange
    setIsGithubLoading(false);
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <AppLogo />
          </div>
          <CardTitle className="text-2xl">Welcome to DocuFlow</CardTitle>
          <CardDescription>
            Sign in to manage your documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={handleGoogleLogin} disabled={isGoogleLoading || authLoading}>
              {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.84-4.05 1.84-4.76 0-8.64-3.89-8.64-8.64s3.88-8.64 8.64-8.64c2.18 0 3.93.89 5.39 2.23l2.62-2.62C18.09.74 15.49 0 12.48 0 5.88 0 0 5.88 0 12.48s5.88 12.48 12.48 12.48c7.05 0 12.14-4.76 12.14-12.32 0-.79-.07-1.55-.2-2.23H12.48z"></path></svg>
              }
              Google
            </Button>
            <Button variant="outline" onClick={handleGitHubLogin} disabled={isGithubLoading || authLoading}>
              {isGithubLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
              GitHub
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <form onSubmit={handleEmailPasswordLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={authLoading || isGoogleLoading || isGithubLoading}
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={authLoading || isGoogleLoading || isGithubLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={authLoading || isGoogleLoading || isGithubLoading}>
              {authLoading && !isGoogleLoading && !isGithubLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Login
            </Button>
          </form>
        </CardContent>
         <CardFooter className="text-center text-sm text-muted-foreground">
             Sign in using your credentials or a provider.
        </CardFooter>
      </Card>
    </div>
  );
}
