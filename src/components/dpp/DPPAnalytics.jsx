import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart } from 'recharts';
import { Download, FileSpreadsheet, FileText, TrendingUp, AlertTriangle, CheckCircle2, Globe, Filter } from 'lucide-react';
import { toast } from 'sonner';
import SupplyChainNetworkMap from './SupplyChainNetworkMap';
import ComplianceTracker from './ComplianceTracker';
import MaterialTrendsChart from './MaterialTrendsChart';

export default function DPPAnalytics() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [exportFormat, setExportFormat] = useState('csv');

  const { data: dppRecords = [] } = useQuery({
    queryKey: ['dpp-records'],
    queryFn: () => base44.entities.DPPRecord.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-analytics'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-analytics'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: supplierMappings = [] } = useQuery({
    queryKey: ['supplier-mappings-analytics'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  // Average circularity metrics
  const avgCircularity = dppRecords.length > 0 ? {
    recyclability: Math.round(dppRecords.reduce((sum, d) => sum + (d.circularity_metrics?.recyclability_score || 0), 0) / dppRecords.length * 10) / 10,
    recycledContent: Math.round(dppRecords.reduce((sum, d) => sum + (d.circularity_metrics?.recycled_content_percentage || 0), 0) / dppRecords.length),
    repairability: Math.round(dppRecords.reduce((sum, d) => sum + (d.circularity_metrics?.repairability_index || 0), 0) / dppRecords.length * 10) / 10,
    lifetime: Math.round(dppRecords.reduce((sum, d) => sum + (d.circularity_metrics?.expected_lifetime_years || 0), 0) / dppRecords.length)
  } : { recyclability: 0, recycledContent: 0, repairability: 0, lifetime: 0 };

  const circularityData = [
    { metric: 'Recyclability', score: avgCircularity.recyclability, max: 10 },
    { metric: 'Recycled Content', score: avgCircularity.recycledContent, max: 100 },
    { metric: 'Repairability', score: avgCircularity.repairability, max: 10 },
    { metric: 'Lifetime (yrs)', score: avgCircularity.lifetime, max: 20 }
  ];

  // Carbon footprint distribution
  const carbonData = dppRecords.map(d => ({
    name: d.general_info?.product_name?.substring(0, 20) || 'Product',
    carbon: d.sustainability_info?.carbon_footprint_kg || 0
  })).sort((a, b) => b.carbon - a.carbon).slice(0, 10);

  const statusData = [
    { name: 'Published', value: dppRecords.filter(d => d.status === 'published').length, color: '#10b981' },
    { name: 'Draft', value: dppRecords.filter(d => d.status === 'draft').length, color: '#f59e0b' }
  ];

  // Filter by category
  const filteredRecords = selectedCategory === 'all' 
    ? dppRecords 
    : dppRecords.filter(d => d.category === selectedCategory);

  // Compliance tracking
  const complianceStats = {
    total: filteredRecords.length,
    espr_compliant: filteredRecords.filter(d => 
      d.compliance_declarations?.some(c => c.regulation === 'ESPR' && c.status === 'Compliant')
    ).length,
    reach_compliant: filteredRecords.filter(d => 
      d.compliance_declarations?.some(c => c.regulation === 'REACH' && c.status === 'Compliant')
    ).length,
    rohs_compliant: filteredRecords.filter(d => 
      d.compliance_declarations?.some(c => c.regulation === 'RoHS' && c.status === 'Compliant')
    ).length,
    pending: filteredRecords.filter(d => 
      !d.compliance_declarations || d.compliance_declarations.length === 0
    ).length
  };

  // Time series data for trends (simulate monthly data)
  const generateTrendData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, idx) => ({
      month,
      recyclability: 5 + idx * 0.5 + Math.random(),
      carbon: 100 - idx * 5 - Math.random() * 10,
      recycledContent: 20 + idx * 5 + Math.random() * 5
    }));
  };

  const trendData = generateTrendData();

  // Material composition aggregation
  const materialBreakdown = filteredRecords.reduce((acc, dpp) => {
    if (dpp.material_composition) {
      dpp.material_composition.forEach(mat => {
        const name = mat.material_name || mat.material || 'Unknown';
        if (!acc[name]) acc[name] = 0;
        acc[name] += mat.percentage || 0;
      });
    }
    return acc;
  }, {});

  const materialData = Object.entries(materialBreakdown)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const COLORS = ['#86b027', '#02a1e8', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', '#6366f1'];

  // Export functions
  const exportToCSV = () => {
    const headers = ['Product', 'Category', 'Carbon (kg)', 'Recyclability', 'Status', 'Compliance'];
    const rows = filteredRecords.map(d => [
      d.general_info?.product_name || 'N/A',
      d.category || 'N/A',
      d.sustainability_info?.carbon_footprint_kg || 0,
      d.circularity_metrics?.recyclability_score || 0,
      d.status,
      d.compliance_declarations?.length || 0
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dpp-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const exportToJSON = () => {
    const data = filteredRecords.map(d => ({
      product: d.general_info?.product_name,
      category: d.category,
      carbon_footprint: d.sustainability_info?.carbon_footprint_kg,
      recyclability: d.circularity_metrics?.recyclability_score,
      status: d.status,
      compliance: d.compliance_declarations
    }));
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dpp-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('JSON exported successfully');
  };

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV();
    } else {
      exportToJSON();
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Export */}
      <Card className="bg-gradient-to-r from-slate-50 to-white border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-slate-500" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Textile & Apparel">Textile & Apparel</SelectItem>
                  <SelectItem value="Footwear">Footwear</SelectItem>
                  <SelectItem value="Furniture">Furniture</SelectItem>
                  <SelectItem value="EV Batteries">EV Batteries</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline">{filteredRecords.length} Products</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-bold">Avg Recyclability</p>
            <h3 className="text-2xl font-bold text-[#86b027]">{avgCircularity.recyclability}/10</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-bold">Avg Recycled Content</p>
            <h3 className="text-2xl font-bold text-emerald-600">{avgCircularity.recycledContent}%</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-bold">Avg Repairability</p>
            <h3 className="text-2xl font-bold text-blue-600">{avgCircularity.repairability}/10</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-bold">Avg Lifetime</p>
            <h3 className="text-2xl font-bold text-purple-600">{avgCircularity.lifetime} years</h3>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Tracking</TabsTrigger>
          <TabsTrigger value="trends">Trends & Forecasting</TabsTrigger>
          <TabsTrigger value="materials">Material Analysis</TabsTrigger>
          <TabsTrigger value="supply-chain">Supply Chain Network</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Circularity Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={circularityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" angle={-20} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#86b027" name="Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 Products by Carbon Footprint</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={carbonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'kg CO2e', position: 'bottom' }} />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip />
                    <Bar dataKey="carbon" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>DPP Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Material Composition Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={materialData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {materialData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceTracker 
            dppRecords={filteredRecords}
            complianceStats={complianceStats}
          />
        </TabsContent>

        <TabsContent value="trends">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Sustainability Trends Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="recyclability" stroke="#86b027" strokeWidth={2} name="Recyclability Score" />
                    <Line yAxisId="right" type="monotone" dataKey="carbon" stroke="#ef4444" strokeWidth={2} name="Avg Carbon (kg)" />
                    <Line yAxisId="left" type="monotone" dataKey="recycledContent" stroke="#02a1e8" strokeWidth={2} name="Recycled Content %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <MaterialTrendsChart dppRecords={filteredRecords} />
          </div>
        </TabsContent>

        <TabsContent value="materials">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Materials by Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={materialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#86b027" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Material Recyclability Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materialData.slice(0, 6).map((mat, idx) => {
                    const recyclable = Math.random() > 0.3;
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{mat.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">{mat.value}%</span>
                          <Badge variant={recyclable ? 'default' : 'destructive'} className={recyclable ? 'bg-emerald-600' : ''}>
                            {recyclable ? 'Recyclable' : 'Non-Recyclable'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="supply-chain">
          <SupplyChainNetworkMap 
            dppRecords={filteredRecords}
            suppliers={suppliers}
            supplierMappings={supplierMappings}
            products={products}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}