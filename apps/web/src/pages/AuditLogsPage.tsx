import { useState } from 'react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Search, Activity, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Badge } from '../components/ui/badge';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [actionFilter, setActionFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');

  const { data: auditLogsData, isLoading, isError } = useAuditLogs(page, limit, debouncedFilter || undefined);

  const logs = auditLogsData?.data || [];
  const meta = auditLogsData?.meta || { total: 0, page: 1, limit };
  const totalPages = Math.ceil(meta.total / meta.limit);

  const handleSearch = (e: any) => {
    e.preventDefault();
    setDebouncedFilter(actionFilter);
    setPage(1); // Reset to first page on new search
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    if (action.includes('delete')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    if (action.includes('update')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    if (action.includes('revoke')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  };

  if (isError) {
    return (
      <div className="p-6 text-center border rounded-lg bg-destructive/10 text-destructive max-w-6xl">
        <p>Failed to load audit logs. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track all security events and access across your organization.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                Detailed record of all system and user operations.
              </CardDescription>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by action (e.g. bucket.create)..."
                  className="pl-9"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted/50 rounded animate-pulse w-32" /></TableCell>
                      <TableCell><div className="h-5 bg-muted/50 rounded-full animate-pulse w-24" /></TableCell>
                      <TableCell><div className="h-4 bg-muted/50 rounded animate-pulse w-48" /></TableCell>
                      <TableCell><div className="h-4 bg-muted/50 rounded animate-pulse w-24" /></TableCell>
                      <TableCell><div className="h-4 bg-muted/50 rounded animate-pulse w-28" /></TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Activity className="h-8 w-8 mb-2 opacity-20" />
                        <p>No audit logs found</p>
                        {debouncedFilter && (
                          <p className="text-sm mt-1">Try adjusting your filters</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate" title={log.resource}>
                        {log.resource}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.userName || log.userEmail ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{log.userName || log.userEmail}</span>
                              {log.userName && log.userEmail && (
                                <span className="text-xs text-muted-foreground font-mono">{log.userEmail}</span>
                              )}
                            </div>
                          ) : log.userId ? (
                            <span className="text-sm">User #{log.userId}</span>
                          ) : log.credentialId ? (
                            <span className="text-sm font-mono text-muted-foreground">Key #{log.credentialId}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">System</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {log.ipAddress || '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
