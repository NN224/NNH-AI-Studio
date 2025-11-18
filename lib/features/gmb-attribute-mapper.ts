/**
 * Maps Google My Business attribute names to our feature keys
 * GMB returns: "attributes/has_seating_rooftop"
 * We need: "rooftop_seating"
 */

export const GMB_TO_FEATURE_KEY_MAP: Record<string, string> = {
  // Amenities - Seating (actual GMB attribute names)
  'attributes/has_seating_rooftop': 'rooftop_seating',
  'attributes/has_seating_outdoors': 'outdoor_seating',
  'attributes/has_seating_outdoor': 'outdoor_seating',
  'attributes/has_seating_indoor': 'indoor_seating',
  
  // Amenities - Accessibility (actual GMB attribute names)
  'attributes/has_wheelchair_accessible_entrance': 'wheelchair_accessible',
  'attributes/has_wheelchair_accessible_parking': 'wheelchair_accessible',
  'attributes/has_wheelchair_accessible_restroom': 'wheelchair_accessible',
  'attributes/has_wheelchair_accessible_seating': 'wheelchair_accessible',
  'attributes/wheelchair_accessible_entrance': 'wheelchair_accessible',
  'attributes/wheelchair_accessible_parking': 'wheelchair_accessible',
  'attributes/wheelchair_accessible_restroom': 'wheelchair_accessible',
  'attributes/wheelchair_accessible_seating': 'wheelchair_accessible',
  'attributes/has_hearing_loop': 'wheelchair_accessible',
  
  // Amenities - Parking (actual GMB attribute names)
  'attributes/has_onsite_parking': 'parking',
  'attributes/has_parking_lot': 'parking',
  'attributes/has_parking_lot_free': 'parking',
  'attributes/has_parking_lot_paid': 'parking',
  'attributes/has_parking_garage_free': 'parking',
  'attributes/has_parking_garage_paid': 'parking',
  'attributes/has_parking_street_free': 'parking',
  'attributes/has_parking_street_paid': 'parking',
  'attributes/has_parking_valet': 'valet_parking',
  'attributes/has_valet_parking': 'valet_parking',
  'attributes/has_parking_garage': 'parking',
  'attributes/has_parking_street': 'parking',
  'attributes/has_free_parking': 'parking',
  
  // Amenities - General (actual GMB attribute names)
  'attributes/wi_fi': 'wifi_free', // Special: value = "free_wi_fi" or "paid_wi_fi"
  'attributes/has_wifi': 'wifi_free',
  'attributes/has_free_wifi': 'wifi_free',
  'attributes/has_air_conditioning': 'air_conditioning',
  'attributes/has_coat_check': 'coat_check',
  'attributes/has_smoking_area': 'smoking_area',
  
  // Payment Methods (actual GMB attribute names)
  'attributes/pay_credit_card': 'credit_cards',
  'attributes/pay_debit_card': 'credit_cards',
  'attributes/accepts_credit_cards': 'credit_cards',
  'attributes/accepts_debit_cards': 'credit_cards',
  'attributes/requires_cash_only': 'cash',
  'attributes/accepts_cash_only': 'cash',
  'attributes/pay_mobile_nfc': 'mobile_payment',
  'attributes/accepts_nfc': 'mobile_payment',
  'attributes/accepts_android_pay': 'mobile_payment',
  'attributes/accepts_apple_pay': 'mobile_payment',
  'attributes/pay_check': 'cheque',
  
  // Services - Restaurant (actual GMB attribute names)
  'attributes/serves_dine_in': 'dine_in',
  'attributes/has_dine_in': 'dine_in',
  'attributes/has_takeout': 'takeout',
  'attributes/has_delivery': 'delivery',
  'attributes/has_no_contact_delivery': 'delivery',
  'attributes/accepts_reservations': 'reservations',
  'attributes/requires_reservations': 'reservations',
  'attributes/has_reservations': 'reservations',
  'attributes/has_table_service': 'table_service',
  'attributes/has_bottle_service': 'bottle_service',
  
  // Services - General (actual GMB attribute names)
  'attributes/has_onsite_services': 'online_service',
  'attributes/has_online_booking': 'online_booking',
  'attributes/appointment_required': 'appointment_required',
  'attributes/walk_ins_welcome': 'walk_ins',
  
  // Atmosphere (actual GMB attribute names)
  'attributes/welcomes_children': 'family_friendly',
  'attributes/is_family_friendly': 'family_friendly',
  'attributes/good_for_groups': 'groups',
  'attributes/good_for_kids': 'kids_area',
  'attributes/has_live_music': 'live_music',
  'attributes/has_live_performances': 'live_music',
  'attributes/has_dj': 'dj',
  'attributes/has_dancing': 'dancing',
  'attributes/has_dance_floor': 'dancing',
  'attributes/has_karaoke_nights': 'live_music',
  'attributes/has_dress_code': 'dress_code',
  'attributes/has_vip_area': 'vip_area',
  'attributes/is_lgbt_friendly': 'lgbt_friendly',
  'attributes/quiet_environment': 'quiet',
  'attributes/is_casual': 'casual',
  'attributes/is_professional': 'professional',
  'attributes/is_luxury': 'luxury',
  'attributes/is_budget_friendly': 'budget_friendly',
  
  // Dining Options (actual GMB attribute names)
  'attributes/serves_breakfast': 'breakfast',
  'attributes/has_breakfast': 'breakfast',
  'attributes/serves_brunch': 'brunch',
  'attributes/has_brunch': 'brunch',
  'attributes/serves_lunch': 'lunch',
  'attributes/has_lunch': 'lunch',
  'attributes/serves_dinner': 'dinner',
  'attributes/has_dinner': 'dinner',
  'attributes/serves_late_night': 'late_night',
  'attributes/has_late_night': 'late_night',
  'attributes/serves_food': 'dine_in',
  'attributes/serves_happy_hour_food': 'happy_hour',
  
  // Drinks (actual GMB attribute names)
  'attributes/serves_beer': 'beer',
  'attributes/serves_wine': 'wine',
  'attributes/serves_cocktails': 'cocktails',
  'attributes/serves_alcohol': 'full_bar',
  'attributes/has_happy_hour': 'happy_hour',
  'attributes/has_full_bar': 'full_bar',
  
  // Special Features
  'attributes/has_tv': 'tv',
  'attributes/has_sports_on_tv': 'sports',
  'attributes/has_pool_table': 'pool_table',
  'attributes/has_outdoor_bar': 'outdoor_bar',
  'attributes/has_private_rooms': 'private_rooms',
  
  // Retail
  'attributes/in_store_shopping': 'in_store_shopping',
  'attributes/online_shopping': 'online_shopping',
  'attributes/has_gift_wrapping': 'gift_wrapping',
  'attributes/accepts_installments': 'installments',
  'attributes/has_fitting_rooms': 'fitting_rooms',
  
  // Beauty & Wellness
  'attributes/appointment_only': 'appointment_only',
  'attributes/has_waiting_area': 'waiting_area',
  'attributes/women_only': 'women_only',
  'attributes/men_only': 'men_only',
  'attributes/is_unisex': 'unisex',
  'attributes/home_service_available': 'home_service',
  
  // Professional Services
  'attributes/has_meeting_rooms': 'meeting_rooms',
  'attributes/accepts_bank_transfer': 'bank_transfer',
  'attributes/accepts_cheque': 'cheque',
  'attributes/free_consultation': 'consultation',
  'attributes/has_emergency_service': 'emergency_service',
  'attributes/is_confidential': 'confidential',
  
  // Kids & Family
  'attributes/has_kids_area': 'kids_area',
  'attributes/kids_friendly': 'family_friendly',
}

