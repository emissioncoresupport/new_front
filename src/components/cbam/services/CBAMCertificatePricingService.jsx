/**
 * CBAM Certificate Pricing Service
 * Per C(2025) 8560 - Commission Decision on certificate pricing
 * 
 * 2026: Quarterly average of ETS auction prices
 * 2027+: Weekly average of ETS auction prices
 */

export class CBAMCertificatePricingService {
  
  /**
   * Get current certificate price for a reporting period
   * @param {number} year - Reporting year
   * @param {number} quarter - Quarter (1-4) for 2026, or week number for 2027+
   * @returns {Promise<Object>} Price info with period, price, and source
   */
  static async getCertificatePrice(year, quarter = null) {
    const isQuarterly = year === 2026;
    
    if (isQuarterly && !quarter) {
      throw new Error('Quarter required for 2026 pricing');
    }
    
    // Determine pricing period
    const period = isQuarterly ? `Q${quarter}-${year}` : `W${quarter || 1}-${year}`;
    const periodType = isQuarterly ? 'quarterly' : 'weekly';
    
    // Fetch latest ETS price (would call actual ETS API in production)
    const etsPrice = await this.fetchETSPrice(year, quarter, periodType);
    
    return {
      year,
      period,
      period_type: periodType,
      price_per_certificate: etsPrice,
      currency: 'EUR',
      effective_from: this.getPeriodStart(year, quarter, periodType),
      effective_until: this.getPeriodEnd(year, quarter, periodType),
      regulation: 'C(2025) 8560'
    };
  }
  
  /**
   * Fetch ETS auction price
   * In production: Call European Energy Exchange (EEX) API
   */
  static async fetchETSPrice(year, period, periodType) {
    // Mock data - in production would fetch from EEX API
    const mockPrices = {
      2026: { Q1: 85, Q2: 88, Q3: 92, Q4: 95 },
      2027: { default: 98 }, // Weekly prices would vary
      2028: { default: 105 },
      2029: { default: 112 }
    };
    
    if (periodType === 'quarterly' && mockPrices[year]) {
      return mockPrices[year][`Q${period}`] || mockPrices[year].Q1;
    }
    
    return mockPrices[year]?.default || 90;
  }
  
  /**
   * Get period start date
   */
  static getPeriodStart(year, period, type) {
    if (type === 'quarterly') {
      const quarterStarts = {
        1: `${year}-01-01`,
        2: `${year}-04-01`,
        3: `${year}-07-01`,
        4: `${year}-10-01`
      };
      return quarterStarts[period];
    }
    
    // Weekly - calculate from week number
    const startDate = new Date(year, 0, 1);
    startDate.setDate(startDate.getDate() + (period - 1) * 7);
    return startDate.toISOString().split('T')[0];
  }
  
  /**
   * Get period end date
   */
  static getPeriodEnd(year, period, type) {
    if (type === 'quarterly') {
      const quarterEnds = {
        1: `${year}-03-31`,
        2: `${year}-06-30`,
        3: `${year}-09-30`,
        4: `${year}-12-31`
      };
      return quarterEnds[period];
    }
    
    // Weekly - 7 days after start
    const startDate = new Date(year, 0, 1);
    startDate.setDate(startDate.getDate() + (period - 1) * 7 + 6);
    return startDate.toISOString().split('T')[0];
  }
  
  /**
   * Calculate total cost for certificates
   */
  static calculateCost(certificatesRequired, pricePerCert) {
    return certificatesRequired * pricePerCert;
  }
  
  /**
   * Get pricing period info for display
   */
  static getPricingPeriodInfo(year) {
    if (year === 2026) {
      return {
        type: 'quarterly',
        description: 'Quarterly average ETS price per C(2025) 8560',
        periods: ['Q1', 'Q2', 'Q3', 'Q4']
      };
    }
    
    return {
      type: 'weekly',
      description: 'Weekly average ETS price per C(2025) 8560',
      periods: Array.from({ length: 52 }, (_, i) => `W${i + 1}`)
    };
  }
  
  /**
   * Get current period based on date
   */
  static getCurrentPeriod(year, date = new Date()) {
    if (year === 2026) {
      const month = date.getMonth();
      if (month < 3) return 1;
      if (month < 6) return 2;
      if (month < 9) return 3;
      return 4;
    }
    
    // Calculate week number
    const startOfYear = new Date(year, 0, 1);
    const diff = date - startOfYear;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  }
}

export default CBAMCertificatePricingService;