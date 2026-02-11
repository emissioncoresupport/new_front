import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Copy, Eye, EyeOff, Plus, Trash2, RefreshCw } from "lucide-react";

export default function APIKeysPanel() {
  const [showKeys, setShowKeys] = useState({});
  const [apiKeys] = useState([
    { id: '1', name: 'Production API', key: 'sk_live_abc123...', created: '2025-01-15', lastUsed: '2 hours ago' },
    { id: '2', name: 'Development API', key: 'sk_test_xyz789...', created: '2025-01-10', lastUsed: 'Never' },
  ]);

  const maskKey = (key) => {
    if (!key) return '';
    return key.substring(0, 12) + '•'.repeat(20);
  };

  const copyToClipboard = (key) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-slate-900" />
            API Keys
          </CardTitle>
          <Button size="sm" className="bg-slate-900 text-white hover:bg-black">
            <Plus className="w-4 h-4 mr-2" />
            Generate New Key
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} className="border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{apiKey.name}</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Created: {apiKey.created} • Last used: {apiKey.lastUsed}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowKeys({...showKeys, [apiKey.id]: !showKeys[apiKey.id]})}
                    >
                      {showKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(apiKey.key)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg font-mono text-sm text-green-400">
                  {showKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Security Note:</strong> Keep your API keys secure. Never expose them in client-side code or public repositories.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}