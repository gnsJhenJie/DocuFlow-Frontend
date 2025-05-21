
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UserManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      // Redirect non-admins away from this page
      router.push('/');
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    // This message might be briefly visible or not at all if redirection is fast
    return <p className="text-center mt-8">Access Denied. You must be an administrator to view this page.</p>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Users className="mr-3 h-8 w-8" /> User Management
        </h1>
        <p className="text-muted-foreground">Manage users and their roles within the application.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>View and manage system users.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">User management features will be available here soon.</p>
          {/* Placeholder for future user table or list */}
          <div className="mt-4 p-6 border-2 border-dashed rounded-lg text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-semibold">User table coming soon</p>
            <p className="text-sm text-muted-foreground">Functionality to add, edit, and remove users will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
