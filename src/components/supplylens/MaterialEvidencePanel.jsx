import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EvidenceSidePanel from './EvidenceSidePanel';

export default function MaterialEvidencePanel({ material, open, onOpenChange }) {
  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Evidence: {material.material_name}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <EvidenceSidePanel 
            entityType="MaterialSKU" 
            entityId={material.id}
            entityName={material.material_name}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}