import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  FileText,
  GitBranch
} from 'lucide-react';
import IngestionResponsibilityMatrix from './IngestionResponsibilityMatrix';

export default function DeveloperConsoleManager() {
  const [filter, setFilter] = useState('ALL');
  const [editingEntry, setEditingEntry] = useState(null);
  const [activeTab, setActiveTab] = useState('entries'); // 'entries' | 'matrix' | 'contract'
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['developer-console-entries'],
    queryFn: () => base44.entities.DeveloperConsoleEntry.list('-priority', 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DeveloperConsoleEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['developer-console-entries']);
      setEditingEntry(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DeveloperConsoleEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['developer-console-entries']);
      setEditingEntry(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DeveloperConsoleEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['developer-console-entries'])
  });

  const filteredEntries = entries.filter(e => {
    if (filter === 'ALL') return true;
    if (filter === 'CRITICAL') return e.risk_level === 'CRITICAL';
    if (filter === 'OPEN') return e.status === 'OPEN';
    if (filter === 'IN_PROGRESS') return e.status === 'IN_PROGRESS';
    return true;
  });

  const riskColor = {
    LOW: 'bg-blue-100 text-blue-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700'
  };

  const statusColor = {
    OPEN: 'bg-slate-100 text-slate-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-green-100 text-green-700',
    WONT_FIX: 'bg-gray-100 text-gray-700'
  };

  const downloadReport = () => {
    let report = `═════════════════════════════════════════════════════\n`;
    report += `  DEVELOPER CONSOLE - ARCHITECTURAL CONTRACT\n`;
    report += `  Generated: ${new Date().toISOString()}\n`;
    report += `═════════════════════════════════════════════════════\n\n`;

    const byRisk = {
      CRITICAL: entries.filter(e => e.risk_level === 'CRITICAL' && e.status === 'OPEN'),
      HIGH: entries.filter(e => e.risk_level === 'HIGH' && e.status === 'OPEN'),
      MEDIUM: entries.filter(e => e.risk_level === 'MEDIUM' && e.status === 'OPEN'),
      LOW: entries.filter(e => e.risk_level === 'LOW' && e.status === 'OPEN')
    };

    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(risk => {
      if (byRisk[risk].length > 0) {
        report += `\n─────────────────────────────────────────────────────\n`;
        report += `  ${risk} RISK (${byRisk[risk].length} entries)\n`;
        report += `─────────────────────────────────────────────────────\n\n`;

        byRisk[risk].forEach((entry, idx) => {
          report += `${idx + 1}. [${entry.entry_id}] ${entry.description}\n`;
          report += `   Phase: ${entry.phase} | Component: ${entry.component}\n`;
          report += `   Limitation Type: ${entry.limitation_type}\n`;
          report += `   Why It Matters: ${entry.why_it_matters}\n`;
          report += `   Current Behavior: ${entry.current_behavior}\n`;
          report += `   Expected Behavior: ${entry.expected_behavior}\n`;
          report += `   Backend Action Required: ${entry.backend_action_required}\n`;
          report += `   Code Location: ${entry.code_location || 'N/A'}\n`;
          report += `   Status: ${entry.status} | Priority: ${entry.priority}\n\n`;
        });
      }
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `developer-console-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-light text-slate-900 uppercase tracking-widest">Developer Console</h2>
          <p className="text-xs text-slate-600 mt-1">Authoritative Execution Gaps & Architectural Truth Source</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadReport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
          <Button onClick={() => setEditingEntry({})} size="sm" className="bg-slate-900">
            <Plus className="w-4 h-4 mr-2" /> New Entry
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <Button
          onClick={() => setActiveTab('entries')}
          variant="ghost"
          className={activeTab === 'entries' ? 'border-b-2 border-slate-900 rounded-none' : 'rounded-none'}
        >
          <Clock className="w-4 h-4 mr-2" /> Entries
        </Button>
        <Button
          onClick={() => setActiveTab('matrix')}
          variant="ghost"
          className={activeTab === 'matrix' ? 'border-b-2 border-slate-900 rounded-none' : 'rounded-none'}
        >
          <GitBranch className="w-4 h-4 mr-2" /> Responsibility Matrix
        </Button>
        <Button
          onClick={() => setActiveTab('contract')}
          variant="ghost"
          className={activeTab === 'contract' ? 'border-b-2 border-slate-900 rounded-none' : 'rounded-none'}
        >
          <FileText className="w-4 h-4 mr-2" /> Execution Contract
        </Button>
      </div>

      {/* Responsibility Matrix Tab */}
      {activeTab === 'matrix' && <IngestionResponsibilityMatrix />}

      {/* Contract Tab */}
      {activeTab === 'contract' && (
        <Card className="p-6 bg-slate-50">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Ingestion Execution Contract</h3>
              <p className="text-sm text-slate-600">
                Formal contract between Base44 (UI/orchestration) and Custom Ingestion Backend (execution/guarantees).
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">INGESTION_EXECUTION_CONTRACT.md</p>
                  <p className="text-xs text-slate-600">Version 1.0.0 | Effective 2026-01-21</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-blue-600 font-semibold mb-1">Request Schema</p>
                  <p className="text-blue-700">IngestionRequestSchema.json</p>
                  <p className="text-blue-600 mt-1">Base44 → Backend</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <p className="text-green-600 font-semibold mb-1">Response Schema</p>
                  <p className="text-green-700">IngestionResponseSchema.json</p>
                  <p className="text-green-600 mt-1">Backend → Base44</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p><strong>Location:</strong> components/supplylens/INGESTION_EXECUTION_CONTRACT.md</p>
                <p><strong>Sections:</strong> 13 (Enterprise Benchmarking, Request/Response Schemas, Idempotency, Failure Modes, Responsibility Matrix, Testing, Versioning)</p>
                <p><strong>Status:</strong> Authoritative Reference - Backend implementation required</p>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-700 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Implementation Status</p>
                  <p className="text-xs text-yellow-800 mt-1">
                    Contract defined. Backend ingestion endpoint NOT IMPLEMENTED. 
                    Base44 currently violates contract by creating Evidence directly. 
                    See Developer Console entries DCE-2026-A2-001 through DCE-2026-A2-007.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <>
      {/* Filters */}
      <div className="flex gap-2">
        {['ALL', 'CRITICAL', 'OPEN', 'IN_PROGRESS'].map(f => (
          <Button
            key={f}
            onClick={() => setFilter(f)}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            className={filter === f ? 'bg-slate-900' : ''}
          >
            {f} ({entries.filter(e => {
              if (f === 'ALL') return true;
              if (f === 'CRITICAL') return e.risk_level === 'CRITICAL';
              return e.status === f;
            }).length})
          </Button>
        ))}
      </div>

      {/* Entry Editor */}
      {editingEntry && (
        <Card className="border border-slate-700 bg-slate-900 p-6">
          <div className="space-y-4">
            <Input
              placeholder="Entry ID (e.g., DCE-2026-001)"
              value={editingEntry.entry_id || ''}
              onChange={(e) => setEditingEntry({...editingEntry, entry_id: e.target.value})}
              className="bg-slate-800 border-slate-700 text-white"
            />
            
            <div className="grid grid-cols-3 gap-4">
              <Select
                value={editingEntry.phase}
                onValueChange={(v) => setEditingEntry({...editingEntry, phase: v})}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Phase" />
                </SelectTrigger>
                <SelectContent>
                  {['Phase 1.1', 'Phase 1.2', 'Phase 1.2.5', 'Phase 1.3', 'Phase 1.4', 'Phase 1.5', 'Phase V1', 'Phase A', 'Phase B', 'Phase C'].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={editingEntry.component}
                onValueChange={(v) => setEditingEntry({...editingEntry, component: v})}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Component" />
                </SelectTrigger>
                <SelectContent>
                  {['UI', 'Ingestion', 'Evidence', 'Classification', 'Structuring', 'Mapping', 'Supplier', 'Backend', 'Integration'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={editingEntry.limitation_type}
                onValueChange={(v) => setEditingEntry({...editingEntry, limitation_type: v})}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {['NOT_IMPLEMENTED', 'PARTIAL', 'UI_ONLY', 'ARCH_LIMIT', 'BLOCKED'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder="Description (precise, non-marketing)"
              value={editingEntry.description || ''}
              onChange={(e) => setEditingEntry({...editingEntry, description: e.target.value})}
              className="bg-slate-800 border-slate-700 text-white"
            />

            <Textarea
              placeholder="Why It Matters (audit/legal/reliability impact)"
              value={editingEntry.why_it_matters || ''}
              onChange={(e) => setEditingEntry({...editingEntry, why_it_matters: e.target.value})}
              className="bg-slate-800 border-slate-700 text-white"
            />

            <div className="grid grid-cols-2 gap-4">
              <Textarea
                placeholder="Current Behavior"
                value={editingEntry.current_behavior || ''}
                onChange={(e) => setEditingEntry({...editingEntry, current_behavior: e.target.value})}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Textarea
                placeholder="Expected Behavior"
                value={editingEntry.expected_behavior || ''}
                onChange={(e) => setEditingEntry({...editingEntry, expected_behavior: e.target.value})}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <Textarea
              placeholder="Backend Action Required (explicit)"
              value={editingEntry.backend_action_required || ''}
              onChange={(e) => setEditingEntry({...editingEntry, backend_action_required: e.target.value})}
              className="bg-slate-800 border-slate-700 text-white"
            />

            <Input
              placeholder="Code Location (file path and lines)"
              value={editingEntry.code_location || ''}
              onChange={(e) => setEditingEntry({...editingEntry, code_location: e.target.value})}
              className="bg-slate-800 border-slate-700 text-white"
            />

            <div className="grid grid-cols-3 gap-4">
              <Select
                value={editingEntry.risk_level}
                onValueChange={(v) => setEditingEntry({...editingEntry, risk_level: v})}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Priority (1-10)"
                value={editingEntry.priority || ''}
                onChange={(e) => setEditingEntry({...editingEntry, priority: parseInt(e.target.value)})}
                className="bg-slate-800 border-slate-700 text-white"
              />

              <Select
                value={editingEntry.status}
                onValueChange={(v) => setEditingEntry({...editingEntry, status: v})}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditingEntry(null)} variant="outline">Cancel</Button>
              <Button
                onClick={() => {
                  const data = {
                    ...editingEntry,
                    last_reviewed_at: new Date().toISOString()
                  };
                  if (editingEntry.id) {
                    updateMutation.mutate({ id: editingEntry.id, data });
                  } else {
                    createMutation.mutate(data);
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Save Entry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Entries List */}
      <div className="space-y-3">
        {filteredEntries.map((entry) => (
          <Card key={entry.id} className="border border-slate-700 bg-slate-900 p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-slate-800 text-white font-mono text-xs">{entry.entry_id}</Badge>
                    <Badge className={riskColor[entry.risk_level]}>{entry.risk_level}</Badge>
                    <Badge className={statusColor[entry.status]}>{entry.status}</Badge>
                    <Badge className="bg-indigo-100 text-indigo-700">{entry.phase}</Badge>
                    <Badge className="bg-purple-100 text-purple-700">{entry.component}</Badge>
                  </div>
                  <p className="text-white font-medium">{entry.description}</p>
                  <p className="text-yellow-400 text-xs mt-1">⚠️ {entry.why_it_matters}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => setEditingEntry(entry)}
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => deleteMutation.mutate(entry.id)}
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 mb-1">Current Behavior:</p>
                  <p className="text-red-300">{entry.current_behavior}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Expected Behavior:</p>
                  <p className="text-green-300">{entry.expected_behavior}</p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded p-3">
                <p className="text-slate-400 text-xs mb-1">Backend Action Required:</p>
                <p className="text-white text-xs font-mono">{entry.backend_action_required}</p>
                {entry.code_location && (
                  <p className="text-slate-500 text-xs mt-2">📍 {entry.code_location}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
        </div>
        </>
        )}
        </div>
        );
        }