import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertCaseSchema, type Case } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const caseFormSchema = insertCaseSchema.extend({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  amountRequired: z.number().min(1, 'Amount must be at least 1'),
}).omit({
  imageUrl: true,
});

type CaseFormValues = z.infer<typeof caseFormSchema>;

interface CaseManagementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseToEdit?: Case | null;
}

export default function CaseManagementForm({ 
  open, 
  onOpenChange, 
  caseToEdit 
}: CaseManagementFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!caseToEdit;

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      title: '',
      description: '',
      amountRequired: 0,
      active: true,
      recurringAllowed: false,
    },
  });

  // Reset form when caseToEdit changes
  useEffect(() => {
    if (caseToEdit) {
      form.reset({
        title: caseToEdit.title,
        description: caseToEdit.description,
        amountRequired: caseToEdit.amountRequired,
        active: caseToEdit.active,
        recurringAllowed: caseToEdit.recurringAllowed,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        amountRequired: 0,
        active: true,
        recurringAllowed: false,
      });
    }
  }, [caseToEdit, form]);

  // Create case mutation
  const createMutation = useMutation({
    mutationFn: async (data: CaseFormValues) => {
      const response = await apiRequest('POST', '/api/cases', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/active-zakaat-cases'] });
      toast({
        title: 'Success',
        description: 'Case created successfully',
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create case',
        variant: 'destructive',
      });
    },
  });

  // Update case mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CaseFormValues) => {
      const response = await apiRequest('PUT', `/api/cases/${caseToEdit!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/active-zakaat-cases'] });
      toast({
        title: 'Success',
        description: 'Case updated successfully',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update case',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CaseFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Case' : 'Create New Case'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter case title" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter detailed case description"
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            <FormField
              control={form.control}
              name="amountRequired"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Required (AUD)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Active Status
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this case for donations
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recurringAllowed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Recurring Donation
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Case' : 'Create Case'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}