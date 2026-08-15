import { useState } from 'react';
import { useBuckets } from '../hooks/useBuckets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Database, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CreateBucketDialog } from '../components/buckets/CreateBucketDialog';

export function BucketsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: response, isLoading, isError } = useBuckets();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-10 w-32 bg-muted rounded"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card">
              <CardHeader><div className="h-4 w-24 bg-muted rounded"></div></CardHeader>
              <CardContent><div className="h-8 w-16 bg-muted rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center border rounded-lg bg-destructive/10 text-destructive">
        <p>Failed to load buckets. Please try again later.</p>
      </div>
    );
  }

  const buckets = response?.data || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buckets</h1>
          <p className="text-muted-foreground mt-1">
            Manage your S3-compatible storage buckets.
          </p>
        </div>
        <Button className="gap-2 self-start sm:self-auto" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Bucket
        </Button>
      </div>

      {buckets.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="p-3 bg-primary/10 rounded-full mb-4">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mb-2">No buckets found</CardTitle>
            <CardDescription className="mb-6 max-w-sm mx-auto">
              You haven't created any buckets yet. Create a bucket to start storing objects.
            </CardDescription>
            <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Bucket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {buckets.map((bucket) => (
            <Card key={bucket.id} className="bg-card hover:border-primary/50 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <Link to={`/buckets/${bucket.name}`} className="font-medium hover:underline text-lg truncate block max-w-[200px]">
                    {bucket.name}
                  </Link>
                  <p className="text-xs text-muted-foreground uppercase">{bucket.region}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-md">
                  <Database className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Access</span>
                  <span className="capitalize font-medium">{bucket.visibility}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(bucket.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateBucketDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
