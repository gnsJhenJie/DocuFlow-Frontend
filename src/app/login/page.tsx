'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AppLogo } from '@/components/AppLogo';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/'); 
    }
  }, [user, loading, router]);

  if (loading || user) {
    return null;
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const response = await apiClient.getGoogleAuthUrl();
      if (response.url) {
        window.location.href = response.url;
      } else {
        toast({
          title: 'Google Login Error',
          description: 'Could not retrieve Google login URL.',
          variant: 'destructive',
        });
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
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-4 text-center pt-6">
          <div className="flex justify-center">
            <AppLogo />
          </div>
          <CardTitle className="text-2xl font-semibold">Welcome to DocuFlow</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Sign in to manage your documents
          </CardDescription>
        </CardHeader>

        <CardContent className="flex justify-center py-6">
          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="flex items-center space-x-2 px-6 py-3"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="#4285F4"
                  d="M23.64 12.2c0-.82-.07-1.61-.18-2.37H12v4.48h6.07c-.26 1.38-1.04 2.54-2.23 3.32v2.76h3.6c2.11-1.95 3.32-4.81 3.32-8.19z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.47-.98 7.29-2.65l-3.6-2.76c-.99.66-2.26 1.05-3.69 1.05-2.84 0-5.25-1.92-6.11-4.5H2.12v2.82C3.93 20.87 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.89 14.04a7.48 7.48 0 0 1 0-4.08V7.14H2.12A11.99 11.99 0 0 0 0 12c0 1.89.45 3.68 1.24 5.25l4.65-3.21z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.76c1.61 0 3.05.56 4.19 1.65l3.14-3.14C17.44 1.49 14.97.5 12 .5 7.7.5 3.93 2.63 2.12 5.86l4.77 3.29C6.75 6.68 9.16 4.76 12 4.76z"
                />
                <path fill="none" d="M0 0h24v24H0z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
