import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ExternalLink, FileText, Scale, Calendar, AlertCircle,
  CheckCircle2, Info, Download, Search, Globe, Building2, Shield,
  TrendingUp, Layers, Archive, Server, Key
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CBAMKnowledgeHub() {
  const [searchTerm, setSearchTerm] = useState('');

  const regulations = [
    {
      id: 'c2025-8151',
      title: 'C(2025) 8151 - Reporting Period & Calendar Year Definition',
      category: '2026 Implementation',
      date: 'December 2025',
      summary: 'Establishes calendar year as the reporting period for CBAM obligations starting from 1 January 2026 (Article 7).',
      keyArticles: ['Art. 7 - Calendar Year Reporting', 'Art. 4 - Production Route Specification'],
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956',
      impact: 'critical'
    },
    {
      id: 'c2025-8552',
      title: 'C(2025) 8552 - Default Values & Phased Mark-ups',
      category: '2026 Implementation',
      date: 'December 2025',
      summary: 'Defines default emission values with phased mark-up schedule: 10% (2026), 20% (2027), 30% (2028+). Lower rates for fertilizers.',
      keyArticles: ['Art. 6 - Mark-up Schedule', 'Annex - Default Values by CN Code & Country'],
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956',
      impact: 'critical'
    },
    {
      id: 'c2025-8560',
      title: 'C(2025) 8560 - Certificate Pricing Methodology',
      category: '2026 Implementation',
      date: 'December 2025',
      summary: 'Certificate pricing based on quarterly average EU ETS prices in 2026, transitioning to weekly averages from 2027 onwards.',
      keyArticles: ['Pricing Calculation', 'Temporal Granularity'],
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956',
      impact: 'high'
    },
    {
      id: 'c2025-8150',
      title: 'C(2025) 8150 - Verification & Materiality Threshold',
      category: 'Verification',
      date: 'December 2025',
      summary: 'Sets materiality threshold at 5% of total emissions per CN code. Accredited verifiers must assess installation-specific data (Article 5).',
      keyArticles: ['Art. 5 - Materiality Assessment', 'Art. 2-4 - Verifier Accreditation'],
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956',
      impact: 'critical'
    },
    {
      id: 'reg-2023-956',
      title: 'Regulation (EU) 2023/956 - CBAM Core Regulation',
      category: 'Foundation',
      date: 'May 2023',
      summary: 'The foundational CBAM regulation establishing the Carbon Border Adjustment Mechanism framework.',
      keyArticles: ['Art. 16 - EORI Requirement', 'Art. 31 - Free Allocation Adjustment', 'Annex I - CN Codes'],
      url: 'https://eur-lex.europa.eu/eli/reg/2023/956/oj',
      impact: 'critical'
    },
    {
      id: 'free-allocation',
      title: 'Free Allocation Regulation & CBAM Phase-in',
      category: 'Financial',
      date: 'December 2025',
      summary: 'Phased reduction of free allocation: 2026 (97.5% free), 2027 (95% free), 2028 (92.5%), 2029 (90%), 2030 (0% - full CBAM).',
      keyArticles: ['Art. 31 Reg 2023/956', 'Phase-in Schedule'],
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956',
      impact: 'critical'
    }
  ];

  const guidelines = [
    {
      title: 'Monitoring Plan Requirements',
      items: [
        'Must be submitted in English (Art. 5(6) C(2025) 8151)',
        'Must include methodology for all emission sources',
        'Approved by competent authority before reporting',
        'Installation-specific data required for actual emissions'
      ],
      icon: FileText
    },
    {
      title: 'Operator Report Standards',
      items: [
        'Must be in English (Art. 10(4) C(2025) 8151)',
        'Calendar year reporting period (Art. 7)',
        'Direct + Indirect emissions (if applicable)',
        'Precursor emissions for complex goods (Art. 5(3))'
      ],
      icon: Building2
    },
    {
      title: 'Verification Requirements',
      items: [
        'Accredited verifier opinion required',
        '5% materiality threshold per CN code',
        'Site visit (physical or virtual) mandatory',
        'Satisfactory/Satisfactory with comments/Unsatisfactory'
      ],
      icon: Shield
    },
    {
      title: 'Certificate Obligations',
      items: [
        '2026: 2.5% of net emissions (97.5% free allocation)',
        'Quarterly pricing in 2026, weekly from 2027',
        'Free allocation adjusted by production route benchmark',
        'Certificates surrendered quarterly (2026) or monthly (2027+)'
      ],
      icon: TrendingUp
    }
  ];

  const resources = [
    {
      title: 'EU Commission CBAM Portal',
      description: 'Official CBAM portal with guidance, FAQs, and latest updates',
      url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
      type: 'Portal'
    },
    {
      title: 'CBAM Registry & Reporting',
      description: 'Access the EU Transitional Registry for report submissions',
      url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-registry-and-reporting_en',
      type: 'Registry'
    },
    {
      title: 'Default Values - Transitional Period',
      description: 'Official default emission values (December 2023)',
      url: 'https://taxation-customs.ec.europa.eu/system/files/2023-12/Default%20values%20transitional%20period.pdf',
      type: 'Database'
    },
    {
      title: 'Final Benchmarks 2026+',
      description: 'Production route benchmarks finalized December 10, 2025',
      url: 'https://eurometal.net/eu-commission-finalizes-cbam-benchmarks-default-values-ahead-of-january-2026-launch/',
      type: 'Database'
    },
    {
      title: 'Accredited Verifiers List',
      description: 'Database of authorized CBAM verifiers by Member State',
      url: 'https://ec.europa.eu/clima/cbam/verifiers',
      type: 'Directory'
    },
    {
      title: 'Regulation (EU) 2023/1773',
      description: 'Implementing regulation - reporting methodology and technical specifications',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1773',
      type: 'Legal'
    },
    {
      title: 'Regulation (EU) 2025/2083',
      description: 'Simplification amendment - 50 tonne de minimis threshold (October 2025)',
      url: 'https://eur-lex.europa.eu/eli/reg/2025/2083/oj/eng',
      type: 'Legal'
    }
  ];

  const timeline = [
    { date: '1 Jan 2026', event: 'Definitive CBAM Period Begins', status: 'active', details: 'Quarterly reporting + 2.5% certificate obligation' },
    { date: '31 Jan 2026', event: 'Q4 2025 Transitional Report Due', status: 'completed', details: 'Final transitional period submission' },
    { date: '31 May 2026', event: 'Q1 2026 Quarterly Report Deadline', status: 'upcoming', details: 'Per Art. 6(2) Reg 2023/956' },
    { date: '31 Aug 2026', event: 'Q2 2026 Report Due', status: 'upcoming', details: 'Includes certificate surrender obligation' },
    { date: '30 Nov 2026', event: 'Q3 2026 Report Due', status: 'upcoming', details: '' },
    { date: '1 Jan 2027', event: 'Weekly Pricing Begins', status: 'future', details: 'Certificate pricing moves from quarterly to weekly average' },
    { date: '1 Jan 2027', event: 'Mark-up Increase to 20%', status: 'future', details: 'Default values mark-up increases per C(2025) 8552' },
    { date: '1 Jan 2030', event: 'Full CBAM - 100% Obligation', status: 'future', details: 'Free allocation fully phased out' }
  ];

  const filteredRegulations = regulations.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Clean Header */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-900">CBAM Knowledge Hub</h1>
            <p className="text-sm text-slate-500 mt-1">Regulations, guidance, and compliance resources</p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-0">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            2026 Ready
          </Badge>
        </div>
      </div>

      {/* Clean Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-slate-700">
          <strong>December 2025 Regulatory Package:</strong> Four implementing acts published. 
          Key changes: calendar year reporting, phased mark-ups, quarterly pricing, 5% materiality threshold.
        </p>
      </div>

      <Tabs defaultValue="regulations" className="space-y-6">
        <TabsList className="bg-slate-50 border-b border-slate-200 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="regulations" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">Regulations</TabsTrigger>
          <TabsTrigger value="guidelines" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">Guidelines</TabsTrigger>
          <TabsTrigger value="resources" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">Resources</TabsTrigger>
          <TabsTrigger value="setup" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">Setup</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">Timeline</TabsTrigger>
        </TabsList>

        {/* Regulations Tab */}
        <TabsContent value="regulations" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search regulations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4">
            {filteredRegulations.map(reg => (
              <div key={reg.id} className="bg-white border-l-4 border-l-slate-900 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-slate-900">{reg.title}</h3>
                        <Badge variant="outline" className="text-xs border-slate-200">{reg.category}</Badge>
                        {reg.impact === 'critical' && (
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs">Critical</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{reg.summary}</p>
                      <div className="flex flex-wrap gap-2">
                        {reg.keyArticles.map((article, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {article}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-2">
                      <Badge variant="outline" className="font-mono text-xs border-slate-200">{reg.date}</Badge>
                      <Button size="sm" variant="outline" asChild className="border-slate-200 text-slate-700 hover:bg-slate-50">
                        <a href={reg.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Guidelines Tab */}
        <TabsContent value="guidelines" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {guidelines.map((guide, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="border-b border-slate-200 p-6">
                  <h3 className="text-base font-medium text-slate-900">{guide.title}</h3>
                </div>
                <div className="p-6">
                  <ul className="space-y-2">
                    {guide.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Clean Key Changes */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-base font-medium text-slate-900">Key Changes for 2026</h3>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Reporting Period</h4>
                  <p className="text-sm text-slate-600">Calendar year (Jan 1 - Dec 31) per Art. 7</p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">CBAM Factor</h4>
                  <p className="text-sm text-slate-600">2.5% obligation in 2026, 100% by 2030</p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Default Values</h4>
                  <p className="text-sm text-slate-600">10% mark-up in 2026, 20% in 2027, 30% from 2028+</p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Verification</h4>
                  <p className="text-sm text-slate-600">5% materiality threshold per CN code</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <div className="grid gap-4">
            {resources.map((resource, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-slate-900">{resource.title}</h3>
                        <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">{resource.type}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{resource.description}</p>
                    </div>
                    <Button size="sm" variant="outline" asChild className="ml-4 border-slate-200 text-slate-700 hover:bg-slate-50">
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Access
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Clean Setup Guide */}
        <TabsContent value="setup" className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h3 className="text-base font-medium text-slate-900 mb-4">Backend Integration Setup</h3>
            
            <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-700">
                <strong>Current Status:</strong> Backend functions disabled. System generates XML for manual submission.
              </p>
            </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-900 mb-3">Setup Steps:</h4>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-medium shrink-0">1</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-slate-900">Enable Backend Functions</h5>
                      <p className="text-sm text-slate-600 mt-1">
                        Dashboard → Settings → Backend Functions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-medium shrink-0">2</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-slate-900">Register with EU Registry</h5>
                      <p className="text-sm text-slate-600 mt-1">
                        Register as authorized declarant
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-medium shrink-0">3</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-slate-900">Configure API Credentials</h5>
                      <p className="text-sm text-slate-600 mt-1 mb-2">
                        Add secrets in Settings
                      </p>
                      <ul className="space-y-1 text-xs font-mono bg-slate-900 text-green-400 p-3 rounded">
                        <li>• EU_CBAM_REGISTRY_API_KEY</li>
                        <li>• EU_CBAM_REGISTRY_ENDPOINT</li>
                        <li>• CBAM_EORI_NUMBER</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-medium shrink-0">4</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-slate-900">Digital Signature Certificate</h5>
                      <p className="text-sm text-slate-600 mt-1">
                        Obtain qualified certificate for XML signing
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-slate-700">
                <strong>What works now:</strong> XML generation, validation, and download
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-base font-medium text-slate-900">Compliance Checklist</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Authorized CBAM Declarant Status</p>
                    <p className="text-sm text-slate-600">Apply through national customs authority</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">CBAM Registry Access</p>
                    <p className="text-sm text-slate-600">Request via National Competent Authority</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Quarterly Reporting Process</p>
                    <p className="text-sm text-slate-600">Collect emissions data from suppliers</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Calculation Methodology</p>
                    <p className="text-sm text-slate-600">Choose EU method or default values</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Clean Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-base font-medium text-slate-900">CBAM Implementation Timeline</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 pb-4 border-b last:border-0">
                    <div className={`mt-1 p-2 rounded-full ${
                      item.status === 'completed' ? 'bg-emerald-100' :
                      item.status === 'active' ? 'bg-slate-100' :
                      item.status === 'upcoming' ? 'bg-blue-50' :
                      'bg-slate-50'
                    }`}>
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : item.status === 'active' ? (
                        <AlertCircle className="w-4 h-4 text-slate-700" />
                      ) : (
                        <Calendar className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-slate-900">{item.date}</span>
                        <Badge variant="outline" className={`text-xs border-slate-200 ${
                          item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          item.status === 'active' ? 'bg-slate-50 text-slate-700' :
                          item.status === 'upcoming' ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-slate-700">{item.event}</p>
                      {item.details && <p className="text-xs text-slate-500 mt-1">{item.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}