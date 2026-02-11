import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CreateScenarioModal({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const presetScenarios = [
    { name: 'Current Production', desc: 'Baseline scenario with current processes' },
    { name: 'Optimized Energy', desc: 'Reduced energy consumption by 30%' },
    { name: 'Recycled Materials', desc: '50% recycled material content' },
    { name: 'Local Sourcing', desc: 'Materials sourced within 500km' },
    { name: 'Renewable Energy', desc: '100% renewable electricity' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Scenario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Scenario Name *</Label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Optimized Production"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what changes in this scenario..."
              className="h-20"
            />
          </div>

          <div className="space-y-2">
            <Label>Quick Templates</Label>
            <div className="grid grid-cols-2 gap-2">
              {presetScenarios.map(preset => (
                <Button
                  key={preset.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setName(preset.name);
                    setDescription(preset.desc);
                  }}
                  className="text-xs h-auto py-2 justify-start"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => {
              onSubmit(name);
              setName('');
              setDescription('');
            }}
            disabled={!name}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Create Scenario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}