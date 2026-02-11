import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function MappingConflictResolver() {
  const queryClient = useQueryClient();

  // Fetch Conflicts
  const { data: conflicts = [] } = useQuery({
    queryKey: ['data-conflicts'],
    queryFn: () => base44.entities.DataConflict.filter({ status: 'open' })
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.DataConflict.update(id, { 
      status: 'resolved',
      resolution_notes: notes
    }),
    onSuccess: () => {
      toast.success("Conflict Resolved");
      queryClient.invalidateQueries({ queryKey: ['data-conflicts'] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Conflict Resolution
        </h3>
        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
          {conflicts.length} Open Issues
        </Badge>
      </div>

      {conflicts.length === 0 ? (
        <Card className="bg-emerald-50/50 border border-emerald-100">
          <CardContent className="flex flex-col items-center justify-center py-8 text-emerald-600">
            <Check className="w-10 h-10 mb-2 opacity-50" />
            <p className="font-medium">No data conflicts detected.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conflicts.map(conflict => (
            <ConflictCard key={conflict.id} conflict={conflict} onResolve={resolveMutation.mutate} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConflictCard({ conflict, onResolve }) {
  const [open, setOpen] = React.useState(false);
  const [notes, setNotes] = React.useState('');

  const handleResolve = () => {
    onResolve({ id: conflict.id, notes });
    setOpen(false);
  };

  return (
    <Card className="border-l-4 border-l-amber-500 border-y-slate-200 border-r-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {conflict.conflict_type.replace('_', ' ')}
              </Badge>
              <Badge className={
                conflict.severity === 'high' ? "bg-rose-100 text-rose-700" :
                conflict.severity === 'medium' ? "bg-amber-100 text-amber-700" :
                "bg-blue-100 text-blue-700"
              }>
                {conflict.severity} Priority
              </Badge>
            </div>
            <p className="font-medium text-slate-800">{conflict.description}</p>
            <p className="text-xs text-slate-500">Entity ID: {conflict.entity_id} • {conflict.entity_type}</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                Resolve
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resolve Conflict</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                  <p className="font-medium text-slate-700 mb-1">Issue:</p>
                  <p className="text-slate-600">{conflict.description}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resolution Notes</label>
                  <Textarea 
                    placeholder="Describe how this was resolved..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleResolve} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Mark as Resolved
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}