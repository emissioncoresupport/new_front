import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages
const SupplyLensOverview = React.lazy(() => import('@/pages/SupplyLens'));
const EvidenceVault = React.lazy(() => import('@/pages/EvidenceVault'));
const EvidenceRecordDetail = React.lazy(() => import('@/pages/EvidenceRecordDetail'));
const EvidenceDrafts = React.lazy(() => import('@/pages/EvidenceDrafts'));
const EvidenceReviewQueue = React.lazy(() => import('@/pages/EvidenceReviewQueue'));
const DecisionLog = React.lazy(() => import('@/pages/Contract2DecisionLog'));
const IntegrationHub = React.lazy(() => import('@/pages/IntegrationHub'));

const ExtractionJobs = React.lazy(() => import('@/pages/Contract2ExtractionJobs'));
const MappingSessions = React.lazy(() => import('@/pages/Contract2MappingSessions'));
const MappingSessionDetail = React.lazy(() => import('@/pages/Contract2MappingSessionDetail'));
const ReadinessDashboard = React.lazy(() => import('@/pages/Contract2Readiness'));

export default function AppRoutes() {
  return (
    <React.Suspense 
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-slate-500">Loading...</div>
        </div>
      }
    >
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/supplylens/overview" replace />} />
        
        {/* SupplyLens Core */}
        <Route path="/supplylens/overview" element={<SupplyLensOverview />} />
        <Route path="/supplylens/evidence" element={<EvidenceVault />} />
        <Route path="/supplylens/evidence/records/:recordId" element={<EvidenceRecordDetail />} />
        <Route path="/supplylens/evidence/:evidenceId" element={<EvidenceRecordDetail />} />
        <Route path="/supplylens/drafts" element={<EvidenceDrafts />} />
        <Route path="/supplylens/drafts/:draftId" element={<div>Draft Detail (TODO)</div>} />
        <Route path="/supplylens/review" element={<EvidenceReviewQueue />} />
        <Route path="/supplylens/decisions" element={<DecisionLog />} />
        <Route path="/supplylens/integrations" element={<IntegrationHub />} />

        {/* Workflows */}
        <Route path="/supplylens/workflows/extractions" element={<ExtractionJobs />} />
        <Route path="/supplylens/workflows/extractions/:jobId" element={<div>Extraction Job Detail (TODO)</div>} />
        <Route path="/supplylens/workflows/mapping-sessions" element={<MappingSessions />} />
        <Route path="/supplylens/workflows/mapping-sessions/:sessionId" element={<MappingSessionDetail />} />
        <Route path="/supplylens/workflows/readiness" element={<ReadinessDashboard />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/supplylens/overview" replace />} />
      </Routes>
    </React.Suspense>
  );
}