'use client'

import { useState } from 'react'

// Feature definitions
export const allFeatures = {
  amenities: [
    { id: '1', key: 'wifi_free', name: 'Free WiFi', icon: '📶', commonPercentage: 85, importance: 9 },
    { id: '2', key: 'wheelchair_accessible', name: 'Wheelchair Accessible', icon: '♿', commonPercentage: 72, importance: 8 },
    { id: '3', key: 'parking', name: 'Parking Available', icon: '🅿️', commonPercentage: 78, importance: 8 },
    { id: '4', key: 'valet_parking', name: 'Valet Parking', icon: '🚗', commonPercentage: 45, importance: 6 },
    { id: '5', key: 'outdoor_seating', name: 'Outdoor Seating', icon: '🌳', commonPercentage: 68, importance: 7 },
    { id: '6', key: 'restroom', name: 'Restroom', icon: '🚻', commonPercentage: 95, importance: 9 },
    { id: '7', key: 'air_conditioning', name: 'Air Conditioning', icon: '❄️', commonPercentage: 90, importance: 8 },
    { id: '8', key: 'coat_check', name: 'Coat Check', icon: '🧥', commonPercentage: 35, importance: 5 }
  ],
  payment_methods: [
    { id: '9', key: 'credit_cards', name: 'Credit Cards', icon: '💳', commonPercentage: 95, importance: 10 },
    { id: '10', key: 'debit_cards', name: 'Debit Cards', icon: '💳', commonPercentage: 92, importance: 9 },
    { id: '11', key: 'cash', name: 'Cash', icon: '💵', commonPercentage: 88, importance: 8 },
    { id: '12', key: 'mobile_payment', name: 'Mobile Payments', icon: '📱', commonPercentage: 75, importance: 8 },
    { id: '13', key: 'contactless', name: 'Contactless', icon: '📲', commonPercentage: 70, importance: 7 },
    { id: '14', key: 'cryptocurrency', name: 'Cryptocurrency', icon: '₿', commonPercentage: 5, importance: 3 }
  ],
  services: [
    { id: '15', key: 'dine_in', name: 'Dine-in', icon: '🍽️', commonPercentage: 90, importance: 10 },
    { id: '16', key: 'takeout', name: 'Takeout', icon: '🥡', commonPercentage: 85, importance: 9 },
    { id: '17', key: 'delivery', name: 'Delivery', icon: '🚴', commonPercentage: 65, importance: 7 },
    { id: '18', key: 'reservations', name: 'Reservations', icon: '📅', commonPercentage: 75, importance: 8 },
    { id: '19', key: 'online_ordering', name: 'Online Ordering', icon: '💻', commonPercentage: 60, importance: 7 },
    { id: '20', key: 'catering', name: 'Catering', icon: '🍱', commonPercentage: 40, importance: 6 }
  ],
  atmosphere: [
    { id: '21', key: 'family_friendly', name: 'Family Friendly', icon: '👨‍👩‍👧', commonPercentage: 70, importance: 7 },
    { id: '22', key: 'groups', name: 'Good for Groups', icon: '👥', commonPercentage: 80, importance: 8 },
    { id: '23', key: 'romantic', name: 'Romantic', icon: '💑', commonPercentage: 45, importance: 5 },
    { id: '24', key: 'live_music', name: 'Live Music', icon: '🎵', commonPercentage: 55, importance: 7 },
    { id: '25', key: 'dj', name: 'DJ', icon: '🎧', commonPercentage: 50, importance: 7 },
    { id: '26', key: 'dancing', name: 'Dancing', icon: '💃', commonPercentage: 45, importance: 6 },
    { id: '27', key: 'casual', name: 'Casual', icon: '👕', commonPercentage: 85, importance: 6 },
    { id: '28', key: 'upscale', name: 'Upscale', icon: '🎩', commonPercentage: 40, importance: 6 }
  ]
}

// Common Google Business categories
export const commonCategories = [
  'Night club',
  'Bar',
  'Live music venue',
  'Dance club',
  'Cocktail bar',
  'Restaurant',
  'Entertainment venue',
  'Event venue',
  'Lounge',
  'Wine bar',
  'Beer garden',
  'Pub',
  'Sports bar',
  'Karaoke bar'
]

