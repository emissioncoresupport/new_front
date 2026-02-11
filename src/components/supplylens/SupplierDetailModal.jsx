import React from 'react';
import DraggableDashboard from '@/components/layout/DraggableDashboard';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, MapPin, Globe, Mail, Phone, Calendar, 
  Shield, AlertTriangle, FileText, ExternalLink, Pencil,
  CheckCircle, XCircle, Package, TrendingUp, BarChart3, Database, Clock, Plus, Factory, Upload, RefreshCw, Send, ChevronDown, ChevronUp
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import RiskBadge from "./RiskBadge";
import TierBadge from "./TierBadge";
import RiskScoreGauge from "./RiskScoreGauge";
import { format } from "date-fns";
import EvidenceSidePanel from './EvidenceSidePanel';
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";
import OnboardingWorkflow from "./OnboardingWorkflow";
import RiskAssessmentPanel from "./RiskAssessmentPanel";
import SupplierCBAMCostPanel from "../cbam/SupplierCBAMCostPanel";
import CrossModuleSyncIndicator from "./CrossModuleSyncIndicator";
import SupplierOrchestrationService from "./SupplierOrchestrationService";
import CSDDDComplianceModule from "./CSDDDComplianceModule";
import MaterialCreationModal from "./MaterialCreationModal";
import MaterialEvidencePanel from "./MaterialEvidencePanel";

const riskDimensions = [
  { key: 'location_risk', label: 'Location', color: 'bg-blue-500' },
  { key: 'sector_risk', label: 'Sector', color: 'bg-purple-500' },
  { key: 'human_rights_risk', label: 'Human Rights', color: 'bg-rose-500' },
  { key: 'environmental_risk', label: 'Environmental', color: 'bg-green-500' },
  { key: 'chemical_risk', label: 'Chemical/PFAS', color: 'bg-amber-500' },
  { key: 'mineral_risk', label: 'Minerals', color: 'bg-cyan-500' },
  { key: 'performance_risk', label: 'Performance', color: 'bg-orange-500' }
];

