import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { CheckCircle2, AlertTriangle, Clock, TrendingUp } from "lucide-react";

export default function DataCollectionProgress({ dataPoints, materialTopics }) {
  const esrsStandards = ['ESRS E1', 'ESRS E2', 'ESRS E3', 'ESRS E4', 'ESRS E5', 'ESRS S1', 'ESRS S2', 'ESRS S3', 'ESRS S4', 'ESRS G1'];

  // Calculate progress per ESRS
  const esrsProgress = esrsStandards.map(std => {
    const stdDataPoints = dataPoints.filter(d => d.esrs_standard === std);
    const isMaterial = materialTopics.some(t => t.esrs_standard === std && t.is_material);
    
    // Expected data points per ESRS (simplified - would be from ESRS requirements)
    const expectedDataPoints = isMaterial ? 15 : 5; // Material topics need more data points
    
    const collected = stdDataPoints.length;
    const verified = stdDataPoints.filter(d => d.verification_status !== 'Unverified').length;
    const externallyAssured = stdDataPoints.filter(d => d.verification_status === 'Externally Assured').length;
    
    return {
      standard: std,
      collected,
      expected: expectedDataPoints,
      progress: Math.min((collected / expectedDataPoints) * 100, 100),
      verified,
      externallyAssured,
      isMaterial,
      gaps: Math.max(expectedDataPoints - collected, 0)
    };
  });

  // Overall stats
  const totalExpected = esrsProgress.reduce((sum, e) => sum + e.expected, 0);
  const totalCollected = dataPoints.length;
  const overallProgress = (totalCollected / totalExpected) * 100;
  
  const verifiedCount = dataPoints.filter(d => d.verification_status !== 'Unverified').length;
  const verificationRate = (verifiedCount / totalCollected) * 100 || 0;

  // Verification status breakdown
  const verificationBreakdown = [
    { status: 'Externally Assured', count: dataPoints.filter(d => d.verification_status === 'Externally Assured').length, color: '#86b027' },
    { status: 'Internally Verified', count: dataPoints.filter(d => d.verification_status === 'Internally Verified').length, color: '#02a1e8' },
    { status: 'Unverified', count: dataPoints.filter(d => d.verification_status === 'Unverified').length, color: '#f59e0b' }
  ];

  // Radar chart data
  const radarData = esrsProgress.slice(0, 5).map(e => ({
    subject: e.standard.replace('ESRS ', ''),
    completeness: e.progress,
    quality: (e.verified / (e.collected || 1)) * 100
  }));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#86b027]/20 bg-[#86b027]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-[#86b027]" />
              <span className="text-3xl font-bold text-[#86b027]">{Math.round(overallProgress)}%</span>
            </div>
            <p className="text-xs font-bold text-[#86b027] uppercase">Overall Progress</p>
            <p className="text-xs text-slate-600 mt-1">{totalCollected}/{totalExpected} data points</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <span className="text-3xl font-bold text-emerald-600">{verifiedCount}</span>
            </div>
            <p className="text-xs font-bold text-emerald-700 uppercase">Verified</p>
            <p className="text-xs text-slate-600 mt-1">{Math.round(verificationRate)}% verification rate</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              <span className="text-3xl font-bold text-amber-600">
                {esrsProgress.reduce((sum, e) => sum + e.gaps, 0)}
              </span>
            </div>
            <p className="text-xs font-bold text-amber-700 uppercase">Data Gaps</p>
            <p className="text-xs text-slate-600 mt-1">Missing data points</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-blue-600">
                {esrsProgress.filter(e => e.progress < 100 && e.isMaterial).length}
              </span>
            </div>
            <p className="text-xs font-bold text-blue-700 uppercase">In Progress</p>
            <p className="text-xs text-slate-600 mt-1">Material topics incomplete</p>
          </CardContent>
        </Card>
      </div>

      {/* ESRS Progress Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Data Collection Progress by ESRS Standard</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={esrsProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="standard" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border-2 border-[#86b027] rounded shadow-lg">
                        <p className="font-bold mb-2">{data.standard}</p>
                        <p className="text-sm">Collected: {data.collected}/{data.expected}</p>
                        <p className="text-sm">Verified: {data.verified}</p>
                        <p className="text-sm">Gaps: {data.gaps}</p>
                        {data.isMaterial && (
                          <Badge className="bg-[#86b027] mt-2">Material Topic</Badge>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="collected" fill="#86b027" name="Collected" />
              <Bar dataKey="verified" fill="#02a1e8" name="Verified" />
              <Bar dataKey="gaps" fill="#f59e0b" name="Gaps" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed ESRS Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {esrsProgress.map(esrs => (
          <Card key={esrs.standard} className={esrs.isMaterial ? 'border-[#86b027]' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{esrs.standard}</CardTitle>
                <div className="flex gap-2">
                  {esrs.isMaterial && <Badge className="bg-[#86b027]">Material</Badge>}
                  <Badge variant="outline">{Math.round(esrs.progress)}%</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Collection Progress</span>
                    <span className="font-bold">{esrs.collected}/{esrs.expected}</span>
                  </div>
                  <Progress value={esrs.progress} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 p-2 rounded">
                    <p className="font-bold text-emerald-700">{esrs.verified}</p>
                    <p className="text-slate-600">Verified</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="font-bold text-blue-700">{esrs.externallyAssured}</p>
                    <p className="text-slate-600">Assured</p>
                  </div>
                  <div className="bg-amber-50 p-2 rounded">
                    <p className="font-bold text-amber-700">{esrs.gaps}</p>
                    <p className="text-slate-600">Gaps</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Verification Status */}
      <Card>
        <CardHeader>
          <CardTitle>Data Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {verificationBreakdown.map(v => (
              <div key={v.status}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{v.status}</span>
                  <span className="font-bold">{v.count} data points</span>
                </div>
                <Progress 
                  value={(v.count / totalCollected) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}