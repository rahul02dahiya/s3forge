
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCreateBucket } from '../../hooks/useBuckets';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { VisibilitySelector } from './VisibilitySelector';

const createBucketSchema = z.object({
  name: z
    .string()
    .min(3, 'Bucket name must be at least 3 characters')
    .max(63, 'Bucket name must not exceed 63 characters')
    .regex(
      /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
      'Bucket name must contain only lowercase letters, numbers, and hyphens, and must begin and end with a letter or number'
    ),
  region: z.string().min(1, 'Region is required'),
  visibility: z.enum(['private', 'public']),
});

type CreateBucketFormValues = z.infer<typeof createBucketSchema>;

interface CreateBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBucketDialog({ open, onOpenChange }: CreateBucketDialogProps) {
  const createBucketMutation = useCreateBucket();

  const form = useForm<CreateBucketFormValues>({
    resolver: zodResolver(createBucketSchema),
    defaultValues: {
      name: '',
      region: 'us-east-1',
      visibility: 'private',
    },
  });

  const onSubmit = async (data: CreateBucketFormValues) => {
    try {
      await createBucketMutation.mutateAsync({
        name: data.name,
        region: data.region,
        visibility: data.visibility,
        quotaBytes: 0,
      });

      toast.success('Bucket created successfully');
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create bucket');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Bucket</DialogTitle>
          <DialogDescription>
            Create a new S3-compatible storage bucket.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bucket Name</Label>
            <Input 
              id="name" 
              placeholder="my-app-assets" 
              {...form.register("name")} 
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Must be globally unique and contain only lowercase letters, numbers, and hyphens.
            </p>
            {form.formState.errors.name && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input 
              id="region" 
              {...form.register("region")} 
            />
            {form.formState.errors.region && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.region.message}
              </p>
            )}
          </div>

          <VisibilitySelector
            value={form.watch('visibility')}
            onChange={(val) => form.setValue('visibility', val, { shouldValidate: true })}
            error={form.formState.errors.visibility?.message}
          />

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createBucketMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createBucketMutation.isPending}>
              {createBucketMutation.isPending ? 'Creating...' : 'Create Bucket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