export default function SupplierDetailModal({ supplier, open, onOpenChange, onEdit, sites = [], contacts = [], alerts = [], onboardingTasks = [], onRefresh, allSuppliers = [], materialSkus = [], productSkus = [], bomItems = [], documents = [] }) {
  const handleEditClick = React.useCallback(() => {
    if (onEdit) {
      onEdit(supplier);
    }
  }, [onEdit, supplier]);

  const [isSendingInvite, setIsSendingInvite] = React.useState(false);
  const queryClient = useQueryClient();

  // Fetch all supplier-specific data
  const { data: fetchedSites = [] } = useQuery({
    queryKey: ['supplier-sites', supplier?.id],
    queryFn: () => base44.entities.SupplierSite.filter({ supplier_id: supplier.id }),
    enabled: open && !!supplier?.id,
    retry: false
  });

  const { data: fetchedContacts = [] } = useQuery({
    queryKey: ['supplier-contacts', supplier?.id],
    queryFn: () => base44.entities.SupplierContact.filter({ supplier_id: supplier.id }),
    enabled: open && !!supplier?.id,
    retry: false
  });

  const { data: fetchedAlerts = [] } = useQuery({
    queryKey: ['supplier-alerts', supplier?.id],
    queryFn: () => base44.entities.RiskAlert.filter({ supplier_id: supplier.id }),
    enabled: open && !!supplier?.id,
    retry: false
  });

  const { data: fetchedTasks = [] } = useQuery({
    queryKey: ['supplier-tasks', supplier?.id],
    queryFn: () => base44.entities.OnboardingTask.filter({ supplier_id: supplier.id }),
    enabled: open && !!supplier?.id,
    retry: false
  });

  const { data: supplierMaterialSkus = [] } = useQuery({
    queryKey: ['supplier-materials', supplier?.id],
    queryFn: () => base44.entities.MaterialSKU.filter({ supplier_id: supplier.id }),
    enabled: open && !!supplier?.id,
    retry: false
  });

  const { data: supplierBomItems = [] } = useQuery({
    queryKey: ['supplier-bom-items', supplier?.id],
    queryFn: async () => {
      const materials = await base44.entities.MaterialSKU.filter({ supplier_id: supplier.id });
      const materialIds = materials.map(m => m.id);
      const allBomItems = await base44.entities.BOMItem.list();
      return allBomItems.filter(item => materialIds.includes(item.material_sku_id));
    },
    enabled: open && !!supplier?.id,
    retry: false
  });

  const { data: allProductSkus = [] } = useQuery({
    queryKey: ['product-skus'],
    queryFn: () => base44.entities.ProductSKU.list(),
    enabled: open && !!supplier?.id,
    retry: false
  });

  const { data: fetchedEvidenceDocs = [] } = useQuery({
    queryKey: ['supplier-evidence', supplier?.id],
    queryFn: () => base44.entities.Document.filter({ object_type: 'Supplier', object_id: supplier.id }),
    enabled: open && !!supplier?.id,
    retry: false
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['supplier-pos', supplier?.id],
    queryFn: () => base44.entities.PurchaseOrder.filter({ supplier_id: supplier.id }),
    enabled: open && !!supplier?.id,
    retry: false
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['supplier-comms', supplier?.id],
    queryFn: () => base44.entities.SupplierCommunication.filter({ supplier_id: supplier.id }),
    enabled: open && !!supplier?.id,
    retry: false
  });

  // Use fetched data, fallback to props for backward compatibility - with guaranteed arrays
  const supplierSites = React.useMemo(() => {
    const fetched = fetchedSites || [];
    const fallback = (sites || []).filter(s => s?.supplier_id === supplier?.id);
    return fetched.length > 0 ? fetched : fallback;
  }, [fetchedSites, sites, supplier?.id]) || [];
  
  const supplierContacts = React.useMemo(() => {
    const fetched = fetchedContacts || [];
    const fallback = (contacts || []).filter(c => c?.supplier_id === supplier?.id);
    return fetched.length > 0 ? fetched : fallback;
  }, [fetchedContacts, contacts, supplier?.id]) || [];
  
  const supplierAlerts = React.useMemo(() => {
    const fetched = fetchedAlerts || [];
    const fallback = (alerts || []).filter(a => a?.supplier_id === supplier?.id);
    const all = fetched.length > 0 ? fetched : fallback;
    return (all || []).filter(a => a?.status === 'open');
  }, [fetchedAlerts, alerts, supplier?.id]) || [];
  
  const supplierTasks = React.useMemo(() => {
    const fetched = fetchedTasks || [];
    const fallback = (onboardingTasks || []).filter(t => t?.supplier_id === supplier?.id);
    return fetched.length > 0 ? fetched : fallback;
  }, [fetchedTasks, onboardingTasks, supplier?.id]) || [];
  
  // Use canonical data structure
  const supplierMaterials = supplierMaterialSkus || [];
  const supplierProducts = React.useMemo(() => {
    const bomItems = supplierBomItems || [];
    const productIds = [...new Set(bomItems.map(b => b.product_sku_id))];
    return (allProductSkus || []).filter(p => productIds.includes(p.id));
  }, [supplierBomItems, allProductSkus]) || [];
  
  // Use fetched evidence docs (always fresh from query)
  const supplierEvidence = fetchedEvidenceDocs || [];

  const handleSendPortalInvite = React.useCallback(async () => {
    // Get email from supplier or first contact
    const contactEmail = supplier.primary_contact_email || supplier.email || supplierContacts[0]?.email;
    
    if (!contactEmail) {
      toast.error('No contact email found for this supplier. Please add a contact first.');
      return;
    }

    setIsSendingInvite(true);
    const toastId = toast.loading('Sending portal invitation...');

    try {
      // Update supplier with contact email if missing
      if (!supplier.primary_contact_email && contactEmail) {
        await base44.entities.Supplier.update(supplier.id, {
          primary_contact_email: contactEmail
        });
      }

      const result = await base44.functions.invoke('inviteSupplierToPortal', {
        supplier_id: supplier.id,
        custom_message: `We're inviting you to complete your compliance profile. This helps us ensure regulatory compliance and streamline our partnership.`
      });

      toast.dismiss(toastId);
      toast.success(`✉️ Invitation sent to ${contactEmail}`, {
        description: `Link expires: ${new Date(result.data.expires_at).toLocaleDateString()} • Portal URL copied to clipboard`,
        duration: 6000
      });

      // Copy portal URL to clipboard for testing
      navigator.clipboard.writeText(result.data.portal_url);

      // Show preview of what supplier will see
      toast.info('Supplier will receive an email with secure access link', {
        description: '→ No login required → Fill compliance forms → Upload certificates → Data syncs back automatically',
        duration: 5000
      });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Failed to send invitation: ' + error.message);
    } finally {
      setIsSendingInvite(false);
    }
  }, [supplier?.id, supplier?.primary_contact_email, supplier?.email]);
  
  const [activeTab, setActiveTab] = React.useState("overview");
  const [showSiteForm, setShowSiteForm] = React.useState(false);
  const [showMappingModal, setShowMappingModal] = React.useState(false);
  const [newMapping, setNewMapping] = React.useState({
    sku_code: '',
    supplier_product_code: '',
    is_primary_supplier: false,
    relationship_type: 'direct_supplier'
  });
  const [newSite, setNewSite] = React.useState({
    site_name: '',
    country: supplier?.country || '',
    city: '',
    address: '',
    facility_type: 'factory'
  });
  const [showMaterialModal, setShowMaterialModal] = React.useState(false);
  const [selectedMaterial, setSelectedMaterial] = React.useState(null);
  const [showMaterialEvidence, setShowMaterialEvidence] = React.useState(false);
  const [alertsExpanded, setAlertsExpanded] = React.useState(true);
  
  // Reset tab when modal opens/closes or supplier changes
  React.useEffect(() => {
    if (open) setActiveTab("overview");
  }, [open, supplier?.id]);

  const handleCreateSite = async () => {
    if (!newSite.site_name || !newSite.country) {
      alert('Please fill site name and country');
      return;
    }
    
    try {
      await base44.entities.SupplierSite.create({
        supplier_id: supplier.id,
        ...newSite
      });
      setShowSiteForm(false);
      setNewSite({
        site_name: '',
        country: supplier?.country || '',
        city: '',
        address: '',
        facility_type: 'factory'
      });
      if (onRefresh) onRefresh();
    } catch (error) {
      alert('Failed to create site: ' + error.message);
    }
  };

  const handleCreateMapping = async () => {
    if (!newMapping.sku_code) {
      alert('Please select or enter an SKU');
      return;
    }

    try {
      // Find or create SKU
      let sku = (allSkus || []).find(s => s?.sku_code === newMapping.sku_code);
      if (!sku) {
        sku = await base44.entities.SKU.create({
          sku_code: newMapping.sku_code,
          description: 'Created from supplier mapping'
        });
      }

      // Create mapping
      await base44.entities.SupplierSKUMapping.create({
        supplier_id: supplier.id,
        sku_id: sku.id,
        supplier_product_code: newMapping.supplier_product_code,
        is_primary_supplier: newMapping.is_primary_supplier,
        relationship_type: newMapping.relationship_type
      });

      setShowMappingModal(false);
      setNewMapping({
        sku_code: '',
        supplier_product_code: '',
        is_primary_supplier: false,
        relationship_type: 'direct_supplier'
      });
      if (onRefresh) onRefresh();
    } catch (error) {
      alert('Failed to create mapping: ' + error.message);
    }
  };

  return (
    <DraggableDashboard
      open={open}
      onClose={() => onOpenChange(false)}
      title={supplier?.legal_name || 'Supplier Details'}
      icon={Building2}
      width="900px"
      height="85vh"
      defaultPosition="center"
    >
      <div className="p-6 h-full overflow-y-auto bg-white/20 backdrop-blur-3xl">
        <div className="pb-4 border-b border-white/20 bg-white/40 backdrop-blur-xl rounded-2xl mb-4 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/60 backdrop-blur-md border border-white/40">
                <Building2 className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <h3 className="text-base font-medium flex items-center gap-2 text-slate-900">
                  {supplier.legal_name}
                  <TierBadge tier={supplier.tier} />
                  <RiskBadge level={supplier.risk_level} />
                </h3>
                {supplier.trade_name && supplier.trade_name !== supplier.legal_name && (
                  <p className="text-xs text-slate-500 mt-0.5">Also known as: {supplier.trade_name}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {supplier.city ? `${supplier.city}, ` : ''}{supplier.country}
                  </span>
                  {supplier.created_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Added {format(new Date(supplier.created_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-[100]">
              <button 
                type="button"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-[#86b027] hover:bg-[#86b027]/90 text-white h-8 px-3 shadow-sm"
                onClick={handleSendPortalInvite}
                disabled={isSendingInvite}
              >
                {isSendingInvite ? (
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                ) : (
                  <Send className="w-3 h-3 mr-1.5" />
                )}
                Invite to Portal
              </button>
              <button 
                type="button"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-slate-200/80 bg-transparent hover:bg-slate-50 text-slate-700 h-8 px-3 shadow-none hover:shadow-sm"
                onClick={handleEditClick}
              >
                <Pencil className="w-3 h-3 mr-1.5" />
                Edit
              </button>
            </div>
          </div>

          {/* Cross-Module Sync Status */}
          <div className="mt-4 flex items-center justify-between p-3 bg-white/40 backdrop-blur-xl rounded-xl border border-white/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-light text-slate-700 uppercase tracking-wider">Module Integration</span>
            </div>
            <div className="flex items-center gap-3">
              <CrossModuleSyncIndicator supplier={supplier} compact />
              <Button
                size="sm"
                variant="ghost"
                onClick={async (e) => {
                  e.stopPropagation();
                  await SupplierOrchestrationService.orchestrateSupplier(supplier.id, 'update');
                  if (onRefresh) onRefresh();
                }}
                className="h-7 text-xs rounded-lg hover:bg-white/20 backdrop-blur-sm text-[#86b027] font-light"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Sync All
              </Button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-5 gap-2 mt-3">
            <div onClick={() => setActiveTab('risk')} className="group text-center p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer">
              <BarChart3 className="w-3.5 h-3.5 text-slate-700 mx-auto mb-1 group-hover:text-slate-900 transition-colors duration-200" />
              <p className="text-lg font-light text-slate-900 group-hover:font-normal transition-all duration-200">{supplier.risk_score || 0}</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-wide group-hover:text-slate-700 transition-colors duration-200">Risk Score</p>
            </div>
            <div onClick={() => setActiveTab('products')} className="group text-center p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer">
              <Package className="w-3.5 h-3.5 text-slate-700 mx-auto mb-1 group-hover:text-slate-900 transition-colors duration-200" />
              <p className="text-lg font-light text-slate-900 group-hover:font-normal transition-all duration-200">{(supplierMaterials || []).length}</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-wide group-hover:text-slate-700 transition-colors duration-200">Materials</p>
            </div>
            <div onClick={() => setActiveTab('documents')} className="group text-center p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer">
              <FileText className="w-3.5 h-3.5 text-slate-700 mx-auto mb-1 group-hover:text-slate-900 transition-colors duration-200" />
              <p className="text-lg font-light text-slate-900 group-hover:font-normal transition-all duration-200">{(supplierEvidence || []).length}</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-wide group-hover:text-slate-700 transition-colors duration-200">Documents</p>
            </div>
            <div onClick={() => setActiveTab('risk')} className="group text-center p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mx-auto mb-1 group-hover:text-amber-700 transition-colors duration-200" />
              <p className="text-lg font-light text-slate-900 group-hover:font-normal transition-all duration-200">{(supplierAlerts || []).length}</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-wide group-hover:text-slate-700 transition-colors duration-200">Alerts</p>
            </div>
            <div className="group text-center p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-1 group-hover:text-emerald-700 transition-colors duration-200" />
              <p className="text-lg font-light text-slate-900 group-hover:font-normal transition-all duration-200">{supplier.data_completeness || 0}%</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-wide group-hover:text-slate-700 transition-colors duration-200">Data Quality</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
          <TabsList className="bg-white/30 backdrop-blur-xl border-b border-white/20 rounded-none h-auto p-0 w-full justify-start flex flex-row">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white data-[state=active]:text-[#86b027] hover:bg-white/40 px-4 py-2 text-xs font-medium text-slate-600">Overview</TabsTrigger>
            <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white data-[state=active]:text-[#86b027] hover:bg-white/40 px-4 py-2 text-xs font-medium text-slate-600">Materials ({(supplierMaterials || []).length})</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white data-[state=active]:text-[#86b027] hover:bg-white/40 px-4 py-2 text-xs font-medium text-slate-600">Documents ({(supplierEvidence || []).length})</TabsTrigger>
            <TabsTrigger value="evidence" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white data-[state=active]:text-[#86b027] hover:bg-white/40 px-4 py-2 text-xs font-medium text-slate-600">Evidence</TabsTrigger>
            <TabsTrigger value="risk" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white data-[state=active]:text-[#86b027] hover:bg-white/40 px-4 py-2 text-xs font-medium text-slate-600">Risk</TabsTrigger>
            <TabsTrigger value="onboarding" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white data-[state=active]:text-[#86b027] hover:bg-white/40 px-4 py-2 text-xs font-medium text-slate-600">Onboarding</TabsTrigger>
            <TabsTrigger value="sites" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white data-[state=active]:text-[#86b027] hover:bg-white/40 px-4 py-2 text-xs font-medium text-slate-600">Sites ({(supplierSites || []).length})</TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white data-[state=active]:text-[#86b027] hover:bg-white/40 px-4 py-2 text-xs font-medium text-slate-600">Contacts ({(supplierContacts || []).length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 space-y-2.5">
            {/* Company Information */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/40 backdrop-blur-xl rounded-xl border border-white/30 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/60">
                  <Building2 className="w-3.5 h-3.5 text-slate-700" />
                  <h3 className="text-xs font-medium text-slate-900">Company Information</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                    <div>
                      <p className="font-medium">{supplier.city ? `${supplier.city}, ` : ''}{supplier.country}</p>
                      {supplier.address && (
                        <p className="text-slate-500 text-xs mt-0.5">{supplier.address}</p>
                      )}
                    </div>
                  </div>
                  {supplier.website && (
                    <a 
                      href={supplier.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#02a1e8] hover:text-[#0291d1]"
                    >
                      <Globe className="w-4 h-4" />
                      <span className="truncate">{supplier.website}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {supplier.email && (
                    <a 
                      href={`mailto:${supplier.email}`}
                      className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                    >
                      <Mail className="w-4 h-4" />
                      {supplier.email}
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-white/50 backdrop-blur-xl rounded-lg border border-white/30 shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-3">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/40">
                  <FileText className="w-3.5 h-3.5 text-slate-700" />
                  <h3 className="text-xs font-medium text-slate-900">Identifiers</h3>
                </div>
                <div className="space-y-3 text-sm">
                  {supplier.vat_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">VAT Number</span>
                      <span className="font-medium text-slate-900">{supplier.vat_number}</span>
                    </div>
                  )}
                  {supplier.chamber_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Chamber ID</span>
                      <span className="font-medium text-slate-900">{supplier.chamber_id}</span>
                    </div>
                  )}
                  {supplier.nace_code && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">NACE Code</span>
                      <span className="font-medium text-slate-900">{supplier.nace_code}</span>
                    </div>
                  )}
                  {supplier.duns_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">DUNS Number</span>
                      <span className="font-medium text-slate-900">{supplier.duns_number}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Status</span>
                    <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'} className="bg-[#86b027] text-white font-semibold">
                      {supplier.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance & Compliance */}
            <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/40 backdrop-blur-xl rounded-xl border border-white/30 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/60">
                  <Shield className="w-3.5 h-3.5 text-slate-700" />
                  <h3 className="text-xs font-medium text-slate-900">Regulatory Compliance</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={cn(
                      "gap-1.5 px-3 py-1",
                      supplier.cbam_relevant ? "bg-[#02a1e8]/10 text-[#02a1e8] border-[#02a1e8]/30" : "text-slate-400 border-slate-200"
                    )}>
                      {supplier.cbam_relevant ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      CBAM
                    </Badge>
                    <Badge variant="outline" className={cn(
                      "gap-1.5 px-3 py-1",
                      supplier.pfas_relevant ? "bg-purple-50 text-purple-700 border-purple-200" : "text-slate-400 border-slate-200"
                    )}>
                      {supplier.pfas_relevant ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      PFAS
                    </Badge>
                    <Badge variant="outline" className={cn(
                      "gap-1.5 px-3 py-1",
                      supplier.eudr_relevant ? "bg-[#86b027]/10 text-[#86b027] border-[#86b027]/30" : "text-slate-400 border-slate-200"
                    )}>
                      {supplier.eudr_relevant ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      EUDR
                    </Badge>
                    <Badge variant="outline" className={cn(
                      "gap-1.5 px-3 py-1",
                      supplier.ppwr_relevant ? "bg-orange-50 text-orange-700 border-orange-200" : "text-slate-400 border-slate-200"
                    )}>
                      {supplier.ppwr_relevant ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      PPWR
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-white/50 backdrop-blur-xl rounded-lg border border-white/30 shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-3">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/40">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <h3 className="text-xs font-medium text-slate-900">Data Quality</h3>
                </div>
                <div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 font-medium">Completeness</span>
                      <span className="font-bold text-slate-900">{supplier.data_completeness || 0}%</span>
                    </div>
                    <Progress value={supplier.data_completeness || 0} className="h-2 bg-slate-200" />
                    <p className="text-xs text-slate-700 font-medium mt-2">
                      {supplier.data_completeness >= 80 ? '✓ High quality data' : 
                       supplier.data_completeness >= 50 ? '⚠ Moderate quality' : '✗ More data needed'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            {(supplierAlerts || []).length > 0 && (
              <div className="bg-amber-500/10 backdrop-blur-xl rounded-xl border border-amber-500/30 shadow-sm p-4">
                <div 
                  className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200/60 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setAlertsExpanded(!alertsExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <h3 className="text-sm font-medium text-amber-900">Active Alerts ({supplierAlerts.length})</h3>
                  </div>
                  {alertsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-amber-700" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-700" />
                  )}
                </div>
                {alertsExpanded && (
                  <div className="space-y-2">
                  {(supplierAlerts || []).slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-md rounded-lg border border-white/40 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                        {alert.description && (
                          <p className="text-xs text-slate-700 font-medium mt-1">{alert.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-3 text-xs border-amber-400 text-amber-800 font-medium">
                        {alert.alert_type}
                      </Badge>
                    </div>
                  ))}
                  {(supplierAlerts || []).length > 5 && (
                    <p className="text-xs text-center text-amber-700 font-medium pt-2">
                      +{(supplierAlerts || []).length - 5} more alerts
                    </p>
                  )}
                  </div>
                )}
              </div>
            )}

            {/* Summary Notes */}
            {supplier.notes && (
              <div className="bg-white/40 backdrop-blur-xl rounded-xl border border-white/30 shadow-sm p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-2">Notes</h3>
                <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            )}
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="products" className="mt-3 space-y-3">
            <div className="bg-white/40 backdrop-blur-xl rounded-xl border border-white/30 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#86b027]" />
                  <h2 className="text-lg font-medium text-slate-900">Materials & Components</h2>
                </div>
                <Button 
                  size="sm"
                  onClick={() => setShowMaterialModal(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white h-8 px-3 text-xs shadow-sm"
                >
                  <Plus className="w-3 h-3 mr-1.5" />
                  Add Material
                </Button>
              </div>
              <div>
                {(supplierMaterials || []).length > 0 ? (
                  <div className="space-y-2">
                    {supplierMaterials.map((material) => (
                      <div key={material.id} className="bg-white/30 backdrop-blur-md rounded-lg border border-white/40 p-4 hover:bg-white/50 hover:border-[#86b027]/60 hover:shadow-md transition-all duration-200 group">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900">{material.material_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-slate-500">SKU: {material.internal_sku}</p>
                              {material.supplier_sku && (
                                <p className="text-xs text-slate-500">Supplier SKU: {material.supplier_sku}</p>
                              )}
                            </div>
                            {material.description && (
                              <p className="text-sm text-slate-600 mt-2">{material.description}</p>
                            )}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {(() => {
                                const usedInProducts = supplierBomItems
                                  .filter(b => b.material_sku_id === material.id)
                                  .map(b => allProductSkus.find(p => p.id === b.product_sku_id))
                                  .filter(Boolean);
                                return usedInProducts.length > 0 ? (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Mapped to {usedInProducts.length} product(s)
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Not mapped to products
                                  </Badge>
                                );
                              })()}
                              {material.pfas_content && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                  PFAS
                                </Badge>
                              )}
                              {material.recycled_content_percentage > 0 && (
                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                                  {material.recycled_content_percentage}% Recycled
                                </Badge>
                              )}
                              {material.pcf_co2e_per_unit && (
                                <Badge variant="outline" className="text-xs">
                                  {material.pcf_co2e_per_unit} kgCO2e/{material.uom}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="border-[#86b027] text-[#86b027] capitalize">
                              {material.category || 'material'}
                            </Badge>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMaterial(material);
                                  setShowMaterialEvidence(true);
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <FileText className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  // Update material
                                  const newName = prompt('Material name:', material.material_name);
                                  if (newName) {
                                    await base44.entities.MaterialSKU.update(material.id, { material_name: newName });
                                    toast.success('Updated');
                                    queryClient.invalidateQueries({ queryKey: ['supplier-materials'] });
                                    if (onRefresh) onRefresh();
                                  }
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm('Delete this material?')) {
                                    await base44.entities.MaterialSKU.delete(material.id);
                                    toast.success('Material deleted');
                                    queryClient.invalidateQueries({ queryKey: ['supplier-materials'] });
                                    if (onRefresh) onRefresh();
                                  }
                                }}
                                className="h-7 w-7 p-0 hover:text-red-600"
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-600">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-medium">No materials linked to this supplier yet.</p>
                    <p className="text-xs mt-1 text-slate-700">Materials represent raw materials, components, or parts supplied.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Products Using Supplier Materials */}
            {(supplierProducts || []).length > 0 && (
              <div className="bg-white/40 backdrop-blur-xl rounded-xl border border-white/30 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-[#02a1e8]" />
                  <h2 className="text-lg font-medium text-slate-900">Products Using This Supplier</h2>
                </div>
                <div>
                  <div className="space-y-2">
                    {supplierProducts.map((product) => (
                      <div key={product.id} className="bg-white/30 backdrop-blur-md rounded-lg border border-white/40 p-3 hover:bg-white/50 hover:shadow-md transition-all duration-200">
                        <p className="font-semibold text-slate-900">{product.product_name}</p>
                        <p className="text-xs text-slate-700 font-medium mt-1">SKU: {product.internal_product_sku}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-3">
          <div className="bg-white/40 backdrop-blur-xl rounded-xl border border-white/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-medium text-slate-900">Compliance & Evidence Documents</h2>
          </div>
          <button
          type="button"
          className="inline-flex items-center justify-center rounded-sm text-sm font-medium bg-white/80 border border-purple-400/60 text-purple-700 hover:bg-purple-50 transition-all shadow-none hover:shadow-md px-3 py-2 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById(`doc-upload-${supplier.id}`)?.click();
          }}
          >
          <Upload className="w-3.5 h-3.5 mr-2" />
          Upload Document
          </button>
          </div>
          <input
          id={`doc-upload-${supplier.id}`}
          type="file"
          className="hidden"
          accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const toastId = toast.loading('Uploading document...');

            try {
              const user = await base44.auth.me();
              const { file_url } = await base44.integrations.Core.UploadFile({ file });

              // Calculate SHA-256 hash
              const arrayBuffer = await file.arrayBuffer();
              const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const file_hash_sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

              await base44.entities.Document.create({
                tenant_id: user.company_id,
                object_type: 'Supplier',
                object_id: supplier.id,
                file_name: file.name,
                file_url,
                file_hash_sha256,
                file_size_bytes: file.size,
                document_type: 'certificate',
                uploaded_by: user.email,
                uploaded_at: new Date().toISOString(),
                status: 'pending_review'
              });

              toast.dismiss(toastId);
              toast.success('Document uploaded successfully');
              if (onRefresh) onRefresh();
            } catch (error) {
              toast.dismiss(toastId);
              toast.error('Upload failed: ' + error.message);
            } finally {
              e.target.value = '';
            }
          }}
          />
              {(supplierEvidence || []).length > 0 ? (
                <div className="space-y-2">
                  {(supplierEvidence || []).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-white/30 backdrop-blur-md rounded-lg border border-white/40 p-4 hover:bg-white/50 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-purple-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name || 'Document'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {doc.document_type || 'other'}
                            </Badge>
                            <Badge variant={doc.status === 'verified' ? 'default' : 'secondary'} className="text-xs">
                              {doc.status || 'pending'}
                            </Badge>
                            {doc.uploaded_at && (
                              <span className="text-xs text-slate-500">
                                {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {doc.file_url && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-600">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">No documents uploaded for this supplier yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="evidence" className="mt-3">
            <EvidenceSidePanel 
              entityType="Supplier" 
              entityId={supplier.id} 
              entityName={supplier.legal_name}
            />
          </TabsContent>

          <TabsContent value="risk" className="mt-3 space-y-3">
            {/* Risk Assessment Panel */}
            <RiskAssessmentPanel
              supplier={supplier}
              suppliers={allSuppliers}
              sites={supplierSites}
              tasks={supplierTasks}
              onRefresh={onRefresh}
            />

            {/* Overall Risk Score */}
            <div className="bg-white/40 backdrop-blur-xl rounded-xl border border-white/30 shadow-sm p-5">
              <div className="p-2">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <RiskScoreGauge score={supplier.risk_score} size="lg" />
                    <p className="text-sm text-slate-500 mt-2">Overall Risk Score</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-semibold text-slate-900">Risk Level:</span>
                      <RiskBadge level={supplier.risk_level} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 font-medium">Data Completeness</span>
                        <span className="font-bold text-slate-900">{supplier.data_completeness || 0}%</span>
                      </div>
                      <Progress value={supplier.data_completeness || 0} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Dimensions */}
            <div className="bg-white/40 backdrop-blur-xl rounded-xl border border-white/30 shadow-sm p-5">
              <h3 className="text-sm font-medium text-slate-900 mb-3">Risk Dimensions</h3>
              <div className="space-y-3">
                {riskDimensions.map((dim) => (
                  <div key={dim.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 font-medium">{dim.label}</span>
                      <span className="font-bold text-slate-900">{supplier[dim.key] || 0}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", dim.color)}
                        style={{ width: `${supplier[dim.key] || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sites" className="mt-3 space-y-3">
            <div className="flex justify-end">
              <Button 
                size="sm"
                onClick={() => setShowSiteForm(!showSiteForm)}
                className="bg-slate-900 hover:bg-slate-800 text-white h-8 px-3 text-xs shadow-sm"
              >
                <Factory className="w-3 h-3 mr-1.5" />
                Add Site
              </Button>
            </div>

            {showSiteForm && (
              <div className="bg-white/40 backdrop-blur-xl border border-[#86b027]/60 shadow-sm p-5">
                <h3 className="text-sm font-medium text-slate-900 mb-3">New Site</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Site Name *</label>
                    <input
                      type="text"
                      value={newSite.site_name}
                      onChange={(e) => setNewSite({ ...newSite, site_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="Main Factory"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 mb-1 block">Country *</label>
                      <input
                        type="text"
                        value={newSite.country}
                        onChange={(e) => setNewSite({ ...newSite, country: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 mb-1 block">City</label>
                      <input
                        type="text"
                        value={newSite.city}
                        onChange={(e) => setNewSite({ ...newSite, city: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Facility Type</label>
                    <select
                      value={newSite.facility_type}
                      onChange={(e) => setNewSite({ ...newSite, facility_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="factory">Factory</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="office">Office</option>
                      <option value="headquarters">Headquarters</option>
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowSiteForm(false)} className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-8 px-3 text-xs shadow-none">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleCreateSite} className="bg-slate-900 hover:bg-slate-800 text-white h-8 px-3 text-xs shadow-sm">
                      Create Site
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {(supplierSites || []).length > 0 ? (
              <div className="space-y-2">
                {(supplierSites || []).map((site) => (
                <div key={site.id} className="bg-white/30 backdrop-blur-md rounded-lg border border-white/40 p-4 hover:bg-white/50 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{site.site_name}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5" />
                          {site.city ? `${site.city}, ` : ''}{site.country}
                        </div>
                        {site.address && (
                          <p className="text-xs text-slate-600 font-medium mt-1">{site.address}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="font-medium">{site.facility_type}</Badge>
                    </div>
                    {site.certifications && (site.certifications || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(site.certifications || []).map((cert, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-medium">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-medium">No sites registered for this supplier.</p>
                <p className="text-xs mt-1 text-slate-700 font-medium">Sites represent physical facilities like factories, warehouses, or offices.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="onboarding" className="mt-3">
            <OnboardingWorkflow 
              supplier={supplier}
              tasks={supplierTasks}
              contacts={supplierContacts}
              onRefresh={onRefresh}
              onSwitchTab={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="contacts" className="mt-3">
            {(supplierContacts || []).length > 0 ? (
              <div className="space-y-2">
                {(supplierContacts || []).map((contact) => (
                  <div key={contact.id} className="bg-white/30 backdrop-blur-md rounded-lg border border-white/40 p-4 hover:bg-white/50 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{contact.name}</p>
                        <Badge variant="secondary" className="mt-1 text-xs font-medium">
                          {contact.role}
                        </Badge>
                      </div>
                      {contact.is_primary && (
                        <Badge className="bg-blue-100 text-blue-700 font-semibold">Primary</Badge>
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                          <Mail className="w-3.5 h-3.5" />
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                          <Phone className="w-3.5 h-3.5" />
                          {contact.phone}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                <Mail className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-medium">No contacts registered for this supplier.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showMaterialModal && (
        <MaterialCreationModal 
          open={showMaterialModal}
          onOpenChange={setShowMaterialModal}
          supplierId={supplier.id}
          onSuccess={() => {
            setShowMaterialModal(false);
            queryClient.invalidateQueries({ queryKey: ['supplier-materials', supplier.id] });
            queryClient.invalidateQueries({ queryKey: ['material-skus'] });
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {showMaterialEvidence && selectedMaterial && (
        <MaterialEvidencePanel
          material={selectedMaterial}
          open={showMaterialEvidence}
          onOpenChange={setShowMaterialEvidence}
        />
      )}
    </DraggableDashboard>
  );
}