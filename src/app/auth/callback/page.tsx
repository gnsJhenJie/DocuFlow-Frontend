'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loginWithTokenAndUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const exchangedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (authLoading) {
      return;
    }

    if (user) {
      router.replace('/');
      return;
    }

    if (error) {
      toast({
        title: 'Google OAuth Error',
        description: errorDescription || error,
        variant: 'destructive',
      });
      router.replace('/login');
      return;
    }

    if (code && !exchangedRef.current) {
      exchangedRef.current = true;
      apiClient
        .exchangeGoogleCode(code)
        .then(res => {
          console.log('[OAuthCallback] Code exchange response:', res);
          if (res && res.token && res.user) {
            loginWithTokenAndUser(res.token, res.user);
          } else {
            exchangedRef.current = false;
            toast({
              title: 'Login Failed',
              description: 'Received incomplete data from authentication server.',
              variant: 'destructive',
            });
            router.replace('/login');
          }
        })
        .catch(err => {
          exchangedRef.current = false;
          const errorMessage = err.response?.data?.detail || err.message || 'An unknown error occurred during code exchange.';
          toast({
            title: 'Login Failed',
            description: errorMessage,
            variant: 'destructive',
          });
          router.replace('/login');
        });
    }
    else if (!code && !error) {
      console.log('[OAuthCallback] 沒有 code 也沒有 error，將導回 /login');
      router.replace('/login');
    }
  }, [searchParams, user, authLoading, loginWithTokenAndUser, router, toast]);

  if (authLoading || user) {
    return null;
  }

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
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Loading callback page...</p>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
