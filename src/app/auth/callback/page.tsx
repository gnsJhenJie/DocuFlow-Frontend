
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

function OAuthCallbackContent() {
  console.log('[OAuthCallbackContent] Component rendering. Waiting for useEffect...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithTokenAndUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    console.log('[OAuthCallbackContent] useEffect triggered.');
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('[OAuthCallback] Received query params:', { code, error, errorDescription });

    if (error) {
      console.error('[OAuthCallback] Google OAuth Error:', errorDescription || error);
      toast({
        title: 'Google OAuth Error',
        description: `Google authentication failed: ${errorDescription || error}`,
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    // Only proceed if code exists and auth context is not in the middle of its own loading (e.g. initial token check)
    if (code && !authLoading) {
      console.log('[OAuthCallback] Exchanging Google code for token...');
      apiClient.exchangeGoogleCode(code)
        .then(res => {
          console.log('[OAuthCallback] Code exchange response from backend:', res);
          if (res && res.token && res.user) {
            toast({
              title: 'Login Successful',
              description: `Welcome, ${res.user.name}! Processing login...`,
            });
            // loginWithTokenAndUser will set token, user, and then redirect
            loginWithTokenAndUser(res.token, res.user);
          } else {
            console.error('[OAuthCallback] Token or user data missing in response from /api/auth/google/callback.', res);
            toast({
              title: 'Login Failed',
              description: 'Received invalid data from server after Google login. Please try again.',
              variant: 'destructive',
            });
            router.push('/login');
          }
        })
        .catch(err => {
          console.error('[OAuthCallback] Code exchange API call failed:', err);
          const errorMessage = err.response?.data?.detail || err.message || 'Failed to exchange OAuth code for token. Please check server logs and ensure backend is running.';
          toast({
            title: 'Login Failed',
            description: errorMessage,
            variant: 'destructive',
          });
          router.push('/login');
        });
    } else if (!code && !error && !authLoading) {
      console.warn('[OAuthCallback] Accessed without code or error parameter.');
      toast({
        title: 'Invalid Callback',
        description: 'OAuth callback was accessed improperly.',
        variant: 'destructive',
      });
      router.push('/login');
    } else if (authLoading) {
        console.log('[OAuthCallback] Auth context is loading, waiting for it to complete before processing code...');
        // Do nothing, useEffect will re-run when authLoading changes
    } else if (!code && !error && authLoading) {
        console.log('[OAuthCallback] No code/error, and auth context is loading. Waiting...');
    }
  }, [searchParams, loginWithTokenAndUser, router, toast, authLoading]); // Added authLoading to dependency array

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">
        Finalizing Google login, please wait...
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        (Checking authentication status: {authLoading ? 'Loading...' : 'Ready'})
      </p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading callback page...</p>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