// 1. FEATURES TAB
export function FeaturesTab({ profile, setProfile, setHasChanges }: any) {
  const categories = [
    { id: 'amenities', name: 'Basic Amenities', icon: '🏢' },
    { id: 'payment_methods', name: 'Payment Methods', icon: '💳' },
    { id: 'services', name: 'Services', icon: '🛎️' },
    { id: 'atmosphere', name: 'Atmosphere', icon: '🎭' }
  ]
  
  const toggleFeature = (category: string, featureKey: string) => {
    setProfile((prev: any) => {
      const features = { ...prev.features }
      if (features[category].includes(featureKey)) {
        features[category] = features[category].filter((k: string) => k !== featureKey)
      } else {
        features[category] = [...features[category], featureKey]
      }
      return { ...prev, features }
    })
    setHasChanges(true)
  }
  
  return (
    <div className="space-y-8">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-white mb-2">
          ✨ Features & Attributes
        </h2>
        <p className="text-zinc-400">
          Enable features that your business offers to improve discoverability
        </p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">
            {Object.values(profile.features).flat().length}
          </div>
          <div className="text-sm text-zinc-400">Active Features</div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">
            {Object.values(allFeatures).flat().length}
          </div>
          <div className="text-sm text-zinc-400">Total Available</div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-orange-400 mb-1">
            {Object.values(allFeatures).flat().length - Object.values(profile.features).flat().length}
          </div>
          <div className="text-sm text-zinc-400">Missing Features</div>
        </div>
      </div>
      
      {/* Feature Categories */}
      {categories.map((category) => (
        <FeatureCategorySection
          key={category.id}
          category={category}
          features={allFeatures[category.id as keyof typeof allFeatures]}
          enabledFeatures={profile.features[category.id]}
          onToggle={(key: string) => toggleFeature(category.id, key)}
        />
      ))}
    </div>
  )
}

