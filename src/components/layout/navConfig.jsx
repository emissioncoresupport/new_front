
import { 
  Home, 
  Database, 
  FileText, 
  CheckSquare, 
  FileCheck, 
  Plug,
  Cpu,
  Network,
  Target
} from 'lucide-react';

export const navConfig = [
  {
    section: 'SupplyLens Core',
    items: [
      {
        label: 'Overview',
        path: '/supplylens/overview',
        page: 'SupplyLens',
        icon: Home
      },
      {
        label: 'Evidence Vault',
        path: '/supplylens/evidence',
        page: 'EvidenceVault',
        icon: Database
      },
      {
        label: 'Drafts',
        path: '/supplylens/drafts',
        page: 'EvidenceDrafts',
        icon: FileText
      },
      {
        label: 'Review Queue',
        path: '/supplylens/review',
        page: 'EvidenceReviewQueue',
        icon: CheckSquare
      },
      {
        label: 'Decisions',
        path: '/supplylens/decisions',
        page: 'Contract2DecisionLog',
        icon: FileCheck
      },
      {
        label: 'Integrations',
        path: '/supplylens/integrations',
        page: 'IntegrationHub',
        icon: Plug
      }
    ]
  },
  {
    section: 'Workflows',
    items: [
      {
        label: 'Extraction Jobs',
        path: '/supplylens/workflows/extractions',
        page: 'Contract2ExtractionJobs',
        icon: Cpu
      },
      {
        label: 'Mapping Sessions',
        path: '/supplylens/workflows/mapping-sessions',
        page: 'Contract2MappingSessions',
        icon: Network
      },
      {
        label: 'Readiness Dashboard',
        path: '/supplylens/workflows/readiness',
        page: 'Contract2Readiness',
        icon: Target
      }
    ]
  }
];
