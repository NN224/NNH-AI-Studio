/**
 * Shared validation logic for post creation and editing
 */

export interface PostFormData {
  locationId?: string;
  title?: string;
  description: string;
  mediaUrl?: string;
  cta?: string;
  ctaUrl?: string;
  scheduledAt?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePostForm(data: PostFormData, requireLocation = true): ValidationResult {
  // Location validation
  if (requireLocation && !data.locationId) {
    return {
      isValid: false,
      error: 'Please select a location',
    };
  }

  // Description validation
  if (!data.description || data.description.trim().length === 0) {
    return {
      isValid: false,
      error: 'Please enter a description for your post',
    };
  }

  if (data.description.length > 1500) {
    return {
      isValid: false,
      error: 'Description is too long. Maximum 1500 characters.',
    };
  }

  // CTA validation - CALL doesn't require URL
  if (data.cta && data.cta !== 'CALL' && !data.ctaUrl) {
    return {
      isValid: false,
      error: 'Please provide a URL for your call-to-action',
    };
  }

  // URL validation
  if (data.ctaUrl && !data.ctaUrl.trim().match(/^https?:\/\/.+/)) {
    return {
      isValid: false,
      error: 'Please enter a valid URL starting with http:// or https://',
    };
  }

  if (data.mediaUrl && !data.mediaUrl.trim().match(/^https?:\/\/.+/)) {
    return {
      isValid: false,
      error: 'Please enter a valid media URL starting with http:// or https://',
    };
  }

  // Schedule validation
  if (data.scheduledAt) {
    const scheduledDate = new Date(data.scheduledAt);
    const now = new Date();
    
    if (isNaN(scheduledDate.getTime())) {
      return {
        isValid: false,
        error: 'Invalid schedule date format',
      };
    }

    if (scheduledDate <= now) {
      return {
        isValid: false,
        error: 'Scheduled time must be in the future',
      };
    }
  }

  return {
    isValid: true,
  };
}

export const CTA_OPTIONS = [
  { value: 'BOOK', label: 'Book' },
  { value: 'ORDER', label: 'Order' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'CALL', label: 'Call' },
  { value: 'SHOP', label: 'Shop' },
] as const;

export const POST_TYPES = [
  { key: 'whats_new', label: "What's New" },
  { key: 'event', label: 'Event' },
  { key: 'offer', label: 'Offer' },
  { key: 'product', label: 'Product' },
] as const;
