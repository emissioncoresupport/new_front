import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
    AlertTriangle, 
    CheckCircle2, 
    FileText, 
    Map as MapIcon, 
    Users, 
    ArrowRight, 
    ShieldCheck, 
    Truck, 
    BarChart3,
    PieChart,
    TrendingUp,
    UploadCloud,
    Globe
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Link } from 'react-router-dom';
import EUDRBulkOnboardingModal from './EUDRBulkOnboardingModal';
import EUDRBulkImportTool from './EUDRBulkImportTool';
import EUDRPoTable from './EUDRPoTable';

export default function EUDRDashboard({ onNavigate }) {
  const [showOnboardingModal, setShowOnboardingModal] = React.useState(false);
  const [showBulkImport, setShowBulkImport] = React.useState(false);
  const { data: ddsList = [] } = useQuery({
    queryKey: ['eudr-dds-dashboard'],
    queryFn: () => base44.entities.EUDRDDS.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['eudr-suppliers-dashboard'],
    queryFn: () => base44.entities.Supplier.list()
  });

  // Metrics Calculation
  const totalDDS = ddsList.length;
  const highRiskDDS = ddsList.filter(d => d.risk_level === 'High').length;
  const submittedDDS = ddsList.filter(d => d.status === 'Submitted' || d.status === 'Locked').length;
  const compliantDDS = ddsList.filter(d => d.risk_decision === 'Negligible').length;
  const complianceRate = totalDDS ? Math.round((compliantDDS / totalDDS) * 100) : 0;

  // Commodity Breakdown
  const commodityStats = ddsList.reduce((acc, curr) => {
      const commodity = curr.commodity_description || curr.hs_code || 'Unknown';
      // Simple grouping by first word for cleaner chart
      const group = commodity.split(' ')[0]; 
      if (!acc[group]) acc[group] = { name: group, total: 0, highRisk: 0 };
      acc[group].total += 1;
      if (curr.risk_level === 'High') acc[group].highRisk += 1;
      return acc;
  }, {});
  
  const commodityData = Object.values(commodityStats).sort((a, b) => b.total - a.total).slice(0, 5);

  // Mock Trend Data
  const trendData = [
      { month: 'Aug', submitted: 12, risk: 2 },
      { month: 'Sep', submitted: 19, risk: 3 },
      { month: 'Oct', submitted: 15, risk: 1 },
      { month: 'Nov', submitted: 28, risk: 5 },
      { month: 'Dec', submitted: 35, risk: 2 },
  ];

  // Supplier Compliance
  const supplierStats = suppliers.map(s => {
      const supplierDDS = ddsList.filter(d => d.supplier_submission_id === s.id);
      const total = supplierDDS.length;
      const highRisk = supplierDDS.filter(d => d.risk_level === 'High').length;
      return {
          ...s,
          ddsCount: total,
          riskCount: highRisk,
          score: s.risk_score || 0
      };
  }).sort((a, b) => b.riskCount - a.riskCount).slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Top Stats Row - Tesla Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-black" />
            </div>
            <p className="text-3xl font-light text-slate-900">{submittedDDS}</p>
            <p className="text-sm text-slate-600 mt-1">Total Statements</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-black" />
            </div>
            <p className="text-3xl font-light text-slate-900">{highRiskDDS}</p>
            <p className="text-sm text-slate-600 mt-1">Critical Risk</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <ShieldCheck className="w-5 h-5 text-black" />
            </div>
            <p className="text-3xl font-light text-slate-900">{complianceRate}%</p>
            <p className="text-sm text-slate-600 mt-1">Compliance Score</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-black" />
            </div>
            <p className="text-3xl font-light text-slate-900">{suppliers.length}</p>
            <p className="text-sm text-slate-600 mt-1">Supplier Network</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Risk Trend Line Chart */}
          <Card className="lg:col-span-2 border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-200 bg-slate-50/40">
                  <div className="flex justify-between items-center">
                      <div>
                          <CardTitle className="flex items-center gap-2 text-lg font-light text-slate-900">
                              <TrendingUp className="w-5 h-5 text-slate-900" />
                              Compliance Trend Analysis
                          </CardTitle>
                          <CardDescription className="text-slate-600 font-light">Monthly submission volume vs risk incidents</CardDescription>
                      </div>
                      <div className="flex gap-2">
                          <Badge variant="outline" className="bg-white border-slate-300 text-slate-700">Last 6 Months</Badge>
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#86b027" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#86b027" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                              <Area type="monotone" dataKey="submitted" stroke="#86b027" strokeWidth={3} fillOpacity={1} fill="url(#colorSubmitted)" />
                              <Area type="monotone" dataKey="risk" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </CardContent>
          </Card>

          {/* Quick Actions & Navigation */}
          <div className="space-y-6">
              <Card className="border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-slate-200 bg-slate-50/40">
                      <CardTitle className="text-slate-900 flex items-center gap-2 font-light">
                          <ShieldCheck className="w-5 h-5" /> Quick Actions
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-6">
                      <Button 
                        className="w-full justify-between bg-slate-900 hover:bg-slate-800 text-white border-none h-12"
                        onClick={() => onNavigate('importer')}
                      >
                          <span className="flex items-center gap-2 font-medium"><FileText className="w-4 h-4" /> Create Purchase Order</span>
                          <ArrowRight className="w-4 h-4" />
                      </Button>
                      <Button 
                        className="w-full justify-between bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 h-12"
                        onClick={() => setShowBulkImport(true)}
                      >
                          <span className="flex items-center gap-2 font-medium"><UploadCloud className="w-4 h-4" /> Bulk Import Data</span>
                          <ArrowRight className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 h-10 text-sm"
                        onClick={() => onNavigate('audit')}
                      >
                          <span className="flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Search Audit Vault</span>
                      </Button>
                  </CardContent>
              </Card>
              
              <EUDRBulkImportTool open={showBulkImport} onOpenChange={setShowBulkImport} />
              <EUDRBulkOnboardingModal open={showOnboardingModal} onOpenChange={setShowOnboardingModal} />

              <Card className="border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-slate-200 bg-slate-50/40">
                      <CardTitle className="text-base font-light text-slate-900">High Risk Origins</CardTitle>
                      <Globe className="w-4 h-4 text-slate-900" />
                  </CardHeader>
                  <CardContent className="p-4">
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-900 flex items-center gap-2 font-light">🇧🇷 Brazil</span>
                              <div className="w-24 h-2 bg-slate-200 rounded-full"><div className="h-full bg-slate-900 w-[70%] rounded-full"></div></div>
                          </div>
                          <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-900 flex items-center gap-2 font-light">🇮🇩 Indonesia</span>
                              <div className="w-24 h-2 bg-slate-200 rounded-full"><div className="h-full bg-slate-600 w-[45%] rounded-full"></div></div>
                          </div>
                          <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-900 flex items-center gap-2 font-light">🇨🇴 Colombia</span>
                              <div className="w-24 h-2 bg-slate-200 rounded-full"><div className="h-full bg-slate-900 w-[60%] rounded-full"></div></div>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          </div>
      </div>

      {/* Purchase Orders Overview Table */}
      <EUDRPoTable ddsList={ddsList} suppliers={suppliers} onNavigate={onNavigate} />
    </div>
  );
}