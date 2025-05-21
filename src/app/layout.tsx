import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google'; // Using Inter as a more common professional font
import './globals.css';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/AppLayout';

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
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
