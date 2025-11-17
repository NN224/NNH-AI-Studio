import type { FeatureCategoryKey } from '@/types/features';
import type { EssentialFeature, EssentialFeatureCatalog } from './essential-features';

// Industry-specific feature sets
export const INDUSTRY_FEATURES: Record<string, EssentialFeatureCatalog> = {
  // Restaurants & Food
  restaurant: {
    amenities: [
      { id: '1', key: 'wifi_free', name: 'Free WiFi', nameAr: 'واي فاي مجاني', icon: '📶', importance: 'important' },
      { id: '2', key: 'wheelchair_accessible', name: 'Wheelchair Accessible', nameAr: 'مدخل لذوي الاحتياجات', icon: '♿', importance: 'critical' },
      { id: '3', key: 'parking', name: 'Parking', nameAr: 'موقف سيارات', icon: '🅿️', importance: 'important' },
      { id: '4', key: 'outdoor_seating', name: 'Outdoor Seating', nameAr: 'جلسات خارجية', icon: '🌳', importance: 'nice' },
      { id: '5', key: 'air_conditioning', name: 'Air Conditioning', nameAr: 'تكييف', icon: '❄️', importance: 'critical' },
      { id: '6', key: 'kids_area', name: 'Kids Area', nameAr: 'منطقة أطفال', icon: '👶', importance: 'nice' },
    ],
    payment_methods: [
      { id: '7', key: 'credit_cards', name: 'Credit Cards', nameAr: 'بطاقات ائتمان', icon: '💳', importance: 'critical' },
      { id: '8', key: 'cash', name: 'Cash', nameAr: 'نقدي', icon: '💵', importance: 'critical' },
      { id: '9', key: 'mobile_payment', name: 'Digital Payment', nameAr: 'دفع رقمي', icon: '📱', importance: 'important' },
    ],
    services: [
      { id: '10', key: 'dine_in', name: 'Dine-in', nameAr: 'تناول داخلي', icon: '🍽️', importance: 'critical' },
      { id: '11', key: 'takeout', name: 'Takeout', nameAr: 'سفري', icon: '🥡', importance: 'important' },
      { id: '12', key: 'delivery', name: 'Delivery', nameAr: 'توصيل', icon: '🚴', importance: 'important' },
      { id: '13', key: 'reservations', name: 'Reservations', nameAr: 'حجوزات', icon: '📅', importance: 'nice' },
    ],
    atmosphere: [
      { id: '14', key: 'family_friendly', name: 'Family Friendly', nameAr: 'مناسب للعائلات', icon: '👨‍👩‍👧', importance: 'important' },
      { id: '15', key: 'groups', name: 'Good for Groups', nameAr: 'مناسب للمجموعات', icon: '👥', importance: 'important' },
      { id: '16', key: 'quiet', name: 'Quiet', nameAr: 'هادئ', icon: '🤫', importance: 'nice' },
      { id: '17', key: 'casual', name: 'Casual', nameAr: 'غير رسمي', icon: '👕', importance: 'nice' },
    ],
  },

  // Beauty & Wellness
  salon: {
    amenities: [
      { id: '1', key: 'wifi_free', name: 'Free WiFi', nameAr: 'واي فاي مجاني', icon: '📶', importance: 'nice' },
      { id: '2', key: 'wheelchair_accessible', name: 'Wheelchair Accessible', nameAr: 'مدخل لذوي الاحتياجات', icon: '♿', importance: 'critical' },
      { id: '3', key: 'parking', name: 'Parking', nameAr: 'موقف سيارات', icon: '🅿️', importance: 'important' },
      { id: '4', key: 'air_conditioning', name: 'Air Conditioning', nameAr: 'تكييف', icon: '❄️', importance: 'critical' },
      { id: '5', key: 'waiting_area', name: 'Waiting Area', nameAr: 'منطقة انتظار', icon: '🪑', importance: 'important' },
    ],
    payment_methods: [
      { id: '6', key: 'credit_cards', name: 'Credit Cards', nameAr: 'بطاقات ائتمان', icon: '💳', importance: 'critical' },
      { id: '7', key: 'cash', name: 'Cash', nameAr: 'نقدي', icon: '💵', importance: 'critical' },
      { id: '8', key: 'mobile_payment', name: 'Digital Payment', nameAr: 'دفع رقمي', icon: '📱', importance: 'important' },
    ],
    services: [
      { id: '9', key: 'appointment_only', name: 'By Appointment', nameAr: 'بالموعد فقط', icon: '📅', importance: 'critical' },
      { id: '10', key: 'walk_ins', name: 'Walk-ins Welcome', nameAr: 'بدون موعد', icon: '🚶', importance: 'important' },
      { id: '11', key: 'online_booking', name: 'Online Booking', nameAr: 'حجز أونلاين', icon: '💻', importance: 'important' },
      { id: '12', key: 'home_service', name: 'Home Service', nameAr: 'خدمة منزلية', icon: '🏠', importance: 'nice' },
    ],
    atmosphere: [
      { id: '13', key: 'women_only', name: 'Women Only', nameAr: 'نساء فقط', icon: '👩', importance: 'critical' },
      { id: '14', key: 'men_only', name: 'Men Only', nameAr: 'رجال فقط', icon: '👨', importance: 'critical' },
      { id: '15', key: 'unisex', name: 'Unisex', nameAr: 'مختلط', icon: '👥', importance: 'critical' },
      { id: '16', key: 'luxury', name: 'Luxury', nameAr: 'فاخر', icon: '💎', importance: 'nice' },
    ],
  },

  // Professional Services
  office: {
    amenities: [
      { id: '1', key: 'wifi_free', name: 'Free WiFi', nameAr: 'واي فاي مجاني', icon: '📶', importance: 'critical' },
      { id: '2', key: 'wheelchair_accessible', name: 'Wheelchair Accessible', nameAr: 'مدخل لذوي الاحتياجات', icon: '♿', importance: 'critical' },
      { id: '3', key: 'parking', name: 'Parking', nameAr: 'موقف سيارات', icon: '🅿️', importance: 'important' },
      { id: '4', key: 'air_conditioning', name: 'Air Conditioning', nameAr: 'تكييف', icon: '❄️', importance: 'critical' },
      { id: '5', key: 'meeting_rooms', name: 'Meeting Rooms', nameAr: 'قاعات اجتماعات', icon: '🏢', importance: 'important' },
    ],
    payment_methods: [
      { id: '6', key: 'credit_cards', name: 'Credit Cards', nameAr: 'بطاقات ائتمان', icon: '💳', importance: 'critical' },
      { id: '7', key: 'bank_transfer', name: 'Bank Transfer', nameAr: 'حوالة بنكية', icon: '🏦', importance: 'important' },
      { id: '8', key: 'cheque', name: 'Cheque', nameAr: 'شيك', icon: '📄', importance: 'nice' },
    ],
    services: [
      { id: '9', key: 'appointment_required', name: 'Appointment Required', nameAr: 'يتطلب موعد', icon: '📅', importance: 'critical' },
      { id: '10', key: 'consultation', name: 'Free Consultation', nameAr: 'استشارة مجانية', icon: '💬', importance: 'nice' },
      { id: '11', key: 'online_service', name: 'Online Services', nameAr: 'خدمات أونلاين', icon: '💻', importance: 'important' },
      { id: '12', key: 'emergency_service', name: '24/7 Emergency', nameAr: 'طوارئ 24/7', icon: '🚨', importance: 'nice' },
    ],
    atmosphere: [
      { id: '13', key: 'professional', name: 'Professional', nameAr: 'مهني', icon: '👔', importance: 'critical' },
      { id: '14', key: 'confidential', name: 'Confidential', nameAr: 'سري', icon: '🔒', importance: 'critical' },
      { id: '15', key: 'quiet', name: 'Quiet Environment', nameAr: 'بيئة هادئة', icon: '🤫', importance: 'important' },
    ],
  },

  // Retail & Shopping
  retail: {
    amenities: [
      { id: '1', key: 'wifi_free', name: 'Free WiFi', nameAr: 'واي فاي مجاني', icon: '📶', importance: 'nice' },
      { id: '2', key: 'wheelchair_accessible', name: 'Wheelchair Accessible', nameAr: 'مدخل لذوي الاحتياجات', icon: '♿', importance: 'critical' },
      { id: '3', key: 'parking', name: 'Parking', nameAr: 'موقف سيارات', icon: '🅿️', importance: 'important' },
      { id: '4', key: 'air_conditioning', name: 'Air Conditioning', nameAr: 'تكييف', icon: '❄️', importance: 'critical' },
      { id: '5', key: 'fitting_rooms', name: 'Fitting Rooms', nameAr: 'غرف قياس', icon: '👗', importance: 'important' },
    ],
    payment_methods: [
      { id: '6', key: 'credit_cards', name: 'Credit Cards', nameAr: 'بطاقات ائتمان', icon: '💳', importance: 'critical' },
      { id: '7', key: 'cash', name: 'Cash', nameAr: 'نقدي', icon: '💵', importance: 'critical' },
      { id: '8', key: 'mobile_payment', name: 'Digital Payment', nameAr: 'دفع رقمي', icon: '📱', importance: 'important' },
      { id: '9', key: 'installments', name: 'Installments', nameAr: 'تقسيط', icon: '💳', importance: 'nice' },
    ],
    services: [
      { id: '10', key: 'in_store_shopping', name: 'In-Store Shopping', nameAr: 'تسوق داخلي', icon: '🛍️', importance: 'critical' },
      { id: '11', key: 'online_shopping', name: 'Online Shopping', nameAr: 'تسوق أونلاين', icon: '💻', importance: 'important' },
      { id: '12', key: 'delivery', name: 'Delivery', nameAr: 'توصيل', icon: '🚚', importance: 'important' },
      { id: '13', key: 'gift_wrapping', name: 'Gift Wrapping', nameAr: 'تغليف هدايا', icon: '🎁', importance: 'nice' },
    ],
    atmosphere: [
      { id: '14', key: 'luxury', name: 'Luxury', nameAr: 'فاخر', icon: '💎', importance: 'nice' },
      { id: '15', key: 'budget_friendly', name: 'Budget Friendly', nameAr: 'أسعار مناسبة', icon: '💰', importance: 'important' },
      { id: '16', key: 'family_friendly', name: 'Family Friendly', nameAr: 'مناسب للعائلات', icon: '👨‍👩‍👧', importance: 'nice' },
    ],
  },

  // Entertainment (Night Clubs, Bars, etc.)
  entertainment: {
    amenities: [
      { id: '1', key: 'wifi_free', name: 'Free WiFi', nameAr: 'واي فاي مجاني', icon: '📶', importance: 'important' },
      { id: '2', key: 'wheelchair_accessible', name: 'Wheelchair Accessible', nameAr: 'مدخل لذوي الاحتياجات', icon: '♿', importance: 'critical' },
      { id: '3', key: 'parking', name: 'Parking', nameAr: 'موقف سيارات', icon: '🅿️', importance: 'critical' },
      { id: '4', key: 'valet_parking', name: 'Valet Parking', nameAr: 'خدمة صف السيارات', icon: '🚗', importance: 'important' },
      { id: '5', key: 'coat_check', name: 'Coat Check', nameAr: 'حفظ المعاطف', icon: '🧥', importance: 'nice' },
      { id: '6', key: 'smoking_area', name: 'Smoking Area', nameAr: 'منطقة تدخين', icon: '🚬', importance: 'important' },
    ],
    payment_methods: [
      { id: '7', key: 'credit_cards', name: 'Credit Cards', nameAr: 'بطاقات ائتمان', icon: '💳', importance: 'critical' },
      { id: '8', key: 'cash', name: 'Cash', nameAr: 'نقدي', icon: '💵', importance: 'critical' },
    ],
    services: [
      { id: '9', key: 'table_service', name: 'Table Service', nameAr: 'خدمة طاولات', icon: '🍽️', importance: 'critical' },
      { id: '10', key: 'reservations', name: 'Reservations', nameAr: 'حجوزات', icon: '📅', importance: 'important' },
      { id: '11', key: 'bottle_service', name: 'Bottle Service', nameAr: 'خدمة زجاجات', icon: '🍾', importance: 'nice' },
      { id: '12', key: 'vip_area', name: 'VIP Area', nameAr: 'منطقة VIP', icon: '👑', importance: 'nice' },
    ],
    atmosphere: [
      { id: '13', key: 'live_music', name: 'Live Music', nameAr: 'موسيقى حية', icon: '🎵', importance: 'important' },
      { id: '14', key: 'dj', name: 'DJ', nameAr: 'دي جي', icon: '🎧', importance: 'important' },
      { id: '15', key: 'dancing', name: 'Dance Floor', nameAr: 'حلبة رقص', icon: '💃', importance: 'important' },
      { id: '16', key: 'dress_code', name: 'Dress Code', nameAr: 'قواعد اللباس', icon: '👔', importance: 'nice' },
    ],
  },

  // Default/General Business
  general: {
    amenities: [
      { id: '1', key: 'wifi_free', name: 'Free WiFi', nameAr: 'واي فاي مجاني', icon: '📶', importance: 'nice' },
      { id: '2', key: 'wheelchair_accessible', name: 'Wheelchair Accessible', nameAr: 'مدخل لذوي الاحتياجات', icon: '♿', importance: 'critical' },
      { id: '3', key: 'parking', name: 'Parking', nameAr: 'موقف سيارات', icon: '🅿️', importance: 'important' },
      { id: '4', key: 'air_conditioning', name: 'Air Conditioning', nameAr: 'تكييف', icon: '❄️', importance: 'important' },
    ],
    payment_methods: [
      { id: '5', key: 'credit_cards', name: 'Credit Cards', nameAr: 'بطاقات ائتمان', icon: '💳', importance: 'critical' },
      { id: '6', key: 'cash', name: 'Cash', nameAr: 'نقدي', icon: '💵', importance: 'critical' },
      { id: '7', key: 'mobile_payment', name: 'Digital Payment', nameAr: 'دفع رقمي', icon: '📱', importance: 'nice' },
    ],
    services: [
      { id: '8', key: 'customer_service', name: 'Customer Service', nameAr: 'خدمة عملاء', icon: '🙋', importance: 'critical' },
      { id: '9', key: 'online_service', name: 'Online Services', nameAr: 'خدمات أونلاين', icon: '💻', importance: 'nice' },
    ],
    atmosphere: [
      { id: '10', key: 'professional', name: 'Professional', nameAr: 'مهني', icon: '👔', importance: 'important' },
      { id: '11', key: 'casual', name: 'Casual', nameAr: 'غير رسمي', icon: '👕', importance: 'important' },
    ],
  },
};

