import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Activity, Clock, CheckCircle2, XCircle, TrendingUp 
} from "lucide-react";
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

/**
 * CBAM Load Testing & Performance Panel
 * Test system capacity: 1K, 5K, 10K entries/day
 */

export default function CBAMLoadTestingPanel() {
  const [testSize, setTestSize] = useState('1000');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  
  const runLoadTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);
    
    const startTime = Date.now();
    const size = parseInt(testSize);
    const batchSize = 100;
    
    toast.info(`Starting load test: ${size.toLocaleString()} entries`);
    
    try {
      let created = 0;
      let failed = 0;
      
      for (let i = 0; i < size; i += batchSize) {
        const batch = Math.min(batchSize, size - i);
        
        // Generate test entries
        const testEntries = Array.from({ length: batch }, (_, idx) => ({
          import_id: `TEST-${Date.now()}-${i + idx}`,
          cn_code: ['7208', '7601', '2523'][Math.floor(Math.random() * 3)],
          quantity: Math.random() * 100 + 10,
          country_of_origin: ['China', 'India', 'Turkey'][Math.floor(Math.random() * 3)],
          direct_emissions_specific: Math.random() * 2 + 0.5,
          calculation_method: 'Default_values',
          aggregated_goods_category: 'Iron & Steel',
          product_name: 'Load Test Entry',
          import_date: new Date().toISOString().split('T')[0]
        }));
        
        // Bulk create
        try {
          await base44.entities.CBAMEmissionEntry.bulkCreate(testEntries);
          created += batch;
        } catch (err) {
          failed += batch;
        }
        
        setProgress(Math.round((created / size) * 100));
      }
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      const throughput = size / duration;
      
      setResults({
        total: size,
        created,
        failed,
        duration_seconds: duration.toFixed(2),
        throughput_per_second: throughput.toFixed(2),
        success_rate: ((created / size) * 100).toFixed(1)
      });
      
      toast.success(`Load test complete: ${created.toLocaleString()} entries created in ${duration.toFixed(1)}s`);
      
    } catch (error) {
      toast.error('Load test failed: ' + error.message);
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#86b027]" />
          Performance & Load Testing
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Test system capacity and throughput
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <Input
            type="number"
            value={testSize}
            onChange={(e) => setTestSize(e.target.value)}
            placeholder="Number of test entries"
            disabled={isRunning}
          />
          <Button
            onClick={runLoadTest}
            disabled={isRunning || !testSize}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isRunning ? (
              <>
                <Activity className="w-4 h-4 mr-2 animate-pulse" />
                Running...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </div>
        
        {isRunning && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Progress</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" indicatorClassName="bg-[#86b027]" />
          </div>
        )}
        
        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-700">Created</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-900 mt-2">
                  {results.created.toLocaleString()}
                </p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-700">Failed</span>
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-900 mt-2">
                  {results.failed.toLocaleString()}
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Duration</span>
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-2">
                  {results.duration_seconds}s
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-700">Throughput</span>
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-900 mt-2">
                  {results.throughput_per_second}/s
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Success Rate</span>
                <Badge className="bg-[#86b027] text-white">
                  {results.success_rate}%
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}