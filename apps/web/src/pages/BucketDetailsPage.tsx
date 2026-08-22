import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBucket, useBucketUsage, useDeleteBucket } from '../hooks/useBuckets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Database, Trash2, HardDrive, Clock, ShieldAlert, Pencil } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { ObjectBrowser } from '../components/buckets/ObjectBrowser';
import { EditBucketDialog } from '../components/buckets/EditBucketDialog';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function BucketDetailsPage() {
  const { bucketName } = useParams<{ bucketName: string }>();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: bucketData, isLoading: isLoadingBucket, isError: isBucketError } = useBucket(bucketName || '');
  const { data: usageData, isLoading: isLoadingUsage } = useBucketUsage(bucketName || '');
  const deleteMutation = useDeleteBucket();

  if (isLoadingBucket || isLoadingUsage) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 bg-muted rounded"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card">
              <CardHeader><div className="h-4 w-24 bg-muted rounded"></div></CardHeader>
              <CardContent><div className="h-8 w-16 bg-muted rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isBucketError || !bucketData?.data) {
    return (
      <div className="p-6 text-center border rounded-lg bg-destructive/10 text-destructive">
        <h2 className="text-xl font-bold mb-2">Bucket Not Found</h2>
        <p>The bucket you are looking for does not exist or you do not have access.</p>
        <Button className="mt-4" onClick={() => navigate('/buckets')}>Back to Buckets</Button>
      </div>
    );
  }

  const bucket = bucketData.data;
  const usage = usageData?.data?.currentUsage;

  const handleDelete = async () => {
    if (!bucketName) return;
    try {
      await deleteMutation.mutateAsync(bucketName);
      toast.success('Bucket deleted successfully');
      navigate('/buckets');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete bucket');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{bucket.name}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <span className="uppercase text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded">
              {bucket.region}
            </span>
            <span>Created on {new Date(bucket.createdAt).toLocaleDateString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            Edit Bucket
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Bucket
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objects</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage?.objectCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(usage?.totalBytes ?? 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visibility</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{bucket.visibility}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">Active</div>
          </CardContent>
        </Card>
      </div>

      <ObjectBrowser bucketName={bucket.name} />

      <Card>
        <CardHeader>
          <CardTitle>Storage History</CardTitle>
          <CardDescription>Usage snapshots over time</CardDescription>
        </CardHeader>
        <CardContent>
          {!usageData?.data?.history || usageData.data.history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
              No usage history available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {usageData.data.history.map((snapshot, i) => (
                <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{formatBytes(snapshot.totalBytes)}</div>
                    <div className="text-sm text-muted-foreground">{snapshot.objectCount} objects</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {snapshot.calculatedAt ? new Date(snapshot.calculatedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditBucketDialog open={isEditOpen} onOpenChange={setIsEditOpen} bucket={bucket} />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the bucket <strong>{bucket.name}</strong> and all of its contents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