/**
 * Convert GMB attribute name to feature key
 * @param gmbAttributeName - e.g. "attributes/has_seating_rooftop"
 * @returns feature key - e.g. "rooftop_seating" or null if no mapping
 */
export function mapGMBAttributeToFeatureKey(gmbAttributeName: string): string | null {
  // Direct mapping
  if (GMB_TO_FEATURE_KEY_MAP[gmbAttributeName]) {
    return GMB_TO_FEATURE_KEY_MAP[gmbAttributeName]
  }
  
  // Try to extract from "attributes/xxx" pattern
  const match = gmbAttributeName.match(/^attributes\/(.+)$/)
  if (!match) return null
  
  const rawKey = match[1]
  
  // Remove common prefixes
  const cleanKey = rawKey
    .replace(/^has_/, '')
    .replace(/^is_/, '')
    .replace(/^accepts_/, '')
    .replace(/^serves_/, '')
    .replace(/^good_for_/, '')
  
  // Return cleaned key (might not match exactly but worth trying)
  return cleanKey
}

/**
 * Extract feature keys from GMB attributes array
 * @param attributes - Array of GMB attribute objects
 * @returns Array of feature keys that can be looked up in FEATURE_CATALOG
 */
export function extractFeatureKeysFromGMBAttributes(attributes: any[]): string[] {
  const featureKeys = new Set<string>()
  
  for (const attr of attributes) {
    if (!attr || typeof attr !== 'object') continue
    
    const attrName = attr.name
    if (!attrName || typeof attrName !== 'string') continue
    
    // Special handling for wi_fi attribute (value is a string, not boolean)
    if (attrName === 'attributes/wi_fi') {
      const wifiValue = Array.isArray(attr.values) ? attr.values[0] : attr.values
      if (wifiValue === 'free_wi_fi' || wifiValue === 'paid_wi_fi') {
        featureKeys.add('wifi_free')
      }
      continue
    }
    
    // Check if this is a boolean attribute set to true
    const isTrueValue = Array.isArray(attr.values) && attr.values[0] === true
    
    // Only add attributes that are explicitly enabled (true)
    if (!isTrueValue) continue
    
    // Map GMB attribute to feature key
    const featureKey = mapGMBAttributeToFeatureKey(attrName)
    if (featureKey) {
      featureKeys.add(featureKey)
    }
  }
  
  return Array.from(featureKeys)
}

