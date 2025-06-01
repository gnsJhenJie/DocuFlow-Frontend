'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, Clock, PlusCircle, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { Document } from '@/lib/types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';


interface ActivityItem {
  id: string;
  text: string;
  timestamp?: string;
  imageUrl?: string;
  imageAlt?: string;
  dataAiHint?: string;
  link?: string;
}

interface ApprovedItem {
  id: string;
  text: string;
  timestamp?: string;
  imageUrl?: string;
  imageAlt?: string;
  dataAiHint?: string;
  link?: string;
}

const staticRecentActivities: ActivityItem[] = [];

function getIconFromStatus(text: string) {
  if (text.includes('approved')) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (text.includes('pending_review')) return <Clock className="h-5 w-5 text-yellow-500" />;
  if (text.includes('draft')) return <FileText className="h-5 w-5 text-blue-500" />;
  if (text.includes('rejected')) return <XCircle className="h-5 w-5 text-red-500" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [summaryStats, setSummaryStats] = useState({
    totalDocuments: 0,
    approvedDocuments: 0,
    pendingReview: 0,
    drafts: 0,
  });
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>(staticRecentActivities);
  const [approvedItems, setApprovedItems] = useState<ApprovedItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoadingStats(true);
      try {
        const params = new URLSearchParams({ limit: "200" });
        const { documents: allDocs } = await apiClient.getDocuments(params);

        setSummaryStats({
          totalDocuments: allDocs.length,
          approvedDocuments: allDocs.filter(doc => doc.status === 'approved').length,
          pendingReview: allDocs.filter(doc => doc.status === 'pending_review').length,
          drafts: allDocs.filter(doc => doc.status === 'draft').length,
        });

        const approvedDocs = allDocs.filter(doc => doc.status === 'approved');
        const derivedApprovedItems = approvedDocs
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5)
          .map((doc: Document, index: number): ApprovedItem => ({
            id: `doc-approved-${doc.id}-${index}`,
            text: `Document "${doc.title}" was approved by ${doc.reviewer_name || 'an admin'}.`,
            timestamp: format(new Date(doc.reviewed_at || doc.updated_at), "MMMM do, yyyy h:mm a", { locale: enUS }),
            imageUrl: doc.image_url,
            imageAlt: doc.title,
            dataAiHint: "document icon",
            link: `/documents/view?id=${doc.id}`,
          }));
        setApprovedItems(derivedApprovedItems);
        if (approvedDocs.length === 0) {
          setApprovedItems([{
            id: 'no-approved-docs',
            text: 'No documents have been approved yet.',
            imageUrl: 'https://placehold.co/48x48.png',
            imageAlt: 'No approved documents icon',
            dataAiHint: 'no approved documents',
            timestamp: format(new Date(), "MMMM do, yyyy h:mm a", { locale: enUS }),
          }]);
        }

        const derivedActivities = allDocs
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5)
          .map((doc: Document, index: number): ActivityItem => ({
            id: `doc-activity-${doc.id}-${index}`,
            text: `Document "${doc.title}" was recently updated (Status: ${doc.status}).`,
            timestamp: format(new Date(doc.updated_at), "MMMM do, yyyy h:mm a", { locale: enUS }),
            imageUrl: doc.image_url,
            imageAlt: doc.title,
            dataAiHint: "document icon",
            link: `/documents/view?id=${doc.id}`
          }));
        setRecentActivities(derivedActivities.length > 0 ? derivedActivities : staticRecentActivities);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (user && !authLoading) {
      fetchDashboardData();
    } else if (!authLoading && !user) {
      setLoadingStats(false);
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
          <CardTitle>Recent Approvements</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStats && approvedItems.length === 0 ? (
            <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
          ) : approvedItems.length > 0 ? (
            <ul className="space-y-4">
              {approvedItems.map((item) => (
                <li key={item.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg shadow-sm">
                  <div className="flex-shrink-0 mt-0.5 w-12 h-12 flex items-center justify-center bg-muted rounded-md">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt || 'Approved document image'}
                        width={48}
                        height={48}
                        className="rounded-md object-cover"
                        {...(item.dataAiHint && {'data-ai-hint': item.dataAiHint})}
                      />
                    ) : (
                      getIconFromStatus(item.text)
                    )}
                  </div>
                  <div className="flex-grow">
                    {item.link ? (
                      <Link href={item.link} className="hover:underline">
                        <p className="text-sm text-foreground">{item.text}</p>
                      </Link>
                    ) : (
                      <p className="text-sm text-foreground">{item.text}</p>
                    )}
                    {item.timestamp && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.timestamp}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No recent approvals to display.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          {/* <CardDescription>A log of recent document changes and system updates.</CardDescription> */}
        </CardHeader>
        <CardContent>
          {loadingStats && recentActivities.length === 0 ? (
            <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
          ) : recentActivities.length > 0 ? (
            <ul className="space-y-4">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg shadow-sm">
                  <div className="flex-shrink-0 mt-0.5 w-12 h-12 flex items-center justify-center bg-muted rounded-md">
                    {activity.imageUrl ? (
                      <Image
                        src={activity.imageUrl}
                        alt={activity.imageAlt || 'Activity image'}
                        width={48}
                        height={48}
                        className="rounded-md object-cover"
                        {...(activity.dataAiHint && {'data-ai-hint': activity.dataAiHint})}
                      />
                    ) : (
                      getIconFromStatus(activity.text)
                    )}
                  </div>
                  <div className="flex-grow">
                    {activity.link ? (
                      <Link href={activity.link} className="hover:underline">
                        <p className="text-sm text-foreground">{activity.text}</p>
                      </Link>
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
