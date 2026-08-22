import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useUpdateBucket } from '../../hooks/useBuckets';
import { VisibilitySelector } from './VisibilitySelector';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const editBucketSchema = z.object({
  visibility: z.enum(['private', 'public']),
  quotaGb: z.coerce.number().min(0, 'Quota cannot be negative'),
});

type EditBucketFormValues = z.infer<typeof editBucketSchema>;

interface EditBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: {
    name: string;
    visibility: string;
    quotaBytes?: number;
  };
}

const BYTES_PER_GB = 1024 * 1024 * 1024;

export function EditBucketDialog({ open, onOpenChange, bucket }: EditBucketDialogProps) {
  const updateBucketMutation = useUpdateBucket();

  const form = useForm<EditBucketFormValues>({
    resolver: zodResolver(editBucketSchema),
    defaultValues: {
      visibility: (bucket?.visibility as 'private' | 'public') || 'private',
      quotaGb: bucket?.quotaBytes ? Math.round(bucket.quotaBytes / BYTES_PER_GB) : 0,
    },
  });

  useEffect(() => {
    if (bucket) {
      form.reset({
        visibility: (bucket.visibility as 'private' | 'public') || 'private',
        quotaGb: bucket.quotaBytes ? Math.round(bucket.quotaBytes / BYTES_PER_GB) : 0,
      });
    }
  }, [bucket, form]);

  const onSubmit = async (data: EditBucketFormValues) => {
    try {
      await updateBucketMutation.mutateAsync({
        name: bucket.name,
        visibility: data.visibility,
        quotaBytes: data.quotaGb * BYTES_PER_GB,
      });

      toast.success('Bucket updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update bucket');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Bucket</DialogTitle>
          <DialogDescription>
            Update configuration and access control for bucket <strong className="text-foreground">{bucket.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <VisibilitySelector
            value={form.watch('visibility')}
            onChange={(val) => form.setValue('visibility', val, { shouldValidate: true })}
            error={form.formState.errors.visibility?.message}
          />

          <div className="space-y-2">
            <Label htmlFor="quotaGb">Storage Quota (GB)</Label>
            <Input
              id="quotaGb"
              type="number"
              min="0"
              placeholder="0 (Unlimited)"
              {...form.register('quotaGb')}
            />
            <p className="text-[0.75rem] text-muted-foreground">
              Maximum allowed storage capacity for this bucket in Gigabytes (0 = Unlimited).
            </p>
            {form.formState.errors.quotaGb && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.quotaGb.message}
              </p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateBucketMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateBucketMutation.isPending}>
              {updateBucketMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
