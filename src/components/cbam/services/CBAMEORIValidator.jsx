/**
 * CBAM EORI Validator
 * Validates Economic Operator Registration and Identification numbers
 * Per Art. 16(1) Reg 2023/956 - EORI MANDATORY
 */

export class CBAMEORIValidator {
  
  /**
   * Validate EORI format and structure
   * Format: 2-letter country code + max 15 alphanumeric
   * Example: NL123456789012, DE987654321, FR1234567890123
   */
  static validateFormat(eori) {
    if (!eori) {
      return {
        valid: false,
        error: 'EORI number REQUIRED',
        regulation: 'Art. 16(1) Reg 2023/956'
      };
    }
    
    // Remove spaces
    const cleanEORI = eori.replace(/\s/g, '').toUpperCase();
    
    // Format check: 2 letters + up to 15 alphanumeric
    const eoriPattern = /^[A-Z]{2}[A-Z0-9]{1,15}$/;
    
    if (!eoriPattern.test(cleanEORI)) {
      return {
        valid: false,
        error: 'Invalid EORI format. Expected: 2-letter country code + up to 15 alphanumeric characters',
        regulation: 'Art. 16(1) Reg 2023/956',
        example: 'NL123456789012'
      };
    }
    
    const countryCode = cleanEORI.substring(0, 2);
    const identifier = cleanEORI.substring(2);
    
    // Validate country code is EU member state
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 
      'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 
      'RO', 'SK', 'SI', 'ES', 'SE'
    ];
    
    if (!euCountries.includes(countryCode)) {
      return {
        valid: false,
        error: 'Country code must be EU member state',
        regulation: 'Art. 16(1) Reg 2023/956',
        country_code: countryCode
      };
    }
    
    // Country-specific validation
    const countryValidation = this.validateCountrySpecific(countryCode, identifier);
    
    if (!countryValidation.valid) {
      return countryValidation;
    }
    
    return {
      valid: true,
      eori: cleanEORI,
      country_code: countryCode,
      identifier: identifier,
      regulation: 'Art. 16(1) Reg 2023/956'
    };
  }
  
  /**
   * Country-specific EORI validation
   */
  static validateCountrySpecific(countryCode, identifier) {
    const rules = {
      // Netherlands: NL + 9 or 12 digits
      'NL': {
        pattern: /^\d{9}(\d{3})?$/,
        message: '9 or 12 digits required for Netherlands'
      },
      // Germany: DE + 10 digits
      'DE': {
        pattern: /^\d{10}$/,
        message: '10 digits required for Germany'
      },
      // France: FR + 2 letters + 9 digits
      'FR': {
        pattern: /^[A-Z]{2}\d{9}$/,
        message: '2 letters + 9 digits required for France'
      },
      // Belgium: BE + 10 digits
      'BE': {
        pattern: /^\d{10}$/,
        message: '10 digits required for Belgium'
      },
      // Italy: IT + 11 digits
      'IT': {
        pattern: /^\d{11}$/,
        message: '11 digits required for Italy'
      },
      // Spain: ES + 1 letter + 7 digits + 1 letter OR 8 digits + 1 letter
      'ES': {
        pattern: /^[A-Z]\d{7}[A-Z]$|^\d{8}[A-Z]$/,
        message: 'Format: X1234567Y or 12345678Z for Spain'
      }
    };
    
    const rule = rules[countryCode];
    
    if (rule && !rule.pattern.test(identifier)) {
      return {
        valid: false,
        error: rule.message,
        country_code: countryCode
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Check EORI checksum (for countries that use it)
   */
  static validateChecksum(eori, countryCode) {
    // Implement country-specific checksum algorithms
    // This is a placeholder - real implementation would need specific algorithms
    
    if (countryCode === 'NL') {
      // Netherlands uses MOD11 checksum
      return this.validateNLChecksum(eori);
    }
    
    return { valid: true, message: 'Checksum not validated for this country' };
  }
  
  /**
   * Netherlands MOD11 checksum validation
   */
  static validateNLChecksum(identifier) {
    if (identifier.length !== 9 && identifier.length !== 12) {
      return { valid: false, error: 'Invalid length for NL EORI' };
    }
    
    // Use first 9 digits for checksum
    const digits = identifier.substring(0, 9);
    let sum = 0;
    
    for (let i = 0; i < 8; i++) {
      sum += parseInt(digits[i]) * (9 - i);
    }
    
    const checkDigit = (11 - (sum % 11)) % 11;
    const expectedCheckDigit = checkDigit === 10 ? 0 : checkDigit;
    
    if (parseInt(digits[8]) !== expectedCheckDigit) {
      return {
        valid: false,
        error: 'Invalid checksum',
        expected: expectedCheckDigit,
        actual: parseInt(digits[8])
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate EORI for CBAM declarant
   */
  static validateForCBAM(eori, memberState) {
    const formatValidation = this.validateFormat(eori);
    
    if (!formatValidation.valid) {
      return formatValidation;
    }
    
    // Check if EORI country matches member state
    if (memberState && formatValidation.country_code !== memberState) {
      return {
        valid: false,
        error: 'EORI country code must match member state of declaration',
        eori_country: formatValidation.country_code,
        member_state: memberState,
        regulation: 'Art. 16(1) Reg 2023/956'
      };
    }
    
    return formatValidation;
  }
  
  /**
   * Batch validation
   */
  static validateBatch(entries) {
    const results = [];
    const errors = [];
    
    for (const entry of entries) {
      const validation = this.validateFormat(entry.eori_number);
      
      if (!validation.valid) {
        errors.push({
          entry_id: entry.id,
          cn_code: entry.cn_code,
          eori: entry.eori_number,
          error: validation.error
        });
      }
      
      results.push({
        entry_id: entry.id,
        ...validation
      });
    }
    
    return {
      results,
      summary: {
        total: entries.length,
        valid: results.filter(r => r.valid).length,
        invalid: errors.length,
        errors
      }
    };
  }
  
  /**
   * Generate EORI validation report
   */
  static generateValidationReport(entries) {
    const batch = this.validateBatch(entries);
    
    // Group errors by type
    const errorsByType = {};
    for (const error of batch.summary.errors) {
      const type = error.error;
      if (!errorsByType[type]) {
        errorsByType[type] = [];
      }
      errorsByType[type].push(error);
    }
    
    return {
      ...batch,
      errors_by_type: errorsByType,
      compliance_rate: batch.summary.total > 0 
        ? (batch.summary.valid / batch.summary.total) * 100 
        : 0,
      regulation: 'Art. 16(1) Reg 2023/956'
    };
  }
}

export default CBAMEORIValidator;