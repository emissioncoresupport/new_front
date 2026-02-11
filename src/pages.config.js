/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Analytics from './pages/Analytics';
import AuditTrail from './pages/AuditTrail';
import BOMWorkbench from './pages/BOMWorkbench';
import Billing from './pages/Billing';
import CBAM from './pages/CBAM';
import CBAMOperationalAudit from './pages/CBAMOperationalAudit';
import CBAMRepresentative from './pages/CBAMRepresentative';
import CBAMRepresentativePortal from './pages/CBAMRepresentativePortal';
import CBAMSupplierPortal from './pages/CBAMSupplierPortal';
import CCF from './pages/CCF';
import CFODashboard from './pages/CFODashboard';
import CSRD from './pages/CSRD';
import CollaborationRequests from './pages/CollaborationRequests';
import CompanySettings from './pages/CompanySettings';
import Contract1RegistryAudit from './pages/Contract1RegistryAudit';
import Contract1SmokeTest from './pages/Contract1SmokeTest';
import Contract2DecisionLog from './pages/Contract2DecisionLog';
import Contract2ExtractionJobs from './pages/Contract2ExtractionJobs';
import Contract2MappingSessionDetail from './pages/Contract2MappingSessionDetail';
import Contract2MappingSessions from './pages/Contract2MappingSessions';
import Contract2Readiness from './pages/Contract2Readiness';
import DPP from './pages/DPP';
import ERPIntegration from './pages/ERPIntegration';
import EUDAMED from './pages/EUDAMED';
import EUDR from './pages/EUDR';
import EUDRSupplierAccess from './pages/EUDRSupplierAccess';
import EvidenceDrafts from './pages/EvidenceDrafts';
import EvidenceRecordDetail from './pages/EvidenceRecordDetail';
import EvidenceReviewQueue from './pages/EvidenceReviewQueue';
import EvidenceVault from './pages/EvidenceVault';
import Home from './pages/Home';
import IntegrationHub from './pages/IntegrationHub';
import LCA from './pages/LCA';
import LogisticsEmissions from './pages/LogisticsEmissions';
import PCF from './pages/PCF';
import PFAS from './pages/PFAS';
import PFASKnowledgeHub from './pages/PFASKnowledgeHub';
import PPWR from './pages/PPWR';
import PublicDPP from './pages/PublicDPP';
import RegulatoryIntelligence from './pages/RegulatoryIntelligence';
import StakeholderHub from './pages/StakeholderHub';
import StakeholderPortal from './pages/StakeholderPortal';
import SupplierPortal from './pages/SupplierPortal';
import SupplierPortalGate from './pages/SupplierPortalGate';
import SupplierSubmit from './pages/SupplierSubmit';
import SupplyLens from './pages/SupplyLens';
import SupplyLensControls from './pages/SupplyLensControls';
import SupplyLensInbox from './pages/SupplyLensInbox';
import SupplyLensNetwork from './pages/SupplyLensNetwork';
import VSME from './pages/VSME';
import VSMECollaboratorPortal from './pages/VSMECollaboratorPortal';
import WizardBindingScenarios from './pages/WizardBindingScenarios';
import WorkItemDetail from './pages/WorkItemDetail';
import WorkflowAutomation from './pages/WorkflowAutomation';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "AuditTrail": AuditTrail,
    "BOMWorkbench": BOMWorkbench,
    "Billing": Billing,
    "CBAM": CBAM,
    "CBAMOperationalAudit": CBAMOperationalAudit,
    "CBAMRepresentative": CBAMRepresentative,
    "CBAMRepresentativePortal": CBAMRepresentativePortal,
    "CBAMSupplierPortal": CBAMSupplierPortal,
    "CCF": CCF,
    "CFODashboard": CFODashboard,
    "CSRD": CSRD,
    "CollaborationRequests": CollaborationRequests,
    "CompanySettings": CompanySettings,
    "Contract1RegistryAudit": Contract1RegistryAudit,
    "Contract1SmokeTest": Contract1SmokeTest,
    "Contract2DecisionLog": Contract2DecisionLog,
    "Contract2ExtractionJobs": Contract2ExtractionJobs,
    "Contract2MappingSessionDetail": Contract2MappingSessionDetail,
    "Contract2MappingSessions": Contract2MappingSessions,
    "Contract2Readiness": Contract2Readiness,
    "DPP": DPP,
    "ERPIntegration": ERPIntegration,
    "EUDAMED": EUDAMED,
    "EUDR": EUDR,
    "EUDRSupplierAccess": EUDRSupplierAccess,
    "EvidenceDrafts": EvidenceDrafts,
    "EvidenceRecordDetail": EvidenceRecordDetail,
    "EvidenceReviewQueue": EvidenceReviewQueue,
    "EvidenceVault": EvidenceVault,
    "Home": Home,
    "IntegrationHub": IntegrationHub,
    "LCA": LCA,
    "LogisticsEmissions": LogisticsEmissions,
    "PCF": PCF,
    "PFAS": PFAS,
    "PFASKnowledgeHub": PFASKnowledgeHub,
    "PPWR": PPWR,
    "PublicDPP": PublicDPP,
    "RegulatoryIntelligence": RegulatoryIntelligence,
    "StakeholderHub": StakeholderHub,
    "StakeholderPortal": StakeholderPortal,
    "SupplierPortal": SupplierPortal,
    "SupplierPortalGate": SupplierPortalGate,
    "SupplierSubmit": SupplierSubmit,
    "SupplyLens": SupplyLens,
    "SupplyLensControls": SupplyLensControls,
    "SupplyLensInbox": SupplyLensInbox,
    "SupplyLensNetwork": SupplyLensNetwork,
    "VSME": VSME,
    "VSMECollaboratorPortal": VSMECollaboratorPortal,
    "WizardBindingScenarios": WizardBindingScenarios,
    "WorkItemDetail": WorkItemDetail,
    "WorkflowAutomation": WorkflowAutomation,
}

export const pagesConfig = {
    mainPage: "Analytics",
    Pages: PAGES,
    Layout: __Layout,
};