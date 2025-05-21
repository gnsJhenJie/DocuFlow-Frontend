
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, Clock, AlertTriangle, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { mockDocuments } from '@/lib/mockData'; // Using mock data for summaries
import Image from 'next/image'; // Import next/image

interface ActivityItem {
  id: string;
  text: string;
  timestamp?: string;
  imageUrl?: string;
  imageAlt?: string;
  dataAiHint?: string;
}

// Sample recent activities with optional images
const recentActivities: ActivityItem[] = [
  {
    id: 'activity1',
    text: 'Document "Q1 Marketing Strategy" submitted for review. A new cover image was added.',
    imageUrl: 'https://placehold.co/48x48.png',
    imageAlt: 'Q1 Marketing Strategy',
    dataAiHint: 'strategy document',
  },
  {
    id: 'activity2',
    text: 'Document "Annual Financial Report" was rejected by Charlie Brown due to outdated figures.',
    // No image for this activity
  },
  {
    id: 'activity3',
    text: 'New document "UX Design Principles" created by Alice Wonderland.',
    imageUrl: 'https://placehold.co/48x48.png',
    imageAlt: 'UX Design Principles',
    dataAiHint: 'design book',
  },
  {
    id: 'activity4',
    text: 'Bob The Builder updated the "New Employee Onboarding Manual" with a revised welcome video thumbnail.',
    imageUrl: 'https://placehold.co/48x48.png',
    imageAlt: 'Onboarding Manual Update',
    dataAiHint: 'employee handbook',
  },
];


export default function DashboardPage() {
  const { user } = useAuth();

  // Simulate fetching summary data
  const summaryStats = {
    totalDocuments: mockDocuments.length,
    approvedDocuments: mockDocuments.filter(doc => doc.status === 'approved').length,
    pendingReview: mockDocuments.filter(doc => doc.status === 'pending_review').length,
    drafts: mockDocuments.filter(doc => doc.status === 'draft').length,
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <h1 className="text-3xl font-bold mb-4">Welcome to DocuFlow</h1>
        <p className="text-lg text-muted-foreground mb-8">Please log in to manage your documents.</p>
        <Link href="/login">
          <Button size="lg">Login</Button>
        </Link>
      </div>
    );
  }
  
  console.log(`[DashboardPage] User ${user.id} (${user.role}) viewing dashboard.`);

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
            <div className="text-2xl font-bold">{summaryStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Across all statuses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Documents</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.approvedDocuments}</div>
            <p className="text-xs text-muted-foreground">Published and accessible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.pendingReview}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.drafts}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>A log of recent document changes and reviews, now with images.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <ul className="space-y-4">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg shadow-sm">
                  {activity.imageUrl && (
                    <div className="flex-shrink-0 mt-0.5"> {/* Added mt-0.5 for better alignment with text */}
                      <Image
                        src={activity.imageUrl}
                        alt={activity.imageAlt || 'Activity image'}
                        width={48} // Increased size for better visibility
                        height={48}
                        className="rounded-md object-cover" // Changed to rounded-md and object-cover
                        {...(activity.dataAiHint && {'data-ai-hint': activity.dataAiHint})}
                      />
                    </div>
                  )}
                  <div className="flex-grow">
                    <p className="text-sm text-foreground">{activity.text}</p>
                    {activity.timestamp && (
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.timestamp}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No recent activity to display. Activity logging will be implemented here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

