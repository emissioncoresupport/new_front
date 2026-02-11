import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Search, Eye, ExternalLink } from "lucide-react";

export default function AuditorDataAccess() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: dataPoints = [] } = useQuery({
    queryKey: ['csrd-data-points'],
    queryFn: () => base44.entities.CSRDDataPoint.list()
  });

  const { data: narratives = [] } = useQuery({
    queryKey: ['csrd-narratives'],
    queryFn: () => base44.entities.CSRDNarrative.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['csrd-tasks'],
    queryFn: () => base44.entities.CSRDTask.list()
  });

  const { data: evidenceDocs = [] } = useQuery({
    queryKey: ['evidence-documents'],
    queryFn: () => base44.entities.EvidenceDocument.list().catch(() => [])
  });

  const esrsStandards = ['ESRS E1', 'ESRS E2', 'ESRS E3', 'ESRS E4', 'ESRS E5', 'ESRS S1', 'ESRS S2', 'ESRS S3', 'ESRS S4', 'ESRS G1'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">Auditor Data Access</h2>
          <p className="text-sm text-slate-600 mt-1">Access CSRD data points, narratives, and supporting evidence</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search across all CSRD data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="by-esrs">
        <TabsList>
          <TabsTrigger value="by-esrs">By ESRS Standard</TabsTrigger>
          <TabsTrigger value="data-points">Data Points</TabsTrigger>
          <TabsTrigger value="narratives">Narratives</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
        </TabsList>

        <TabsContent value="by-esrs" className="space-y-4">
          {esrsStandards.map(std => {
            const stdDataPoints = dataPoints.filter(d => d.esrs_standard === std);
            const stdNarratives = narratives.filter(n => n.esrs_standard === std);
            
            return (
              <Card key={std}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{std}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">{stdDataPoints.length} Data Points</Badge>
                      <Badge variant="outline">{stdNarratives.length} Narratives</Badge>
                    </div>
                  </div>
                </CardHeader>
                {(stdDataPoints.length > 0 || stdNarratives.length > 0) && (
                  <CardContent>
                    {stdDataPoints.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-2 text-[#545454]">Data Points:</h4>
                        <div className="space-y-2">
                          {stdDataPoints.slice(0, 3).map(dp => (
                            <div key={dp.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                              <div>
                                <p className="text-sm font-medium">{dp.metric_name}</p>
                                <p className="text-xs text-slate-500">{dp.esrs_code}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{dp.value} {dp.unit}</span>
                                <Badge className="bg-emerald-500">{dp.verification_status}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {stdNarratives.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-[#545454]">Narratives:</h4>
                        <div className="space-y-2">
                          {stdNarratives.slice(0, 2).map(n => (
                            <div key={n.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{n.section_title}</p>
                                <p className="text-xs text-slate-500">{n.word_count} words • Status: {n.status}</p>
                              </div>
                              <Button size="sm" variant="ghost">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="data-points" className="space-y-4">
          {dataPoints.filter(dp => 
            !searchTerm || 
            dp.metric_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dp.esrs_code?.toLowerCase().includes(searchTerm.toLowerCase())
          ).map(dp => (
            <Card key={dp.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-[#545454]">{dp.metric_name}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-[#02a1e8]">{dp.esrs_standard}</Badge>
                      <Badge variant="outline">{dp.esrs_code}</Badge>
                      <Badge className="bg-emerald-500">{dp.verification_status}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Value</p>
                        <p className="font-bold">{dp.value} {dp.unit}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Data Source</p>
                        <p className="font-medium">{dp.data_source || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Reporting Year</p>
                        <p className="font-medium">{dp.reporting_year}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="narratives" className="space-y-4">
          {narratives.map(n => (
            <Card key={n.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-[#545454]">{n.section_title}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-[#02a1e8]">{n.esrs_standard}</Badge>
                      <Badge variant="outline">{n.disclosure_requirement}</Badge>
                      <Badge>{n.status}</Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-slate-500">EFRAG Score</p>
                    <p className="font-bold text-lg text-[#86b027]">{n.efrag_compliance_score || 'N/A'}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{n.content?.substring(0, 200)}...</p>
                <div className="mt-3 flex justify-between items-center text-sm">
                  <span className="text-slate-500">{n.word_count} words</span>
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View Full
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.filter(t => t.document_urls?.length > 0).map(task => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-2">{task.title}</h4>
                  <div className="space-y-2">
                    {task.document_urls.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#02a1e8]" />
                          <span className="text-sm">Document {idx + 1}</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => window.open(url, '_blank')}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}