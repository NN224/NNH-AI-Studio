import type { FeatureCategoryKey } from '@/types/features';

export interface EssentialFeature {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly nameAr: string;
  readonly icon: string;
  readonly importance: 'critical' | 'important' | 'nice';
}

export type EssentialFeatureCatalog = Record<FeatureCategoryKey, readonly EssentialFeature[]>;

// Simplified features for Night Clubs, Bars, and Entertainment venues
export const ESSENTIAL_FEATURES: EssentialFeatureCatalog = {
  amenities: [
    { id: '1', key: 'wifi_free', name: 'Free WiFi', nameAr: 'واي فاي مجاني', icon: '📶', importance: 'important' },
    { id: '2', key: 'wheelchair_accessible', name: 'Wheelchair Accessible', nameAr: 'مدخل لذوي الاحتياجات', icon: '♿', importance: 'critical' },
    { id: '3', key: 'parking', name: 'Parking', nameAr: 'موقف سيارات', icon: '🅿️', importance: 'critical' },
    { id: '4', key: 'valet_parking', name: 'Valet Parking', nameAr: 'خدمة صف السيارات', icon: '🚗', importance: 'important' },
    { id: '5', key: 'outdoor_seating', name: 'Outdoor Area', nameAr: 'منطقة خارجية', icon: '🌳', importance: 'nice' },
    { id: '6', key: 'air_conditioning', name: 'Air Conditioning', nameAr: 'تكييف', icon: '❄️', importance: 'critical' },
    { id: '7', key: 'coat_check', name: 'Coat Check', nameAr: 'حفظ المعاطف', icon: '🧥', importance: 'nice' },
    { id: '8', key: 'smoking_area', name: 'Smoking Area', nameAr: 'منطقة تدخين', icon: '🚬', importance: 'important' },
  ],
  payment_methods: [
    { id: '9', key: 'credit_cards', name: 'Credit Cards', nameAr: 'بطاقات ائتمان', icon: '💳', importance: 'critical' },
    { id: '10', key: 'cash', name: 'Cash', nameAr: 'نقدي', icon: '💵', importance: 'critical' },
    { id: '11', key: 'mobile_payment', name: 'Apple/Google Pay', nameAr: 'دفع رقمي', icon: '📱', importance: 'important' },
  ],
  services: [
    { id: '12', key: 'table_service', name: 'Table Service', nameAr: 'خدمة طاولات', icon: '🍽️', importance: 'critical' },
    { id: '13', key: 'reservations', name: 'Reservations', nameAr: 'حجوزات', icon: '📅', importance: 'important' },
    { id: '14', key: 'bottle_service', name: 'Bottle Service', nameAr: 'خدمة زجاجات', icon: '🍾', importance: 'important' },
    { id: '15', key: 'private_events', name: 'Private Events', nameAr: 'فعاليات خاصة', icon: '🎉', importance: 'nice' },
    { id: '16', key: 'vip_area', name: 'VIP Area', nameAr: 'منطقة VIP', icon: '👑', importance: 'important' },
  ],
  atmosphere: [
    { id: '17', key: 'live_music', name: 'Live Music', nameAr: 'موسيقى حية', icon: '🎵', importance: 'critical' },
    { id: '18', key: 'dj', name: 'DJ', nameAr: 'دي جي', icon: '🎧', importance: 'critical' },
    { id: '19', key: 'dancing', name: 'Dance Floor', nameAr: 'حلبة رقص', icon: '💃', importance: 'critical' },
    { id: '20', key: 'age_21_plus', name: '21+ Only', nameAr: '21+ فقط', icon: '🔞', importance: 'critical' },
    { id: '21', key: 'dress_code', name: 'Dress Code', nameAr: 'قواعد اللباس', icon: '👔', importance: 'important' },
    { id: '22', key: 'ladies_night', name: 'Ladies Night', nameAr: 'ليلة السيدات', icon: '💃', importance: 'nice' },
  ],
};

// Get only essential features from full list
export function getEssentialFeatures(category: FeatureCategoryKey): readonly EssentialFeature[] {
  return ESSENTIAL_FEATURES[category] || [];
}

// Check if a feature is essential
export function isEssentialFeature(key: string): boolean {
  return Object.values(ESSENTIAL_FEATURES).some(
    features => features.some(f => f.key === key)
  );
}

// Get importance level
export function getFeatureImportance(key: string): 'critical' | 'important' | 'nice' | null {
  for (const features of Object.values(ESSENTIAL_FEATURES)) {
    const feature = features.find(f => f.key === key);
    if (feature) return feature.importance;
  }
  return null;
}
