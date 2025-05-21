
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, Clock, PlusCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient'; // Assuming apiClient exists
import type { Document } from '@/lib/types'; // Assuming types exist


interface ActivityItem {
  id: string;
  text: string;
  timestamp?: string; // Should be fetched or generated based on real data
  imageUrl?: string;
  imageAlt?: string;
  dataAiHint?: string;
  link?: string; // Optional link for activity
}

// Sample recent activities - this should ideally come from a backend API
// For now, we'll keep it static or derive from latest documents if possible
const staticRecentActivities: ActivityItem[] = [
  {
    id: 'activity1',
    text: 'System update: Document review process streamlined.',
    imageUrl: 'https://placehold.co/48x48.png',
    imageAlt: 'System update icon',
    dataAiHint: 'system update',
    timestamp: '2 days ago',
  },
  {
    id: 'activity2',
    text: 'User "Alice Wonderland" joined the platform as an Admin.',
    timestamp: '1 day ago',
  },
  {
    id: 'activity3',
    text: 'New feature: Markdown support in document content.',
    imageUrl: 'https://placehold.co/48x48.png',
    imageAlt: 'Markdown logo',
    dataAiHint: 'markdown logo',
    timestamp: '3 hours ago',
  },
];


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [summaryStats, setSummaryStats] = useState({
    totalDocuments: 0,
    approvedDocuments: 0,
    pendingReview: 0,
    drafts: 0,
  });
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>(staticRecentActivities);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoadingStats(true);
      try {
        // Fetch a batch of documents to derive stats.
        // Ideally, backend provides dedicated stat endpoints.
        const params = new URLSearchParams({ limit: "200" }); // Fetch more docs for stats
        const { documents: allDocs } = await apiClient.getDocuments(params);
        
        setSummaryStats({
          totalDocuments: allDocs.length, // This is an approximation if total > 200
          approvedDocuments: allDocs.filter(doc => doc.status === 'approved').length,
          pendingReview: allDocs.filter(doc => doc.status === 'pending_review').length,
          drafts: allDocs.filter(doc => doc.status === 'draft').length,
        });

        // Derive recent activities from latest documents (example)
        const derivedActivities = allDocs
          .sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 3) // Take 3 most recently updated
          .map((doc: Document, index: number): ActivityItem => ({
            id: `doc-activity-${doc.id}-${index}`,
            text: `Document "${doc.title}" was recently updated (Status: ${doc.status}).`,
            timestamp: new Date(doc.updatedAt).toLocaleDateString(),
            imageUrl: doc.imageUrl || (doc.status === 'approved' ? 'https://placehold.co/48x48/a2e2a2/000000.png' : 'https://placehold.co/48x48.png') ,
            imageAlt: doc.title,
            dataAiHint: "document icon",
            link: `/documents/${doc.id}`
          }));
        setRecentActivities(derivedActivities.length > 0 ? derivedActivities : staticRecentActivities);

      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        // Keep static/default stats on error
      } finally {
        setLoadingStats(false);
      }
    };

    if (user && !authLoading) {
      fetchDashboardData();
    } else if (!authLoading && !user) {
      setLoadingStats(false); // Not logged in, no stats to load
    }
  }, [user, authLoading]);

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <AppLogo />
        <h1 className="text-3xl font-bold my-4">Welcome to DocuFlow</h1>
        <p className="text-lg text-muted-foreground mb-8">Please log in to manage your documents.</p>
        <Link href="/login">
          <Button size="lg">Login</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">Here's an overview of your document landscape.</p>
        </div>
        {(user.role === 'editor' || user.role === 'admin') && (
          <Link href="/documents/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Document
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : summaryStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Across all statuses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Documents</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : summaryStats.approvedDocuments}</div>
            <p className="text-xs text-muted-foreground">Published and accessible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : summaryStats.pendingReview}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : summaryStats.drafts}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>A log of recent document changes and system updates.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStats && recentActivities.length === 0 ? (
            <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
          ) : recentActivities.length > 0 ? (
            <ul className="space-y-4">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg shadow-sm">
                  {activity.imageUrl && (
                    <div className="flex-shrink-0 mt-0.5">
                      <Image
                        src={activity.imageUrl}
                        alt={activity.imageAlt || 'Activity image'}
                        width={48}
                        height={48}
                        className="rounded-md object-cover"
                        {...(activity.dataAiHint && {'data-ai-hint': activity.dataAiHint})}
                      />
                    </div>
                  )}
                  <div className="flex-grow">
                    {activity.link ? (
                       <Link href={activity.link} className="hover:underline"><p className="text-sm text-foreground">{activity.text}</p></Link>
                    ) : (
                       <p className="text-sm text-foreground">{activity.text}</p>
                    )}
                    {activity.timestamp && (
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.timestamp}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No recent activity to display.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
