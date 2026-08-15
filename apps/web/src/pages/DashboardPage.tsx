import { useStorageUsage } from '../hooks/useStorageUsage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Database, HardDrive, Files } from 'lucide-react';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function DashboardPage() {
  const { data: usageResponse, isLoading, isError } = useStorageUsage();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded"></div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card">
              <CardHeader className="pb-2"><div className="h-4 w-24 bg-muted rounded"></div></CardHeader>
              <CardContent><div className="h-8 w-16 bg-muted rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !usageResponse) {
    return (
      <div className="p-6 text-center border rounded-lg bg-destructive/10 text-destructive">
        <p>Failed to load dashboard metrics. Please try again later.</p>
      </div>
    );
  }

  const { data } = usageResponse;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your organization's storage usage and buckets.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-card shadow-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatBytes(data.totalStorageBytes)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Objects</CardTitle>
            <Files className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalObjects.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Buckets</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalBuckets}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle>Top Buckets by Usage</CardTitle>
            <CardDescription>
              Your largest buckets by storage size.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.bucketsUsage
                .sort((a, b) => b.totalBytes - a.totalBytes)
                .slice(0, 5)
                .map((bucket) => (
                <div key={bucket.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Database className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{bucket.name}</p>
                      <p className="text-xs text-muted-foreground">{bucket.objectCount.toLocaleString()} objects</p>
                    </div>
                  </div>
                  <div className="font-medium text-sm">
                    {formatBytes(bucket.totalBytes)}
                  </div>
                </div>
              ))}
              
              {data.bucketsUsage.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No buckets found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
