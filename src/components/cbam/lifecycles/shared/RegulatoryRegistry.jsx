/**
 * CBAM REGULATORY REGISTRY - VERSIONED REGULATORY INPUTS
 * Version: 2.0 - Immutable Regulatory Version Control
 * Compliance: C(2025) 8150, 8151, 8552
 * 
 * SHARED SERVICE: Central registry for all regulatory parameters
 * Domain: Regulatory version management
 * Boundaries: NO calculations, version tracking only
 */

import { base44 } from '@/api/base44Client';
import AuditTrailService from './AuditTrailService';

class RegulatoryRegistry {
  VERSION = '2.0';
  
  /**
   * Get current active regulatory version
   */
  async getCurrentVersion() {
    try {
      // Fetch all versions, sorted by effective date
      const versions = await base44.asServiceRole.entities.CBAMRegulatoryVersion.list();
      
      if (!versions || versions.length === 0) {
        // Return default if no versions exist
        return {
          success: true,
          version: this._getDefaultVersion(),
          source: 'default'
        };
      }
      
      // Find active version (effective_date <= now, status = active)
      const now = new Date();
      const activeVersions = versions.filter(v => 
        v.status === 'active' && 
        new Date(v.effective_date) <= now
      ).sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
      
      if (activeVersions.length === 0) {
        return {
          success: true,
          version: this._getDefaultVersion(),
          source: 'default'
        };
      }
      
      return {
        success: true,
        version: activeVersions[0],
        source: 'registry'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        version: this._getDefaultVersion(),
        source: 'fallback'
      };
    }
  }
  
  /**
   * Register new regulatory version
   * ADMIN ONLY - requires explicit approval
   */
  async registerNewVersion(versionData, adminEmail) {
    try {
      const user = await base44.auth.me();
      
      // ENFORCE: Admin only
      if (user.role !== 'admin') {
        return {
          success: false,
          error: 'Only admins can register regulatory versions'
        };
      }
      
      // Validate required fields
      const required = ['version_id', 'effective_date', 'publication_reference', 'scope_of_change'];
      const missing = required.filter(field => !versionData[field]);
      
      if (missing.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`
        };
      }
      
      // Get current version to supersede
      const current = await this.getCurrentVersion();
      
      // Create new version
      const newVersion = await base44.asServiceRole.entities.CBAMRegulatoryVersion.create({
        ...versionData,
        status: 'pending_activation',
        registered_by: adminEmail || user.email,
        registered_date: new Date().toISOString(),
        superseded_version: current.version?.id || null
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'REGULATORY',
        entity_type: 'CBAMRegulatoryVersion',
        entity_id: newVersion.id,
        action: 'version_registered',
        user_email: user.email,
        details: {
          version_id: newVersion.version_id,
          effective_date: newVersion.effective_date,
          scope: newVersion.scope_of_change,
          supersedes: current.version?.version_id || 'none'
        }
      });
      
      return {
        success: true,
        version: newVersion,
        superseded: current.version
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Activate regulatory version
   * Triggers impact analysis
   */
  async activateVersion(versionId, adminEmail) {
    try {
      const user = await base44.auth.me();
      
      // ENFORCE: Admin only
      if (user.role !== 'admin') {
        return {
          success: false,
          error: 'Only admins can activate regulatory versions'
        };
      }
      
      const versions = await base44.asServiceRole.entities.CBAMRegulatoryVersion.list();
      const version = versions.find(v => v.id === versionId);
      
      if (!version) {
        return { success: false, error: 'Version not found' };
      }
      
      if (version.status === 'active') {
        return { success: false, error: 'Version already active' };
      }
      
      // Get current active version
      const current = await this.getCurrentVersion();
      
      // Deactivate previous version
      if (current.version && current.version.id !== versionId) {
        await base44.asServiceRole.entities.CBAMRegulatoryVersion.update(current.version.id, {
          status: 'superseded',
          superseded_date: new Date().toISOString(),
          superseded_by_version: versionId
        });
      }
      
      // Activate new version
      const activated = await base44.asServiceRole.entities.CBAMRegulatoryVersion.update(versionId, {
        status: 'active',
        activated_by: adminEmail || user.email,
        activated_date: new Date().toISOString()
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'REGULATORY',
        entity_type: 'CBAMRegulatoryVersion',
        entity_id: versionId,
        action: 'version_activated',
        user_email: user.email,
        details: {
          version_id: activated.version_id,
          effective_date: activated.effective_date,
          previous_version: current.version?.version_id || 'none'
        }
      });
      
      return {
        success: true,
        activated: activated,
        previous: current.version
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get version by ID
   */
  async getVersion(versionId) {
    try {
      const versions = await base44.asServiceRole.entities.CBAMRegulatoryVersion.list();
      const version = versions.find(v => v.id === versionId || v.version_id === versionId);
      
      if (!version) {
        return { success: false, error: 'Version not found' };
      }
      
      return { success: true, version };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get version history
   */
  async getVersionHistory() {
    try {
      const versions = await base44.asServiceRole.entities.CBAMRegulatoryVersion.list();
      
      const sorted = versions.sort((a, b) => 
        new Date(b.effective_date) - new Date(a.effective_date)
      );
      
      return { success: true, history: sorted };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Default version (fallback)
   */
  _getDefaultVersion() {
    return {
      version_id: 'CBAM-2026-BASE',
      effective_date: '2026-01-01',
      publication_reference: 'C(2025) 8150, 8151, 8552',
      scope_of_change: 'Initial CBAM definitive regime',
      status: 'active',
      cbam_factors: {
        2026: 0.025,
        2027: 0.05,
        2028: 0.075,
        2029: 0.10,
        2030: 1.0
      },
      default_markups: {
        2026: 10,
        2027: 20,
        2028: 30,
        2029: 30,
        2030: 30
      },
      free_allocation_active: true,
      source: 'system_default'
    };
  }
}

export default new RegulatoryRegistry();