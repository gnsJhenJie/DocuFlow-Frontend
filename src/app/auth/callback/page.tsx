
'use client';

import { useEffect, useRef, Suspense } from 'react';
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

  const exchangedRef = useRef(false);

  useEffect(() => {
    console.log('[OAuthCallbackContent] useEffect triggered.');
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('[OAuthCallback] Received query params:', { code, error, errorDescription });
    console.log('[OAuthCallback] Current authLoading state:', authLoading);

    if (error) {
      console.error('[OAuthCallback] Google OAuth Error:', errorDescription || error);
      toast({
        title: 'Google OAuth Error',
        description: errorDescription || error,
        variant: 'destructive',
      });
      router.replace('/login');
      return;
    }

    if (authLoading) {
      console.log('[OAuthCallback] Auth is still loading, waiting before exchanging code...');
      return;
    }

    if (code && !exchangedRef.current) {
      exchangedRef.current = true; // Lock to prevent multiple exchanges
      console.log('[OAuthCallback] Exchanging Google code for token...');
      apiClient.exchangeGoogleCode(code)
        .then(res => {
          console.log('[OAuthCallback] Code exchange response from backend:', res);
          if (res && res.token && res.user) {
            loginWithTokenAndUser(res.token, res.user);
            // DO NOT redirect here, AuthContext's loginWithTokenAndUser will handle it
            // based on the stored redirect path.
            // router.replace('/'); // This was overriding the AuthContext redirect
          } else {
            exchangedRef.current = false; // Unlock on failure
            console.error('[OAuthCallback] Token or user data missing in backend response:', res);
            toast({
              title: 'Login Failed',
              description: 'Received incomplete data from authentication server.',
              variant: 'destructive',
            });
            router.replace('/login');
          }
        })
        .catch(err => {
          exchangedRef.current = false; // Unlock on failure
          const errorMessage = err.response?.data?.detail || err.message || 'An unknown error occurred during code exchange.';
          console.error('[OAuthCallback] Code exchange API call failed:', errorMessage, err);
          toast({
            title: 'Login Failed',
            description: errorMessage,
            variant: 'destructive',
          });
          router.replace('/login');
        });
    } else if (!code && !error) {
        console.log('[OAuthCallback] No code or error found in query params. Redirecting to login.');
        if (!authLoading) { // Only redirect if auth is not loading, to prevent premature redirect
            router.replace('/login');
        }
    }
  }, [searchParams, loginWithTokenAndUser, router, toast, authLoading]); // Added authLoading

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
