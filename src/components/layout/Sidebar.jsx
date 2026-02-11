import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FileText, Upload, Users, Box,
  Leaf, Globe, Truck, BarChart3, ShieldCheck, Database,
  ChevronRight, ChevronDown, Menu, Settings, Search, AlertTriangle,
  Factory, Package, Recycle, Footprints, Briefcase, BookOpen,
  MessageSquare, Network, Waypoints, Activity, Cloud, TreePine, Droplet, IdCard,
  MapPin, Layers, Euro, PanelLeftClose, PanelLeft, DollarSign, Target, Tag, Terminal, LogOut, Clock, Send, Shield } from
'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from "@/lib/utils";
import UserProfileButton from './UserProfileButton';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/AuthContext'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { getCurrentCompany, getCurrentUser, getUserMe, getUserListByCompany } from '@/components/utils/multiTenant';

const SidebarItem = ({ icon: Icon, label, path, isActive, hasSubmenu, isOpen, onToggle, children, collapsed, isSection }) => {
  if (hasSubmenu) {
    return (
      <div className="mb-2 group">
        <button
          onClick={onToggle}
          title={collapsed ? label : ''}
          className={cn(
            "w-full flex items-center rounded-lg transition-all duration-300 border border-transparent",
            collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2.5",
            isActive 
              ? "text-[#86b027] bg-gradient-to-r from-[#86b027]/20 via-[#86b027]/10 to-transparent border-[#86b027]/30 backdrop-blur-md shadow-lg shadow-[#86b027]/20" 
              : "text-slate-400"
          )}>

          <div className={cn("flex items-center", collapsed ? "" : "gap-2.5")}>
            <div className={cn(
              "transition-all duration-300",
              isActive ? "text-[#86b027]" : "text-slate-400"
            )}>
              <Icon className="w-4 h-4" />
            </div>
            {!collapsed && <span className={cn("tracking-wider font-light", isSection ? "text-xs uppercase text-white/70" : "text-sm text-white/70", isActive ? "text-[#86b027] font-medium" : "")}>{label}</span>}
          </div>
          {!collapsed && (isOpen ? <ChevronDown className="w-3 h-3 opacity-60" /> : <ChevronRight className="w-3 h-3 opacity-60" />)}
        </button>
        {isOpen && !collapsed &&
        <div className="ml-6 mt-2 space-y-1 border-l-2 border-[#86b027]/30 pl-3 relative">
            {children}
          </div>
        }
      </div>);

  }

  return (
    <Link
      to={path}
      title={collapsed ? label : ''}
      className={cn(
      "flex items-center rounded-lg transition-all duration-300 mb-1.5 border border-transparent group",
      collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5",
      isActive 
        ? "text-[#86b027] bg-gradient-to-r from-[#86b027]/20 via-[#86b027]/10 to-transparent border-[#86b027]/30 backdrop-blur-md shadow-lg shadow-[#86b027]/20" 
        : "text-slate-400"
      )}>

      <div className={cn(
        "transition-all duration-300",
        isActive ? "text-[#86b027]" : "text-slate-400"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      {!collapsed && <span className={cn("tracking-wider font-light", isSection ? "text-xs uppercase text-white/70" : "text-sm text-white/70", isActive ? "text-[#86b027] font-medium" : "")}>{label}</span>}
      {!collapsed && isActive && <div className="ml-auto w-2 h-2 rounded-full bg-[#86b027] shadow-[0_0_12px_rgba(134,176,39,0.8)]" />}
    </Link>);

  };

export default function Sidebar() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [logoSpin, setLogoSpin] = useState(true);
  const [supplyChainOpen, setSupplyChainOpen] = useState(false);
  const [supplyLensOpen, setSupplyLensOpen] = useState(false);
  const [sustainabilityOpen, setSustainabilityOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [ccfOpen, setCcfOpen] = useState(false);
  const [pcfOpen, setPcfOpen] = useState(false);
  const [cbamOpen, setCbamOpen] = useState(false);
  const [pfasOpen, setPfasOpen] = useState(false);
  const [dppOpen, setDppOpen] = useState(false);
  const [contract2Open, setContract2Open] = useState(false);
   const { logout } = useAuth();
  

  const { data: authUser, isLoading: loadingMe } = useQuery({
      queryKey: ['auth-user'],
      queryFn: getUserMe
    });
  

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u?.role === 'admin');
    }).catch(() => {});
    // Trigger spin on mount
    setLogoSpin(true);
    const timer = setTimeout(() => setLogoSpin(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const triggerSpin = () => {
    setLogoSpin(true);
    setTimeout(() => setLogoSpin(false), 2000);
  };

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', newState);
    triggerSpin();
  };

  const isActive = (path) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  // All sections closed by default - user must click to expand

  return (
    <div className={cn(
      "h-screen flex flex-col border-r border-white/10 flex-shrink-0 text-white shadow-xl relative z-50 transition-all duration-300",
      "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-xl",
      collapsed ? "w-20" : "w-72"
    )}>
      {/* Background enhancement */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-[#86b027]/5 rounded-full blur-[120px] opacity-30"></div>
        <div className="absolute bottom-40 left-0 w-80 h-80 bg-slate-400/3 rounded-full blur-[100px] opacity-20"></div>
      </div>
      {/* Logo Area */}
      <div className={cn(
        "relative overflow-hidden group bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 transition-all duration-300 z-10",
        collapsed ? "px-3 py-6" : "px-6 py-8"
      )}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-[#86b027]/8 blur-[100px] rounded-full pointer-events-none transition-opacity duration-700 opacity-25"></div>
        <motion.div 
          className="flex flex-col justify-center items-center relative z-10 gap-2"
          style={{ perspective: '1200px' }}
          key={`logo-${logoSpin}`}
        >
          <motion.img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692abfca0110fc96481263f5/a7d097f93_Untitleddesign17.png"
            alt="Emission CORE"
            className={cn(
              "object-contain drop-shadow-lg filter brightness-105",
              collapsed ? "h-12 w-12" : "h-32 w-auto"
            )}
            initial={{ rotateY: 0, opacity: 0.8 }}
            animate={logoSpin ? {
              rotateY: [0, 360, 720, 1080],
              opacity: 1,
              y: [0, -15, -8, 0],
              scale: [1, 1.15, 1.08, 1]
            } : {
              rotateY: 0,
              y: [0, -10, 0],
              opacity: 1,
              scale: 1
            }}
            transition={logoSpin ? {
              rotateY: { duration: 1.8, ease: [0.43, 0.13, 0.23, 0.96], times: [0, 0.33, 0.66, 1] },
              y: { duration: 1.8, ease: "easeInOut" },
              scale: { duration: 1.8, ease: "easeInOut" },
              opacity: { duration: 0.3 }
            } : {
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              rotateY: { duration: 0.3 }
            }}
            style={{ transformStyle: 'preserve-3d' }}
          />

        </motion.div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="absolute top-4 right-2 text-slate-400 hover:text-white hover:bg-white/10 w-7 h-7 z-20"
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto pt-2 pb-6 px-3 space-y-8 custom-scrollbar">
        <div className="space-y-16">
        


        {/* Supply Chain */}
         <div>
          {!collapsed && (
            <div className="px-3 mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-white/30 to-transparent"></div>
              <span className="text-[10px] font-semibold text-[#86b027] uppercase tracking-widest drop-shadow-[0_0_8px_rgba(134,176,39,0.2)]">Supply Chain</span>
              <div className="h-px flex-1 bg-gradient-to-l from-white/30 to-transparent"></div>
            </div>
          )}

          {/* SupplyLens Collapsible */}
          <SidebarItem
            icon={Network}
            label="SupplyLens"
            hasSubmenu
            isOpen={supplyLensOpen}
            onToggle={() => setSupplyLensOpen(!supplyLensOpen)}
            isSection={false}
            collapsed={collapsed}>

            <SidebarItem
              icon={BarChart3}
              label="Control Tower"
              path={createPageUrl('SupplyLens')}
              isActive={isActive(createPageUrl('SupplyLens'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={FileText}
              label="Evidence Vault"
              path={createPageUrl('EvidenceVault')}
              isActive={isActive(createPageUrl('EvidenceVault'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={Globe}
              label="Network"
              path={createPageUrl('SupplyLensNetwork')}
              isActive={isActive(createPageUrl('SupplyLensNetwork'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={Settings}
              label="Integrations"
              path={createPageUrl('IntegrationHub')}
              isActive={isActive(createPageUrl('IntegrationHub'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={ShieldCheck}
              label="Controls"
              path={createPageUrl('SupplyLensControls')}
              isActive={isActive(createPageUrl('SupplyLensControls'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={Target}
              label="Readiness"
              path={createPageUrl('Contract2Readiness')}
              isActive={isActive(createPageUrl('Contract2Readiness'))}
              collapsed={collapsed} />

          </SidebarItem>
        </div>

        {/* Sustainability Reporting */}
         <div>
          {!collapsed && (
            <div className="px-3 mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-white/30 to-transparent"></div>
              <span className="text-[10px] font-semibold text-[#86b027] uppercase tracking-widest drop-shadow-[0_0_8px_rgba(134,176,39,0.2)]">Sustainability Reporting</span>
              <div className="h-px flex-1 bg-gradient-to-l from-white/30 to-transparent"></div>
            </div>
          )}
          <SidebarItem
            icon={FileText}
            label="Sustainability Reporting"
            hasSubmenu
            isOpen={sustainabilityOpen}
            onToggle={() => setSustainabilityOpen(!sustainabilityOpen)}
            collapsed={collapsed}>

            <SidebarItem
              icon={FileText}
              label="CSRD Reporting"
              path={createPageUrl('CSRD')}
              isActive={isActive(createPageUrl('CSRD'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={Cloud}
              label="CCF"
              hasSubmenu
              isOpen={ccfOpen}
              onToggle={() => setCcfOpen(!ccfOpen)}
              collapsed={collapsed}>

              <SidebarItem
                icon={BarChart3}
                label="Overview"
                path={createPageUrl('CCF')}
                isActive={isActive(createPageUrl('CCF'))}
                collapsed={collapsed} />

              <SidebarItem
                icon={ShieldCheck}
                label="Stakeholder Hub"
                path={createPageUrl('StakeholderHub')}
                isActive={isActive(createPageUrl('StakeholderHub'))}
                collapsed={collapsed} />

            </SidebarItem>

            <SidebarItem
              icon={Leaf}
              label="PCF"
              hasSubmenu
              isOpen={pcfOpen}
              onToggle={() => setPcfOpen(!pcfOpen)}
              collapsed={collapsed}>

              <SidebarItem
                icon={BarChart3}
                label="Overview"
                path={createPageUrl('PCF')}
                isActive={isActive(createPageUrl('PCF')) || isActive(createPageUrl('PCF?view=dashboard'))}
                collapsed={collapsed} />

              <SidebarItem
                icon={FileText}
                label="Evidence Vault"
                path={createPageUrl('PCF?view=evidence')}
                isActive={isActive(createPageUrl('PCF?view=evidence'))}
                collapsed={collapsed} />



            </SidebarItem>

            <SidebarItem
              icon={IdCard}
              label="DPP - Digital Product Passport"
              hasSubmenu
              isOpen={dppOpen}
              onToggle={() => setDppOpen(!dppOpen)}
              collapsed={collapsed}>

              <SidebarItem
                icon={BarChart3}
                label="Overview"
                path={createPageUrl('DPP')}
                isActive={isActive(createPageUrl('DPP'))}
                collapsed={collapsed} />

              <SidebarItem
                icon={FileText}
                label="DPP Evidence Vault"
                path={createPageUrl('DPP?tab=evidence-vault')}
                isActive={isActive(createPageUrl('DPP?tab=evidence-vault'))}
                collapsed={collapsed} />



            </SidebarItem>

            <SidebarItem
              icon={Truck}
              label="Logistics Emissions"
              path={createPageUrl('LogisticsEmissions')}
              isActive={isActive(createPageUrl('LogisticsEmissions'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={Footprints}
              label="LCA - Life Cycle Assessment"
              path={createPageUrl('LCA')}
              isActive={isActive(createPageUrl('LCA'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={Target}
              label="VSME"
              path={createPageUrl('VSME')}
              isActive={isActive(createPageUrl('VSME'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={FileText}
              label="CSDDD"
              path={createPageUrl('CSDDD')}
              isActive={isActive(createPageUrl('CSDDD'))}
              collapsed={collapsed} />

          </SidebarItem>
        </div>

        {/* Regulatory Compliance */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-white/30 to-transparent"></div>
              <span className="text-[10px] font-semibold text-[#86b027] uppercase tracking-widest drop-shadow-[0_0_8px_rgba(134,176,39,0.2)]">Regulatory Compliance</span>
              <div className="h-px flex-1 bg-gradient-to-l from-white/30 to-transparent"></div>
            </div>
          )}
          <SidebarItem
            icon={ShieldCheck}
            label="Compliance"
            hasSubmenu
            isOpen={complianceOpen}
            onToggle={() => setComplianceOpen(!complianceOpen)}
            collapsed={collapsed}>

            <SidebarItem
              icon={Factory}
              label="CBAM"
              hasSubmenu
              isOpen={cbamOpen}
              onToggle={() => setCbamOpen(!cbamOpen)}
              collapsed={collapsed}>

              <SidebarItem
                icon={BarChart3}
                label="Importer View"
                path={createPageUrl('CBAM')}
                isActive={isActive(createPageUrl('CBAM'))}
                collapsed={collapsed} />

              <SidebarItem
                icon={Briefcase}
                label="Representative Portal"
                path={createPageUrl('CBAMRepresentative')}
                isActive={isActive(createPageUrl('CBAMRepresentative'))}
                collapsed={collapsed} />

              <SidebarItem
                icon={Globe}
                label="Supplier Portal"
                path={createPageUrl('CBAMSupplierPortal')}
                isActive={isActive(createPageUrl('CBAMSupplierPortal'))}
                collapsed={collapsed} />

              <SidebarItem
                icon={BookOpen}
                label="Knowledge Hub"
                path={createPageUrl('CBAM?tab=knowledge')}
                isActive={isActive(createPageUrl('CBAM?tab=knowledge'))}
                collapsed={collapsed} />

            </SidebarItem>

            <SidebarItem
              icon={TreePine}
              label="EUDR (Deforestation)"
              path={createPageUrl('EUDR')}
              isActive={isActive(createPageUrl('EUDR'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={Droplet}
              label="PFAS"
              hasSubmenu
              isOpen={pfasOpen}
              onToggle={() => setPfasOpen(!pfasOpen)}
              collapsed={collapsed}>

              <SidebarItem
                icon={AlertTriangle}
                label="Risk Monitor"
                path={createPageUrl('PFAS?tab=dashboard')}
                isActive={isActive(createPageUrl('PFAS?tab=dashboard'))}
                collapsed={collapsed} />

              <SidebarItem
                icon={BookOpen}
                label="Knowledge Hub"
                path={createPageUrl('PFAS?tab=knowledge')}
                isActive={isActive(createPageUrl('PFAS?tab=knowledge'))}
                collapsed={collapsed} />

              <SidebarItem
                icon={ShieldCheck}
                label="Evidence Vault"
                path={createPageUrl('PFAS?tab=evidence')}
                isActive={isActive(createPageUrl('PFAS?tab=evidence'))}
                collapsed={collapsed} />

            </SidebarItem>

            <SidebarItem
              icon={Package}
              label="PPWR (Packaging)"
              path={createPageUrl('PPWR')}
              isActive={isActive(createPageUrl('PPWR'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={Activity}
              label="EUDAMED (Medical Devices)"
              path={createPageUrl('EUDAMED')}
              isActive={isActive(createPageUrl('EUDAMED'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={Search}
              label="Regulatory Intelligence"
              path={createPageUrl('RegulatoryIntelligence')}
              isActive={isActive(createPageUrl('RegulatoryIntelligence'))}
              collapsed={collapsed} />

            <SidebarItem
              icon={DollarSign}
              label="Financial Overview"
              path={createPageUrl('CFODashboard')}
              isActive={isActive(createPageUrl('CFODashboard'))}
              collapsed={collapsed} />

          </SidebarItem>
        </div>

        {/* Analytics */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-white/30 to-transparent"></div>
              <span className="text-[10px] font-semibold text-[#86b027] uppercase tracking-widest drop-shadow-[0_0_8px_rgba(134,176,39,0.2)]">Analytics</span>
              <div className="h-px flex-1 bg-gradient-to-l from-white/30 to-transparent"></div>
            </div>
          )}
          <SidebarItem
            icon={BarChart3}
            label="Analytics"
            path={createPageUrl('Analytics')}
            isActive={isActive(createPageUrl('Analytics'))}
            collapsed={collapsed} />
        </div>



        </div>
        </div>

        {/* Footer */}
        <div className="px-3 pt-4 pb-4 space-y-2 relative z-10 bg-gradient-to-t from-slate-950/50 to-transparent backdrop-blur-sm">


          <UserProfileButton collapsed={collapsed} />

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all",
              collapsed ? "px-2 py-2.5" : "px-3 py-2.5"
            )}
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="text-sm font-light ml-3">Logout</span>}
          </Button>
        </div>
        </div>
        );
        }