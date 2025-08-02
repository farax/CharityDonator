import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Case } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

interface CaseManagementTableProps {
  cases: Case[];
  isLoading: boolean;
  onEditCase: (caseItem: Case) => void;
}

export default function CaseManagementTable({ 
  cases, 
  isLoading, 
  onEditCase 
}: CaseManagementTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);

  // Toggle case status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (caseId: number) => {
      const response = await apiRequest('PATCH', `/api/cases/${caseId}/toggle-status`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/active-zakaat-cases'] });
      toast({
        title: 'Success',
        description: 'Case status updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update case status',
        variant: 'destructive',
      });
    },
  });

  // Delete case mutation
  const deleteMutation = useMutation({
    mutationFn: async (caseId: number) => {
      const response = await apiRequest('DELETE', `/api/cases/${caseId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/active-zakaat-cases'] });
      toast({
        title: 'Success',
        description: 'Case deleted successfully',
      });
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete case',
        variant: 'destructive',
      });
    },
  });

  const handleToggleStatus = (caseItem: Case) => {
    toggleStatusMutation.mutate(caseItem.id);
  };

  const handleDeleteClick = (caseItem: Case) => {
    setCaseToDelete(caseItem);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (caseToDelete) {
      deleteMutation.mutate(caseToDelete.id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const calculateProgress = (collected: number, required: number) => {
    return Math.min((collected / required) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <p className="text-muted-foreground">No cases found. Create your first case to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Amount Required</TableHead>
              <TableHead>Amount Collected</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((caseItem) => (
              <TableRow key={caseItem.id}>
                <TableCell className="font-medium">
                  <div className="max-w-[200px] truncate" title={caseItem.title}>
                    {caseItem.title}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={caseItem.active ? 'default' : 'secondary'}>
                    {caseItem.active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {caseItem.recurringAllowed ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                      🔄 Yes
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      No
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${calculateProgress(caseItem.amountCollected, caseItem.amountRequired)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {calculateProgress(caseItem.amountCollected, caseItem.amountRequired).toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(caseItem.amountRequired)}</TableCell>
                <TableCell>{formatCurrency(caseItem.amountCollected)}</TableCell>
                <TableCell>{new Date(caseItem.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditCase(caseItem)}
                      disabled={toggleStatusMutation.isPending || deleteMutation.isPending}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(caseItem)}
                      disabled={toggleStatusMutation.isPending || deleteMutation.isPending}
                    >
                      {toggleStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : caseItem.active ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(caseItem)}
                      disabled={toggleStatusMutation.isPending || deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{caseToDelete?.title}"? This action cannot be undone.
              Any donations already collected for this case will remain in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Case
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}