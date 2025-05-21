
'use client';

import { useEffect, Suspense } from 'react'; // Added Suspense
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

    if (code && !authLoading) { // Ensure not to run if auth is already processing something
      apiClient.request<{ token: string; user: any }>('/auth/google/callback', {
        method: 'POST',
        body: JSON.stringify({ code }),
        needsAuth: false, // This specific call sends code, not token
      })
        .then(res => {
          if (res.token && res.user) {
            loginWithTokenAndUser(res.token, res.user);
            // AuthContext will redirect to '/'
          } else {
            throw new Error('Token or user data missing in response.');
          }
        })
        .catch(err => {
          console.error('OAuth callback failed', err);
          toast({
            title: 'Login Failed',
            description: err.message || 'Failed to exchange OAuth code for token.',
            variant: 'destructive',
          });
          router.push('/login');
        });
    } else if (!code && !error && !authLoading) {
      // No code and no error, something unexpected happened or direct access
      toast({
        title: 'Invalid Callback',
        description: 'OAuth callback was accessed without a code or error.',
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


// Wrap with Suspense for useSearchParams
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
