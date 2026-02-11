import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, Legend, PieChart, Pie } from 'recharts';
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle } from "lucide-react";

export default function MaterialityInteractiveDashboard({ topics }) {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [viewMode, setViewMode] = useState('matrix'); // matrix, list, heatmap

  const matrixData = topics.map(t => ({
    id: t.id,
    name: t.topic_name,
    impact: t.impact_materiality_score || 0,
    financial: t.financial_materiality_score || 0,
    isMaterial: t.is_material,
    esrs: t.esrs_standard,
    full: t
  }));

  // Group by ESRS category
  const esrsCategories = {
    'Environmental': topics.filter(t => t.esrs_standard?.startsWith('ESRS E')),
    'Social': topics.filter(t => t.esrs_standard?.startsWith('ESRS S')),
    'Governance': topics.filter(t => t.esrs_standard?.startsWith('ESRS G'))
  };

  const categoryStats = Object.entries(esrsCategories).map(([cat, items]) => ({
    category: cat,
    total: items.length,
    material: items.filter(t => t.is_material).length,
    avgImpact: items.reduce((sum, t) => sum + (t.impact_materiality_score || 0), 0) / (items.length || 1),
    avgFinancial: items.reduce((sum, t) => sum + (t.financial_materiality_score || 0), 0) / (items.length || 1)
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border-2 border-[#86b027] rounded-lg shadow-xl">
          <p className="font-bold text-[#545454] mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-600">
              <span className="font-semibold">ESRS:</span> {data.esrs}
            </p>
            <p className="text-slate-600">
              <span className="font-semibold">Impact:</span> {data.impact.toFixed(1)}/10
            </p>
            <p className="text-slate-600">
              <span className="font-semibold">Financial:</span> {data.financial.toFixed(1)}/10
            </p>
            {data.isMaterial && (
              <Badge className="bg-[#86b027] mt-2">Material Topic</Badge>
            )}
          </div>
          <Button 
            size="sm" 
            className="w-full mt-3 bg-[#02a1e8] hover:bg-[#0291d1]" 
            onClick={() => setSelectedTopic(data.full)}
          >
            View Details
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* View Mode Selector */}
      <div className="flex gap-2">
        <Button 
          variant={viewMode === 'matrix' ? 'default' : 'outline'}
          onClick={() => setViewMode('matrix')}
          className={viewMode === 'matrix' ? 'bg-[#86b027]' : ''}
        >
          Matrix View
        </Button>
        <Button 
          variant={viewMode === 'list' ? 'default' : 'outline'}
          onClick={() => setViewMode('list')}
          className={viewMode === 'list' ? 'bg-[#86b027]' : ''}
        >
          List View
        </Button>
        <Button 
          variant={viewMode === 'category' ? 'default' : 'outline'}
          onClick={() => setViewMode('category')}
          className={viewMode === 'category' ? 'bg-[#86b027]' : ''}
        >
          Category Analysis
        </Button>
      </div>

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Interactive Materiality Matrix</span>
              <span className="text-sm font-normal text-slate-500">
                Click on topics for details • Threshold at 5,5
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={600}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  dataKey="financial" 
                  name="Financial Materiality" 
                  domain={[0, 10]}
                  label={{ 
                    value: 'Financial Materiality (Risk/Opportunity) →', 
                    position: 'bottom', 
                    offset: 20,
                    style: { fontSize: 14, fontWeight: 'bold' }
                  }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="impact" 
                  name="Impact Materiality" 
                  domain={[0, 10]}
                  label={{ 
                    value: '← Impact on Society & Environment', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: 14, fontWeight: 'bold' }
                  }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter 
                  name="Topics" 
                  data={matrixData}
                  onClick={(data) => setSelectedTopic(data.full)}
                  style={{ cursor: 'pointer' }}
                >
                  {matrixData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isMaterial ? '#86b027' : '#cbd5e1'}
                      r={entry.isMaterial ? 12 : 7}
                    />
                  ))}
                </Scatter>
                {/* Threshold lines */}
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
                {/* Quadrant labels */}
                <text x="75%" y="25%" textAnchor="middle" fill="#86b027" fontSize="14" fontWeight="bold">
                  HIGH PRIORITY
                </text>
                <text x="25%" y="75%" textAnchor="middle" fill="#94a3b8" fontSize="12">
                  LOW PRIORITY
                </text>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#86b027]" />
                <span className="text-sm font-medium">Material ({topics.filter(t => t.is_material).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-300" />
                <span className="text-sm font-medium">Non-Material ({topics.filter(t => !t.is_material).length})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View with drill-down */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {topics.sort((a, b) => 
            (b.impact_materiality_score || 0) + (b.financial_materiality_score || 0) -
            (a.impact_materiality_score || 0) - (a.financial_materiality_score || 0)
          ).map(topic => (
            <Card key={topic.id} className={`cursor-pointer transition-all ${selectedTopic?.id === topic.id ? 'ring-2 ring-[#86b027]' : ''}`}>
              <CardContent className="p-4">
                <div 
                  className="flex items-center justify-between"
                  onClick={() => setSelectedTopic(selectedTopic?.id === topic.id ? null : topic)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-[#545454]">{topic.topic_name}</h4>
                      <Badge className={topic.is_material ? 'bg-[#86b027]' : 'bg-slate-400'}>
                        {topic.is_material ? 'Material' : 'Non-Material'}
                      </Badge>
                      <Badge className="bg-[#02a1e8]">{topic.esrs_standard}</Badge>
                    </div>
                    <div className="flex gap-6 mt-2 text-sm">
                      <div>
                        <span className="text-slate-500">Impact Score:</span>
                        <span className="font-bold ml-2">{topic.impact_materiality_score || 0}/10</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Financial Score:</span>
                        <span className="font-bold ml-2">{topic.financial_materiality_score || 0}/10</span>
                      </div>
                    </div>
                  </div>
                  {selectedTopic?.id === topic.id ? <ChevronUp /> : <ChevronDown />}
                </div>
                
                {selectedTopic?.id === topic.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Description</p>
                      <p className="text-sm text-slate-700 mt-1">{topic.topic_description || 'No description provided'}</p>
                    </div>
                    {topic.rationale && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Rationale</p>
                        <p className="text-sm text-slate-700 mt-1">{topic.rationale}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded">
                        <p className="text-xs font-bold text-slate-500">Stakeholders Consulted</p>
                        <p className="text-sm font-medium mt-1">{topic.stakeholders_consulted || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded">
                        <p className="text-xs font-bold text-slate-500">Assessment Date</p>
                        <p className="text-sm font-medium mt-1">
                          {topic.assessment_date ? new Date(topic.assessment_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Analysis */}
      {viewMode === 'category' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Material Topics by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#cbd5e1" name="Total Topics" />
                  <Bar dataKey="material" fill="#86b027" name="Material Topics" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Scores by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgImpact" fill="#02a1e8" name="Avg Impact" />
                  <Bar dataKey="avgFinancial" fill="#86b027" name="Avg Financial" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {Object.entries(esrsCategories).map(([category, catTopics]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category} Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {catTopics.map(topic => (
                    <div key={topic.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div>
                        <p className="text-sm font-medium">{topic.topic_name}</p>
                        <p className="text-xs text-slate-500">{topic.esrs_standard}</p>
                      </div>
                      {topic.is_material && (
                        <Badge className="bg-[#86b027]">Material</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}