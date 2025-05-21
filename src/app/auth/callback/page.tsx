
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithTokenAndUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast({
        title: 'OAuth Error',
        description: `Google authentication failed: ${searchParams.get('error_description') || error}`,
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    if (code && !authLoading) {
      apiClient.exchangeGoogleCode(code)
        .then(res => {
          if (res.token && res.user) {
            loginWithTokenAndUser(res.token, res.user);
            // AuthContext will redirect to '/' or the intended page
          } else {
            throw new Error('Token or user data missing in response from /api/auth/google/callback.');
          }
        })
        .catch(err => {
          console.error('OAuth callback failed during code exchange:', err);
          toast({
            title: 'Login Failed',
            description: err.message || 'Failed to exchange OAuth code for token.',
            variant: 'destructive',
          });
          router.push('/login');
        });
    } else if (!code && !error && !authLoading) {
      toast({
        title: 'Invalid Callback',
        description: 'OAuth callback was accessed without a code or error parameter.',
        variant: 'destructive',
      });
      router.push('/login');
    }
  }, [searchParams, loginWithTokenAndUser, router, toast, authLoading]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">
        Logging in with Google, please wait...
      </p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading callback...</p>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
