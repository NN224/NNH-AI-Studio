import { z } from 'zod';

// Phone number regex patterns for different countries
const PHONE_PATTERNS = {
  US: /^\+?1?[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
  UK: /^\+?44?[-.\s]?\(?0?\)?[-.\s]?[1-9]\d{1,4}[-.\s]?\d{6,8}$/,
  UAE: /^\+?971?[-.\s]?\(?0?[2-9]\)?[-.\s]?\d{7,8}$/,
  DEFAULT: /^\+?[\d\s\-\(\)\.]{10,20}$/
};

// URL validation pattern
const URL_PATTERN = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

// Business hours validation
const BUSINESS_HOURS_SCHEMA = z.object({
  monday: z.object({
    open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional(),
  tuesday: z.object({
    open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional(),
  wednesday: z.object({
    open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional(),
  thursday: z.object({
    open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional(),
  friday: z.object({
    open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional(),
  saturday: z.object({
    open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional(),
  sunday: z.object({
    open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional()
});

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  score: number; // 0-100
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'critical';
  autoFixable?: boolean;
  suggestedFix?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ValidationSuggestion {
  field: string;
  message: string;
  benefit: string;
  implementation?: () => void;
}

export interface BusinessAttributes {
  // Basic info
  locationName: string;
  shortDescription: string;
  description: string;
  phone: string;
  website: string;
  email?: string;
  
  // Address
  address?: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  
  // Categories and attributes
  categories?: string[];
  features?: {
    amenities?: string[];
    payment_methods?: string[];
    services?: string[];
    atmosphere?: string[];
  };
  
  // Business hours
  businessHours?: Record<string, { open: string; close: string }>;
  
  // Social links
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  
  // Additional attributes
  yearEstablished?: number;
  ownershipType?: string[];
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  serviceArea?: string[];
  languages?: string[];
}

export class BusinessAttributesValidator {
  /**
   * Comprehensive validation of all business attributes
   */
  static validate(attributes: BusinessAttributes, country: string = 'US'): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];
    
    // Required field validations
    this.validateRequiredFields(attributes, errors);
    
    // Format validations
    this.validateFormats(attributes, country, errors, warnings);
    
    // Content validations
    this.validateContent(attributes, errors, warnings, suggestions);
    
    // Business rules validations
    this.validateBusinessRules(attributes, warnings, suggestions);
    
    // Calculate score
    const score = this.calculateScore(errors, warnings, attributes);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score
    };
  }
  
  private static validateRequiredFields(attributes: BusinessAttributes, errors: ValidationError[]): void {
    if (!attributes.locationName?.trim()) {
      errors.push({
        field: 'locationName',
        message: 'Business name is required',
        severity: 'critical'
      });
    }
    
    if (!attributes.shortDescription?.trim()) {
      errors.push({
        field: 'shortDescription',
        message: 'Short description is required',
        severity: 'error'
      });
    }
    
    if (!attributes.phone?.trim()) {
      errors.push({
        field: 'phone',
        message: 'Phone number is required',
        severity: 'error'
      });
    }
    
    if (!attributes.address || !attributes.address.street || !attributes.address.city) {
      errors.push({
        field: 'address',
        message: 'Complete address is required',
        severity: 'error'
      });
    }
  }
  
  private static validateFormats(
    attributes: BusinessAttributes, 
    country: string,
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Phone validation
    if (attributes.phone) {
      const phonePattern = PHONE_PATTERNS[country as keyof typeof PHONE_PATTERNS] || PHONE_PATTERNS.DEFAULT;
      if (!phonePattern.test(attributes.phone)) {
        errors.push({
          field: 'phone',
          message: 'Invalid phone number format',
          severity: 'error',
          autoFixable: true,
          suggestedFix: this.formatPhone(attributes.phone, country)
        });
      }
    }
    
    // Website validation
    if (attributes.website) {
      if (!URL_PATTERN.test(attributes.website)) {
        errors.push({
          field: 'website',
          message: 'Invalid website URL format',
          severity: 'error',
          autoFixable: true,
          suggestedFix: this.formatWebsite(attributes.website)
        });
      }
      
      // HTTPS check
      if (!attributes.website.startsWith('https://')) {
        warnings.push({
          field: 'website',
          message: 'Website should use HTTPS for better security',
          impact: 'medium'
        });
      }
    }
    
    // Email validation
    if (attributes.email && !z.string().email().safeParse(attributes.email).success) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        severity: 'error'
      });
    }
    
    // Business hours validation
    if (attributes.businessHours) {
      try {
        BUSINESS_HOURS_SCHEMA.parse(attributes.businessHours);
      } catch (error) {
        errors.push({
          field: 'businessHours',
          message: 'Invalid business hours format',
          severity: 'error'
        });
      }
    }
    
    // Social links validation
    if (attributes.socialLinks) {
      Object.entries(attributes.socialLinks).forEach(([platform, url]) => {
        if (url && !URL_PATTERN.test(url)) {
          warnings.push({
            field: `socialLinks.${platform}`,
            message: `Invalid ${platform} URL`,
            impact: 'low'
          });
        }
      });
    }
  }
  
  private static validateContent(
    attributes: BusinessAttributes,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[]
  ): void {
    // Name length
    if (attributes.locationName && attributes.locationName.length > 100) {
      errors.push({
        field: 'locationName',
        message: 'Business name is too long (max 100 characters)',
        severity: 'error'
      });
    }
    
    // Description length and quality
    if (attributes.shortDescription) {
      if (attributes.shortDescription.length > 750) {
        errors.push({
          field: 'shortDescription',
          message: 'Short description is too long (max 750 characters)',
          severity: 'error'
        });
      }
      
      if (attributes.shortDescription.length < 50) {
        warnings.push({
          field: 'shortDescription',
          message: 'Short description is too brief. Consider adding more details.',
          impact: 'medium'
        });
      }
      
      // Check for keyword stuffing
      const wordCount = attributes.shortDescription.split(' ').length;
      const uniqueWords = new Set(attributes.shortDescription.toLowerCase().split(' ')).size;
      if (wordCount > 20 && uniqueWords / wordCount < 0.5) {
        warnings.push({
          field: 'shortDescription',
          message: 'Description appears to have repetitive keywords',
          impact: 'high'
        });
      }
    }
    
    // Check for special characters in name
    if (attributes.locationName && /[<>{}\\]/.test(attributes.locationName)) {
      errors.push({
        field: 'locationName',
        message: 'Business name contains invalid characters',
        severity: 'error',
        autoFixable: true,
        suggestedFix: attributes.locationName.replace(/[<>{}\\]/g, '')
      });
    }
    
    // Arabic content suggestions
    const hasArabicName = /[\u0600-\u06FF]/.test(attributes.locationName || '');
    const hasArabicDescription = /[\u0600-\u06FF]/.test(attributes.shortDescription || '');
    
    if (!hasArabicName && !hasArabicDescription) {
      suggestions.push({
        field: 'locationName',
        message: 'Consider adding Arabic translation',
        benefit: 'Improves visibility for Arabic-speaking customers'
      });
    }
    
    // Categories validation
    if (!attributes.categories || attributes.categories.length === 0) {
      warnings.push({
        field: 'categories',
        message: 'No business categories selected',
        impact: 'high'
      });
    } else if (attributes.categories.length > 10) {
      warnings.push({
        field: 'categories',
        message: 'Too many categories selected. Focus on primary categories.',
        impact: 'medium'
      });
    }
  }
  
  private static validateBusinessRules(
    attributes: BusinessAttributes,
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[]
  ): void {
    // Business hours coverage
    if (attributes.businessHours) {
      const daysOpen = Object.keys(attributes.businessHours).length;
      if (daysOpen < 5) {
        warnings.push({
          field: 'businessHours',
          message: 'Business hours not specified for all days',
          impact: 'medium'
        });
      }
    } else {
      warnings.push({
        field: 'businessHours',
        message: 'No business hours specified',
        impact: 'high'
      });
    }
    
    // Features completeness
    if (attributes.features) {
      const totalFeatures = Object.values(attributes.features).flat().length;
      if (totalFeatures < 5) {
        suggestions.push({
          field: 'features',
          message: 'Add more features and amenities',
          benefit: 'Helps customers find you through specific searches'
        });
      }
      
      // Accessibility features
      const amenities = attributes.features.amenities || [];
      if (!amenities.includes('wheelchair_accessible')) {
        suggestions.push({
          field: 'features.amenities',
          message: 'Consider adding wheelchair accessibility information',
          benefit: 'Improves accessibility and inclusivity'
        });
      }
    }
    
    // Price range
    if (!attributes.priceRange) {
      suggestions.push({
        field: 'priceRange',
        message: 'Add price range information',
        benefit: 'Helps customers filter by budget'
      });
    }
    
    // Year established
    if (!attributes.yearEstablished) {
      suggestions.push({
        field: 'yearEstablished',
        message: 'Add year established',
        benefit: 'Shows business longevity and builds trust'
      });
    } else if (attributes.yearEstablished > new Date().getFullYear()) {
      warnings.push({
        field: 'yearEstablished',
        message: 'Year established is in the future',
        impact: 'high'
      });
    }
  }
  
  private static calculateScore(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    attributes: BusinessAttributes
  ): number {
    let score = 100;
    
    // Deduct for errors
    errors.forEach(error => {
      score -= error.severity === 'critical' ? 20 : 10;
    });
    
    // Deduct for warnings
    warnings.forEach(warning => {
      score -= warning.impact === 'high' ? 5 : warning.impact === 'medium' ? 3 : 1;
    });
    
    // Bonus for completeness
    if (attributes.description && attributes.description.length > 100) score += 5;
    if (attributes.businessHours && Object.keys(attributes.businessHours).length >= 7) score += 5;
    if (attributes.features && Object.values(attributes.features).flat().length > 10) score += 5;
    if (attributes.socialLinks && Object.keys(attributes.socialLinks).length > 2) score += 3;
    if (attributes.yearEstablished) score += 2;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private static formatPhone(phone: string, country: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format based on country
    switch (country) {
      case 'US':
        if (digits.length === 10) {
          return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        break;
      case 'UAE':
        if (digits.startsWith('971')) {
          return `+971 ${digits.slice(3, 5)} ${digits.slice(5)}`;
        }
        break;
    }
    
    return phone;
  }
  
  private static formatWebsite(url: string): string {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }
  
  /**
   * Auto-fix common validation issues
   */
  static autoFix(attributes: BusinessAttributes, validationResult: ValidationResult): BusinessAttributes {
    const fixed = { ...attributes };
    
    validationResult.errors.forEach(error => {
      if (error.autoFixable && error.suggestedFix !== undefined) {
        switch (error.field) {
          case 'phone':
            fixed.phone = error.suggestedFix;
            break;
          case 'website':
            fixed.website = error.suggestedFix;
            break;
          case 'locationName':
            fixed.locationName = error.suggestedFix;
            break;
        }
      }
    });
    
    return fixed;
  }
}
