
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

    if (code && !authLoading && !exchangedRef.current) {
      exchangedRef.current = true;                  // 先鎖住
      apiClient.exchangeGoogleCode(code)
        .then(res => {
          loginWithTokenAndUser(res.token, res.user);
          /** 成功後直接跳到首頁 (或你想要的路由) */
          router.replace('/');                      // ← code 被移除，之後不會再觸發
        })
        .catch(err => {
          exchangedRef.current = false;            // 失敗才解鎖
          toast({
            title: 'Login Failed',
            description: err.message,
            variant: 'destructive',
          });
          router.replace('/login');
        });
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
