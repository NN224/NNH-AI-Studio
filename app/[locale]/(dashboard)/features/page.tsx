'use client'

import { useState } from 'react'
import { FeaturesTab, BusinessInfoTab, CategoriesTab, LinksTab, MoreTab } from './TabComponents'
import { ProfileCompletenessCard } from './ProfileCompletenessCard'

// Types
interface BusinessProfile {
  location_id: string
  location_name: string
  
  // Basic Info
  description: string
  short_description: string
  phone: string
  website: string
  
  // Categories
  primary_category: string
  additional_categories: string[]
  
  // Special Links
  menu_url?: string
  booking_url?: string
  order_url?: string
  appointment_url?: string
  
  // Features/Attributes
  features: {
    amenities: string[]
    payment_methods: string[]
    services: string[]
    atmosphere: string[]
  }
  
  // More Attributes
  from_the_business: string[]
  opening_date?: string
  service_area_enabled: boolean
  
  // Completeness
  profile_completeness: number
}

// Mock Data
const mockBusinessProfile: BusinessProfile = {
  location_id: '1',
  location_name: 'The DXB Night Club | مهرجان نايت كلاب دبي',
  description: 'Experience the ultimate nightlife at The DXB Night Club. Dubai\'s premier entertainment destination featuring world-class DJs, stunning light shows, and VIP experiences. Open Thursday to Saturday from 10 PM.',
  short_description: 'Dubai\'s premier nightclub featuring world-class entertainment and VIP experiences.',
  phone: '+971 4 XXX XXXX',
  website: 'https://dxbnightclub.com',
  primary_category: 'Night club',
  additional_categories: ['Bar', 'Live music venue', 'Dance club'],
  menu_url: 'https://dxbnightclub.com/menu',
  booking_url: 'https://dxbnightclub.com/reservations',
  order_url: '',
  appointment_url: '',
  features: {
    amenities: ['wifi_free', 'wheelchair_accessible', 'parking', 'outdoor_seating', 'restroom'],
    payment_methods: ['credit_cards', 'debit_cards', 'cash', 'mobile_payment', 'contactless'],
    services: ['dine_in', 'takeout', 'reservations'],
    atmosphere: ['family_friendly', 'groups', 'live_music']
  },
  from_the_business: ['lgbtq_friendly'],
  opening_date: '2020-06-15',
  service_area_enabled: false,
  profile_completeness: 68
}

export default function BusinessProfilePage() {
  const [activeTab, setActiveTab] = useState<'features' | 'info' | 'categories' | 'links' | 'more'>('features')
  const [profile, setProfile] = useState(mockBusinessProfile)
  const [hasChanges, setHasChanges] = useState(false)
  
  const tabs = [
    { id: 'features', name: 'Features', icon: '✨' },
    { id: 'info', name: 'Business Info', icon: '📝' },
    { id: 'categories', name: 'Categories', icon: '🏷️' },
    { id: 'links', name: 'Special Links', icon: '🔗' },
    { id: 'more', name: 'More', icon: '📋' }
  ]
  
  const handleSave = () => {
    // Phase 3: Save to database
    alert('Changes saved! (API integration in Phase 3)')
    setHasChanges(false)
  }
  
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              ⚙️ Business Profile Settings
            </h1>
            <p className="text-zinc-400">
              Manage all your business information and attributes
            </p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg font-medium transition text-white"
            >
              🔄 Reset
            </button>
            <button 
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                hasChanges 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              💾 Save Changes
            </button>
          </div>
        </div>
        
        {/* Location Selector */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <select className="w-full md:w-auto px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none">
            <option>{profile.location_name}</option>
          </select>
        </div>
        
        {/* Profile Completeness */}
        <ProfileCompletenessCard completeness={profile.profile_completeness} />
        
        {/* Tabs */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex border-b border-zinc-800 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition
                  ${activeTab === tab.id 
                    ? 'bg-orange-600 text-white border-b-2 border-orange-500' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }
                `}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'features' && (
              <FeaturesTab 
                profile={profile} 
                setProfile={setProfile} 
                setHasChanges={setHasChanges}
              />
            )}
            
            {activeTab === 'info' && (
              <BusinessInfoTab 
                profile={profile} 
                setProfile={setProfile} 
                setHasChanges={setHasChanges}
              />
            )}
            
            {activeTab === 'categories' && (
              <CategoriesTab 
                profile={profile} 
                setProfile={setProfile} 
                setHasChanges={setHasChanges}
              />
            )}
            
            {activeTab === 'links' && (
              <LinksTab 
                profile={profile} 
                setProfile={setProfile} 
                setHasChanges={setHasChanges}
              />
            )}
            
            {activeTab === 'more' && (
              <MoreTab 
                profile={profile} 
                setProfile={setProfile} 
                setHasChanges={setHasChanges}
              />
            )}
          </div>
        </div>
        
      </div>
    </div>
  )
}