function FeatureCategorySection({ category, features, enabledFeatures, onToggle }: any) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const enabledCount = features.filter((f: any) => enabledFeatures.includes(f.key)).length
  
  return (
    <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{category.icon}</span>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">{category.name}</h3>
            <p className="text-sm text-zinc-400">
              {enabledCount} of {features.length} enabled
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-500">
            {Math.round((enabledCount / features.length) * 100)}%
          </div>
          <span className={`text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((feature: any) => {
            const isEnabled = enabledFeatures.includes(feature.key)
            return (
              <label
                key={feature.id}
                className={`
                  flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition
                  ${isEnabled 
                    ? 'border-orange-500 bg-orange-500/10' 
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => onToggle(feature.key)}
                  className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-orange-600 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{feature.icon}</span>
                    <span className="font-medium text-white text-sm">{feature.name}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {feature.commonPercentage}% have this
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// 2. BUSINESS INFO TAB
export function BusinessInfoTab({ profile, setProfile, setHasChanges }: any) {
  const handleChange = (field: string, value: string) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }
  
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-white mb-2">
          📝 Business Information
        </h2>
        <p className="text-zinc-400">
          Update your core business details
        </p>
      </div>
      
      {/* Business Name */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Business Name *
        </label>
        <input
          type="text"
          value={profile.location_name}
          onChange={(e) => handleChange('location_name', e.target.value)}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
          placeholder="Your business name"
        />
        <p className="text-xs text-zinc-500 mt-1">
          This is how your business appears on Google
        </p>
      </div>
      
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Business Description
        </label>
        <textarea
          value={profile.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={5}
          maxLength={750}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none resize-none"
          placeholder="Describe your business in detail..."
        />
        <p className="text-xs text-zinc-500 mt-1">
          {profile.description.length}/750 characters
        </p>
      </div>
      
      {/* Short Description */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Short Description
        </label>
        <input
          type="text"
          value={profile.short_description}
          onChange={(e) => handleChange('short_description', e.target.value)}
          maxLength={250}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
          placeholder="Brief one-line description"
        />
        <p className="text-xs text-zinc-500 mt-1">
          {profile.short_description.length}/250 characters • Shows in search results
        </p>
      </div>
      
      {/* Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
            placeholder="+971 XX XXX XXXX"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Website URL
          </label>
          <input
            type="url"
            value={profile.website}
            onChange={(e) => handleChange('website', e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
            placeholder="https://yourwebsite.com"
          />
        </div>
      </div>
      
      {/* Tips */}
      <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <div className="font-medium text-blue-400 mb-1">Pro Tips</div>
            <ul className="text-sm text-blue-300/80 space-y-1">
              <li>• Use a clear, descriptive business name</li>
              <li>• Write a compelling description that includes your main services</li>
              <li>• Add keywords naturally to improve search visibility</li>
              <li>• Keep your phone number and website up to date</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// 3. CATEGORIES TAB
export function CategoriesTab({ profile, setProfile, setHasChanges }: any) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const addCategory = (category: string) => {
    if (profile.additional_categories.length < 9 && !profile.additional_categories.includes(category)) {
      setProfile((prev: any) => ({
        ...prev,
        additional_categories: [...prev.additional_categories, category]
      }))
      setHasChanges(true)
    }
  }
  
  const removeCategory = (category: string) => {
    setProfile((prev: any) => ({
      ...prev,
      additional_categories: prev.additional_categories.filter((c: string) => c !== category)
    }))
    setHasChanges(true)
  }
  
  const filteredCategories = commonCategories.filter(cat => 
    cat.toLowerCase().includes(searchQuery.toLowerCase()) &&
    cat !== profile.primary_category &&
    !profile.additional_categories.includes(cat)
  )
  
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-white mb-2">
          🏷️ Business Categories
        </h2>
        <p className="text-zinc-400">
          Help customers find your business by selecting relevant categories
        </p>
      </div>
      
      {/* Primary Category */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Primary Category *
        </label>
        <select
          value={profile.primary_category}
          onChange={(e) => {
            setProfile((prev: any) => ({ ...prev, primary_category: e.target.value }))
            setHasChanges(true)
          }}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none"
        >
          {commonCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 mt-1">
          Your main business category - choose the most relevant one
        </p>
      </div>
      
      {/* Additional Categories */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-white">
            Additional Categories ({profile.additional_categories.length}/9)
          </label>
        </div>
        
        {/* Current Categories */}
        {profile.additional_categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.additional_categories.map((cat: string) => (
              <div
                key={cat}
                className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg"
              >
                <span className="text-sm text-white">{cat}</span>
                <button
                  onClick={() => removeCategory(cat)}
                  className="text-orange-400 hover:text-orange-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories..."
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none mb-3"
        />
        
        {/* Available Categories */}
        <div className="max-h-64 overflow-y-auto space-y-2 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
          {filteredCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => addCategory(cat)}
              disabled={profile.additional_categories.length >= 9}
              className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              + {cat}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tips */}
      <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <div className="font-medium text-purple-400 mb-1">Category Tips</div>
            <ul className="text-sm text-purple-300/80 space-y-1">
              <li>• Choose categories that accurately describe your business</li>
              <li>• More categories = better discovery in relevant searches</li>
              <li>• Your primary category has the most impact on search</li>
              <li>• You can add up to 9 additional categories</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// 4. LINKS TAB
export function LinksTab({ profile, setProfile, setHasChanges }: any) {
  const handleChange = (field: string, value: string) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }
  
  const links = [
    {
      key: 'menu_url',
      label: 'Menu URL',
      icon: '🍽️',
      placeholder: 'https://yoursite.com/menu',
      description: 'Link to your menu (for restaurants)'
    },
    {
      key: 'booking_url',
      label: 'Booking/Reservation URL',
      icon: '📅',
      placeholder: 'https://yoursite.com/book',
      description: 'Direct link for customers to make reservations'
    },
    {
      key: 'order_url',
      label: 'Order Online URL',
      icon: '🛒',
      placeholder: 'https://yoursite.com/order',
      description: 'Link to online ordering system'
    },
    {
      key: 'appointment_url',
      label: 'Appointment URL',
      icon: '🗓️',
      placeholder: 'https://yoursite.com/appointment',
      description: 'Link for booking appointments'
    }
  ]
  
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-white mb-2">
          🔗 Special Links
        </h2>
        <p className="text-zinc-400">
          Add direct action links to improve customer experience
        </p>
      </div>
      
      {links.map((link) => (
        <div key={link.key} className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{link.icon}</span>
            <div>
              <label className="block text-sm font-medium text-white">
                {link.label}
              </label>
              <p className="text-xs text-zinc-500">{link.description}</p>
            </div>
          </div>
          
          <input
            type="url"
            value={profile[link.key] || ''}
            onChange={(e) => handleChange(link.key, e.target.value)}
            placeholder={link.placeholder}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
          />
          
          {profile[link.key] && (
            <a
              href={profile[link.key]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 text-sm text-orange-400 hover:text-orange-300"
            >
              Test Link →
            </a>
          )}
        </div>
      ))}
      
      {/* Benefits */}
      <div className="bg-green-950/20 border border-green-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-medium text-green-400 mb-1">Why Add These Links?</div>
            <ul className="text-sm text-green-300/80 space-y-1">
              <li>• Makes it easy for customers to take action directly from Google</li>
              <li>• Increases conversion rates and bookings</li>
              <li>• Shows up as buttons on your Google Business Profile</li>
              <li>• Improves user experience and reduces friction</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// 5. MORE TAB
export function MoreTab({ profile, setProfile, setHasChanges }: any) {
  const fromBusinessOptions = [
    { key: 'black_owned', label: 'Black-owned', icon: '✊🏿' },
    { key: 'women_led', label: 'Women-led', icon: '👩' },
    { key: 'lgbtq_friendly', label: 'LGBTQ+ friendly', icon: '🏳️‍🌈' },
    { key: 'veteran_led', label: 'Veteran-led', icon: '🎖️' },
    { key: 'latino_owned', label: 'Latino-owned', icon: '🌎' },
    { key: 'family_owned', label: 'Family-owned', icon: '👨‍👩‍👧‍👦' }
  ]
  
  const toggleAttribute = (key: string) => {
    setProfile((prev: any) => {
      const attrs = prev.from_the_business.includes(key)
        ? prev.from_the_business.filter((k: string) => k !== key)
        : [...prev.from_the_business, key]
      return { ...prev, from_the_business: attrs }
    })
    setHasChanges(true)
  }
  
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-white mb-2">
          📋 More Attributes
        </h2>
        <p className="text-zinc-400">
          Additional business information and settings
        </p>
      </div>
      
      {/* From the Business */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          From the Business
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fromBusinessOptions.map((option) => {
            const isChecked = profile.from_the_business.includes(option.key)
            return (
              <label
                key={option.key}
                className={`
                  flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition
                  ${isChecked 
                    ? 'border-orange-500 bg-orange-500/10' 
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleAttribute(option.key)}
                  className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-xl">{option.icon}</span>
                <span className="text-white font-medium">{option.label}</span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          These attributes help customers find businesses that align with their values
        </p>
      </div>
      
      {/* Opening Date */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Opening Date
        </label>
        <input
          type="date"
          value={profile.opening_date || ''}
          onChange={(e) => {
            setProfile((prev: any) => ({ ...prev, opening_date: e.target.value }))
            setHasChanges(true)
          }}
          className="w-full md:w-auto px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none"
        />
        <p className="text-xs text-zinc-500 mt-1">
          When did your business first open?
        </p>
      </div>
      
      {/* Service Area */}
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.service_area_enabled}
            onChange={(e) => {
              setProfile((prev: any) => ({ ...prev, service_area_enabled: e.target.checked }))
              setHasChanges(true)
            }}
            className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-orange-600 focus:ring-orange-500"
          />
          <div>
            <span className="text-white font-medium">Show service area on map</span>
            <p className="text-xs text-zinc-500 mt-1">
              Display the geographic area where you provide services
            </p>
          </div>
        </label>
      </div>
      
      {/* Info */}
      <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <div className="font-medium text-white mb-1">About These Settings</div>
            <p className="text-sm text-zinc-400">
              These attributes provide additional context about your business and help customers make informed decisions. They appear on your Google Business Profile and can improve your visibility in relevant searches.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

