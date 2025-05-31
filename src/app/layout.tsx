import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google'; // Using Inter as a more common professional font
import './globals.css';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/AppLayout';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-geist-sans', // Keep variable name for compatibility if Geist was intended
});

export const metadata: Metadata = {
  title: 'DocuFlow - Document Management',
  description: 'Efficiently manage your enterprise documents with DocuFlow.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        // Added to address potential hydration errors caused by browser extensions modifying body attributes
        suppressHydrationWarning={true}
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3 text-lg text-muted-foreground">Loading Application...</p>
          </div>
        }>
          <AppLayout>{children}</AppLayout>
        </Suspense>
      </body>
    </html>
  );
}