// Get features based on business category
export function getIndustryFeatures(category: string): EssentialFeatureCatalog {
  const lowerCategory = category.toLowerCase();
  
  // Entertainment venues
  if (lowerCategory.includes('night') || lowerCategory.includes('club') || 
      lowerCategory.includes('bar') || lowerCategory.includes('lounge')) {
    return INDUSTRY_FEATURES.entertainment;
  }
  
  // Restaurants
  if (lowerCategory.includes('restaurant') || lowerCategory.includes('cafe') || 
      lowerCategory.includes('food') || lowerCategory.includes('مطعم')) {
    return INDUSTRY_FEATURES.restaurant;
  }
  
  // Beauty & Wellness
  if (lowerCategory.includes('salon') || lowerCategory.includes('spa') || 
      lowerCategory.includes('beauty') || lowerCategory.includes('صالون')) {
    return INDUSTRY_FEATURES.salon;
  }
  
  // Professional Services
  if (lowerCategory.includes('office') || lowerCategory.includes('consulting') || 
      lowerCategory.includes('lawyer') || lowerCategory.includes('doctor') ||
      lowerCategory.includes('مكتب') || lowerCategory.includes('عيادة')) {
    return INDUSTRY_FEATURES.office;
  }
  
  // Retail
  if (lowerCategory.includes('store') || lowerCategory.includes('shop') || 
      lowerCategory.includes('retail') || lowerCategory.includes('متجر')) {
    return INDUSTRY_FEATURES.retail;
  }
  
  // Default to general
  return INDUSTRY_FEATURES.general;
}
