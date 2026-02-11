import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Database, Loader2 } from "lucide-react";
import { initializeCountryFlags } from '@/components/utils/CountryFlagService';

export default function CountryFlagInitializer() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleInitialize = async () => {
    setLoading(true);
    const res = await initializeCountryFlags();
    setResult(res);
    setLoading(false);
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[#86b027]" />
          Initialize Country Flags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          This will populate the database with 70+ countries and their flag emojis. Run this once to enable dynamic country flags across the platform.
        </p>
        
        <Button 
          onClick={handleInitialize} 
          disabled={loading}
          className="bg-[#86b027] hover:bg-[#769c22]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Initializing...
            </>
          ) : (
            'Initialize Country Flags'
          )}
        </Button>

        {result && (
          <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {result.success ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Successfully initialized {result.count} country flags!
                </AlertDescription>
              </>
            ) : (
              <AlertDescription className="text-red-800">
                Failed to initialize country flags. Check console for details.
              </AlertDescription>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}