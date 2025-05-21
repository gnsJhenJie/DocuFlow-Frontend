'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/types';
import { AppLogo } from '@/components/AppLogo';
import { Github, MessageSquare /* Using MessageSquare as a generic OAuth icon */ } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('alice@example.com'); // Default to an admin user
  const [selectedRole, setSelectedRole] = useState<Role>('admin');
  const { login, loading } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      alert('Please enter an email.'); // Basic validation
      return;
    }
    console.log(`[LoginPage] Attempting login for email: ${email} with role: ${selectedRole}`);
    login(email, selectedRole); // Pass selected role
    // AuthProvider will redirect on successful login via its useEffect
    router.push('/'); 
  };
  
  const handleOAuthLogin = (provider: string) => {
    // In a real app, this would initiate the Firebase OAuth flow.
    // For this mock, we'll just log in a predefined user.
    console.log(`[LoginPage] OAuth login attempt with ${provider}`);
    let oauthEmail = 'bob@example.com';
    let oauthRole: Role = 'editor';
    if (provider === 'Google') {
        oauthEmail = 'charlie@example.com';
        oauthRole = 'reviewer';
    }
    login(oauthEmail, oauthRole);
    router.push('/');
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
            Sign in to manage your documents or select a role to simulate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => handleOAuthLogin('Google')}>
              <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.84-4.05 1.84-4.76 0-8.64-3.89-8.64-8.64s3.88-8.64 8.64-8.64c2.18 0 3.93.89 5.39 2.23l2.62-2.62C18.09.74 15.49 0 12.48 0 5.88 0 0 5.88 0 12.48s5.88 12.48 12.48 12.48c7.05 0 12.14-4.76 12.14-12.32 0-.79-.07-1.55-.2-2.23H12.48z"></path></svg>
              Google
            </Button>
            <Button variant="outline" onClick={() => handleOAuthLogin('GitHub')}>
              <Github className="mr-2 h-4 w-4" />
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
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email (for simulation)</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Simulate Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as Role)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login / Simulate'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
            This is a simulated login. No actual authentication is performed.
        </CardFooter>
      </Card>
    </div>
  );
}
