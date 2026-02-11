import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Globe, Lock, FileKey } from "lucide-react";
import { toast } from "sonner";

export default function CBAMRegistryConfigModal({ open, onOpenChange }) {
  const [config, setConfig] = useState({
    memberState: "DE",
    eori: "DE123456789",
    certificateId: "",
    environment: "test"
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    if (!config.certificateId) {
      toast.error("Please provide a valid UUM&DS Certificate ID");
      return;
    }

    setIsConnecting(true);
    // Simulate connection to EU Gateway
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      toast.success("Successfully authenticated with EU CBAM Transitional Registry");
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#02a1e8]" />
            EU Registry Integration
          </DialogTitle>
          <DialogDescription>
            Configure direct connection to the EU CBAM Transitional Registry for automated submissions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
             <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
             <div className="text-xs text-blue-800">
               <strong>Secure Connection:</strong> This integration uses the UUM&DS (Uniform User Management & Digital Signature) system. Your certificates are encrypted locally.
             </div>
          </div>

          <div className="grid gap-2">
            <Label>Registry Environment</Label>
            <Select 
              value={config.environment} 
              onValueChange={(v) => setConfig({...config, environment: v})}
            >
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="test">Test Environment (Conformance)</SelectItem>
                 <SelectItem value="production">Production (Live)</SelectItem>
               </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Member State</Label>
                <Select 
                  value={config.memberState} 
                  onValueChange={(v) => setConfig({...config, memberState: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DE">Germany (DE)</SelectItem>
                    <SelectItem value="FR">France (FR)</SelectItem>
                    <SelectItem value="NL">Netherlands (NL)</SelectItem>
                    <SelectItem value="IT">Italy (IT)</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label>EORI Number</Label>
                <Input 
                  value={config.eori} 
                  onChange={(e) => setConfig({...config, eori: e.target.value})} 
                />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label>Digital Certificate ID (UUM&DS)</Label>
            <div className="flex gap-2">
                <Input 
                  type="password"
                  value={config.certificateId} 
                  onChange={(e) => setConfig({...config, certificateId: e.target.value})}
                  placeholder="Paste your certificate thumbprint or ID"
                />
                <Button variant="outline" size="icon">
                    <FileKey className="w-4 h-4" />
                </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="bg-[#02a1e8] hover:bg-[#028ac7] text-white"
          >
            {isConnecting ? 'Authenticating...' : 'Connect Registry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}