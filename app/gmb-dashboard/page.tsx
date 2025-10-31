"use client"

import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { LocationsList } from "@/components/locations/locations-list"
import { ReviewsList } from "@/components/reviews/reviews-list"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { GMBSettings } from "@/components/settings/gmb-settings"
import { GMBDashboardSidebar } from "@/components/dashboard/gmb-sidebar"
import { MapPin, MessageSquare, Star, TrendingUp, AlertCircle, Users, Bell, Check, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, Sparkles, Calendar, Image as ImageIcon, Loader2, Send, Timer, Wand2, Upload, X, Edit, Clock, FileText, Tag, Gift, CalendarClock, Link2, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState, useRef } from "react"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import Link from "next/link"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface DashboardStats {
  totalLocations: number
  totalReviews: number
  averageRating: string
  responseRate: number
}

type LocationItem = { id: string; location_name: string }

// GMB Posts Section Component
function GMBPostsSection() {
  const supabase = createClient()
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Post form state
  const [postType, setPostType] = useState<'whats_new' | 'event' | 'offer'>('whats_new')
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [cta, setCta] = useState("")
  const [ctaUrl, setCtaUrl] = useState("")
  const [schedule, setSchedule] = useState<string>("")
  const [genLoading, setGenLoading] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)
  
  // Event-specific fields
  const [eventTitle, setEventTitle] = useState("")
  const [eventStartDate, setEventStartDate] = useState("")
  const [eventEndDate, setEventEndDate] = useState("")
  
  // Offer-specific fields
  const [offerTitle, setOfferTitle] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [redeemUrl, setRedeemUrl] = useState("")
  const [terms, setTerms] = useState("")
  
  // Posts list state
  const [posts, setPosts] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [postTypeFilter, setPostTypeFilter] = useState<'all' | 'whats_new' | 'event' | 'offer'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all')
  const [isDragging, setIsDragging] = useState(false)
  const [editingPost, setEditingPost] = useState<any>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Templates
  const templates = [
    { id: 'promo', label: 'Promotion', content: '🎉 Special Offer! Limited time only - visit us today for exclusive deals. Don\'t miss out!' },
    { id: 'event', label: 'Event', content: '📅 Join us for our upcoming event! Mark your calendars and be part of something special.' },
    { id: 'update', label: 'Update', content: '📢 Important update: We have news to share with our valued customers. Stay informed!' },
    { id: 'holiday', label: 'Holiday', content: '🎄 Season\'s Greetings! Wishing you joy and happiness. Special holiday hours in effect.' }
  ]
  
  // CTA Options with icons
  const ctaOptions = [
    { value: 'BOOK', label: 'Book', icon: Calendar },
    { value: 'ORDER', label: 'Order', icon: Send },
    { value: 'SHOP', label: 'Shop', icon: ImageIcon },
    { value: 'LEARN_MORE', label: 'Learn More', icon: Info },
    { value: 'SIGN_UP', label: 'Sign Up', icon: Users },
    { value: 'CALL', label: 'Call', icon: MessageSquare }
  ]

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).')
      return
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('File size too large. Please upload an image smaller than 10MB.')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.url) {
        return data.url
      }
    } catch (error) {
      console.error('Image upload error:', error)
    }
    return null
  }

  const handleGenerate = async () => {
    try {
      setGenLoading(true)
      const prompt = postType === 'event' ? 
        `Create an event post for: ${eventTitle || content}` :
        postType === 'offer' ?
        `Create an offer post for: ${offerTitle || content}` :
        content || title
      
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'gmb', prompt, tone: 'friendly' })
      })
      const j = await res.json()
      if (j?.title) setTitle(j.title)
      if (j?.description) setContent(j.description)
      setAiGenerated(true)
    } catch (e:any) {
      toast.error(e.message)
    } finally {
      setGenLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("gmb_locations")
        .select("id, location_name")
        .eq("user_id", user.id)
        .order("location_name")
      setLocations((data ?? []) as any)
      setLoading(false)
      // fetch posts
      try {
        const res = await fetch('/api/gmb/posts/list')
        const j = await res.json()
        if (res.ok) setPosts(j.items || [])
      } finally {
        setListLoading(false)
      }
    })()
  }, [])

  const handleSave = async () => {
    if (selectedLocations.length === 0 || !content.trim()) {
      toast.error("Please select at least one location and add content")
      return
    }
    
    try {
      setSaving(true)
      
      // Upload image if selected
      let uploadedMediaUrl = mediaUrl
      if (imageFile) {
        const url = await uploadImage(imageFile)
        if (url) uploadedMediaUrl = url
      }
      
      // Build post data based on type
      const postData: any = {
        title: title || undefined,
        content,
        mediaUrl: uploadedMediaUrl || undefined,
        callToAction: cta || undefined,
        callToActionUrl: ctaUrl || undefined,
        scheduledAt: schedule || undefined,
        postType,
        aiGenerated,
      }
      
      // Add type-specific fields
      if (postType === 'event') {
        postData.eventTitle = eventTitle
        postData.eventStartDate = eventStartDate
        postData.eventEndDate = eventEndDate
      } else if (postType === 'offer') {
        postData.offerTitle = offerTitle
        postData.couponCode = couponCode
        postData.redeemUrl = redeemUrl
        postData.terms = terms
      }
      
      // Save post for each selected location
      const savePromises = selectedLocations.map(locationId =>
        fetch("/api/gmb/posts/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...postData, locationId }),
        })
      )
      
      const responses = await Promise.all(savePromises)
      const results = await Promise.all(responses.map(r => r.json()))
      
      const successful = responses.filter(r => r.ok).length
      if (successful > 0) {
        toast.success(`Post saved as draft for ${successful} location(s)`)
        // Return the first post ID for publishing
        return results.find(r => r.post?.id)?.post?.id
      } else {
        throw new Error("Failed to save posts")
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (selectedLocations.length === 0 || !content.trim()) {
      toast.error("Please select at least one location and add content")
      return
    }
    
    // Validate: Event and Offer posts cannot be published
    if (postType === 'event' || postType === 'offer') {
      toast.error("Event and Offer posts cannot be published to Google. Google Business Profile API only supports 'What's New' posts. You can save them as drafts.")
      return
    }
    
    // Save first then publish
    const postId = await handleSave()
    if (!postId) return
    
    try {
      const res = await fetch('/api/gmb/posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      })
      const j = await res.json()
      if (!res.ok) {
        if (j.code === 'INSUFFICIENT_SCOPES') {
          toast.error('Your Google Business Profile connection needs to be updated. Please disconnect and reconnect your account.')
          return
        }
        if (j.code === 'UNSUPPORTED_POST_TYPE') {
          toast.error(j.error || 'This post type cannot be published to Google.')
          return
        }
        throw new Error(j.error || 'Failed to publish')
      }
      toast.success('Published to Google successfully')
      // Clear form after publish
      setTitle("")
      setContent("")
      setMediaUrl("")
      setImageFile(null)
      setImagePreview("")
      setCta("")
      setCtaUrl("")
      setSchedule("")
      setSelectedLocations([])
      setEventTitle("")
      setEventStartDate("")
      setEventEndDate("")
      setOfferTitle("")
      setCouponCode("")
      setRedeemUrl("")
      setTerms("")
      setAiGenerated(false)
      // refresh list
      const r = await fetch('/api/gmb/posts/list'); const jj = await r.json(); if (r.ok) setPosts(jj.items||[])
    } catch (e:any) {
      toast.error(e.message)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    try {
      const res = await fetch('/api/gmb/posts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Post deleted')
      const r = await fetch('/api/gmb/posts/list'); const jj = await r.json(); if (r.ok) setPosts(jj.items||[])
    } catch (e:any) {
      toast.error(e.message)
    }
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      const file = files[0]
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!file.type.startsWith('image/') || !validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).')
        return
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        toast.error('File size too large. Please upload an image smaller than 10MB.')
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  // Filter posts
  const filteredPosts = posts.filter(post => {
    const postType = post.post_type || post.postType
    if (postTypeFilter !== 'all' && postType !== postTypeFilter) return false
    if (statusFilter !== 'all' && post.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-3 glass-strong border-primary/30">
          <TabsTrigger value="create" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <Wand2 className="w-4 h-4 mr-2" />
            Create Post
          </TabsTrigger>
          <TabsTrigger value="manager" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" />
            Posts Manager
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <Tag className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card className="glass-strong border-primary/30 shadow-xl">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="w-6 h-6 text-primary" />
                Create GMB Post
              </CardTitle>
              <CardDescription>Create and publish posts to your Business Profile locations</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Warning Alert for Event/Offer Posts */}
              {(postType === 'event' || postType === 'offer') && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                        Limited Publishing Support
                      </h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Event and Offer posts can only be saved as drafts. Google Business Profile API currently only supports "What's New" posts for publishing.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Post Type Selector */}
              <div className="grid gap-3">
                <label className="text-sm font-medium text-primary">Post Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'whats_new', label: "What's New", icon: Sparkles },
                    { value: 'event', label: 'Event', icon: Calendar },
                    { value: 'offer', label: 'Offer', icon: Gift }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setPostType(type.value as any)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 hover-lift",
                        postType === type.value
                          ? "border-primary bg-primary/10 shadow-lg glow-orange"
                          : "border-primary/20 hover:border-primary/50 glass"
                      )}
                    >
                      <type.icon className={cn(
                        "w-8 h-8",
                        postType === type.value ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "font-medium",
                        postType === type.value ? "text-primary" : "text-muted-foreground"
                      )}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Multi-Select */}
              <div className="grid gap-3">
                <label className="text-sm font-medium text-primary">Select Locations</label>
                <div className="glass rounded-lg p-4 space-y-3 border border-primary/20">
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Loading locations...</div>
                  ) : locations.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No locations found</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLocations(locations.map(l => l.id))}
                          className="hover:bg-primary hover:text-white transition-colors"
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLocations([])}
                          className="hover:bg-primary hover:text-white transition-colors"
                        >
                          Clear All
                        </Button>
                        <Badge variant="outline" className="ml-auto border-primary text-primary">
                          {selectedLocations.length} selected
                        </Badge>
                      </div>
                      <ScrollArea className="h-32 w-full">
                        <div className="space-y-1">
                          {locations.map((location) => (
                            <label
                              key={location.id}
                              className="flex items-center gap-3 p-2 hover:bg-primary/10 rounded-md cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedLocations.includes(location.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLocations([...selectedLocations, location.id])
                                  } else {
                                    setSelectedLocations(selectedLocations.filter(id => id !== location.id))
                                  }
                                }}
                                className="rounded border-primary/50 text-primary focus:ring-primary"
                              />
                              <span className="text-sm">{location.location_name}</span>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic Form Fields Based on Post Type */}
              {postType === 'whats_new' && (
                <>
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-primary">Summary</label>
                    <div className="relative">
                      <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={5}
                        maxLength={1500}
                        placeholder="What would you like to share with your customers?"
                        className="resize-none border-primary/30 focus:border-primary glass"
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        {content.length}/1500
                      </div>
                    </div>
                    {aiGenerated && (
                      <Badge variant="outline" className="w-fit border-primary text-primary">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Generated by AI
                      </Badge>
                    )}
                  </div>
                </>
              )}
              
              {postType === 'event' && (
                <>
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-primary">Event Title</label>
                    <Input
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Enter event name"
                      className="border-primary/30 focus:border-primary glass"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-3">
                      <label className="text-sm font-medium text-primary">Start Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={eventStartDate}
                        onChange={(e) => setEventStartDate(e.target.value)}
                        className="border-primary/30 focus:border-primary glass"
                      />
                    </div>
                    <div className="grid gap-3">
                      <label className="text-sm font-medium text-primary">End Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={eventEndDate}
                        onChange={(e) => setEventEndDate(e.target.value)}
                        className="border-primary/30 focus:border-primary glass"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-primary">Event Summary</label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      placeholder="Describe your event"
                      className="resize-none border-primary/30 focus:border-primary glass"
                    />
                  </div>
                </>
              )}
              
              {postType === 'offer' && (
                <>
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-primary">Offer Title</label>
                    <Input
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      placeholder="e.g., 20% Off Summer Sale"
                      className="border-primary/30 focus:border-primary glass"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-3">
                      <label className="text-sm font-medium text-primary">Coupon Code</label>
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="e.g., SUMMER20"
                        className="border-primary/30 focus:border-primary glass"
                      />
                    </div>
                    <div className="grid gap-3">
                      <label className="text-sm font-medium text-primary">Redeem URL</label>
                      <Input
                        value={redeemUrl}
                        onChange={(e) => setRedeemUrl(e.target.value)}
                        placeholder="https://example.com/offer"
                        className="border-primary/30 focus:border-primary glass"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-primary">Terms & Conditions</label>
                    <Textarea
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      rows={3}
                      placeholder="Enter offer terms and conditions"
                      className="resize-none border-primary/30 focus:border-primary glass"
                    />
                  </div>
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-primary">Offer Description</label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={3}
                      placeholder="Describe your offer"
                      className="resize-none border-primary/30 focus:border-primary glass"
                    />
                  </div>
                </>
              )}

              {/* AI Generation Button */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={genLoading}
                  className="gap-2 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white shadow-lg hover-glow"
                >
                  {genLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate with AI
                </Button>
              </div>

              {/* Image Upload with Drag & Drop */}
              <div className="grid gap-3">
                <label className="text-sm font-medium text-primary">Image/Video</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200",
                    isDragging
                      ? "border-primary bg-primary/10 glow-orange"
                      : "border-primary/30 hover:border-primary/50 glass"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg shadow-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview("")
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-12 h-12 mx-auto text-primary" />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="hover:bg-primary hover:text-white transition-colors"
                        >
                          Choose File
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        or drag and drop your image/video here
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Call to Action */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-3">
                  <label className="text-sm font-medium text-primary">Call to Action</label>
                  <Select onValueChange={setCta} value={cta}>
                    <SelectTrigger className="border-primary/30 glass">
                      <SelectValue placeholder="Select CTA" />
                    </SelectTrigger>
                    <SelectContent>
                      {ctaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="w-4 h-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {cta && (
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-primary">Action URL</label>
                    <Input
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="border-primary/30 focus:border-primary glass"
                    />
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="grid gap-3">
                <label className="text-sm font-medium text-primary">Schedule (optional)</label>
                <Input
                  type="datetime-local"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="border-primary/30 focus:border-primary glass"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={selectedLocations.length === 0 || !content.trim() || saving}
                  variant="outline"
                  className="flex-1 gap-2 hover:bg-primary hover:text-white transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  Save as Draft
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={selectedLocations.length === 0 || !content.trim() || saving || postType === 'event' || postType === 'offer'}
                  className="flex-1 gap-2 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white shadow-lg hover-glow disabled:opacity-50 disabled:cursor-not-allowed"
                  title={postType === 'event' || postType === 'offer' ? "Event and Offer posts cannot be published to Google" : ""}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publish Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manager" className="space-y-4">
          <Card className="glass-strong border-primary/30 shadow-xl">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="w-6 h-6 text-primary" />
                Posts Manager
              </CardTitle>
              <CardDescription>View and manage all your posts</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* Filters */}
              <div className="flex gap-4 mb-6 p-4 glass rounded-lg">
                <Select value={postTypeFilter} onValueChange={(value: any) => setPostTypeFilter(value)}>
                  <SelectTrigger className="w-48 border-primary/30 glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Posts</SelectItem>
                    <SelectItem value="whats_new">What's New</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-48 border-primary/30 glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Posts List */}
              {listLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                  <p className="text-muted-foreground">Loading posts...</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-12 glass rounded-lg">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No posts found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-5 glass rounded-lg border border-primary/20 hover:border-primary/40 transition-all duration-200 hover-lift"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-2">
                          {post.title && (
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              {post.title}
                              {(post.metadata?.aiGenerated || post.aiGenerated) && (
                                <Badge variant="outline" className="text-xs border-primary text-primary">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Generated by AI
                                </Badge>
                              )}
                            </h4>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-3">{post.content}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <Badge
                              variant={post.status === 'published' ? 'default' : 'outline'}
                              className={cn(
                                post.status === 'published' && "bg-green-600 text-white",
                                post.status === 'scheduled' && "border-yellow-600 text-yellow-600",
                                post.status === 'draft' && "border-gray-500 text-gray-500"
                              )}
                            >
                              {post.status === 'published' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {post.status === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
                              {post.status === 'draft' && <FileText className="w-3 h-3 mr-1" />}
                              {post.status}
                            </Badge>
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                            {(post.post_type || post.postType) && (
                              <Badge variant="outline" className="border-primary/50 text-primary">
                                {(post.post_type || post.postType) === 'whats_new' && "What's New"}
                                {(post.post_type || post.postType) === 'event' && "Event"}
                                {(post.post_type || post.postType) === 'offer' && "Offer"}
                              </Badge>
                            )}
                            {(post.post_type === 'event' || post.post_type === 'offer') && (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">
                                Draft Only
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              // Load post data into form
                              setEditingPost(post)
                              setPostType(post.post_type || post.postType || 'whats_new')
                              setTitle(post.title || '')
                              setContent(post.content || '')
                              setMediaUrl(post.media_url || '')
                              setCta(post.call_to_action || '')
                              setCtaUrl(post.call_to_action_url || '')
                              setSchedule(post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : '')
                              setAiGenerated(post.metadata?.aiGenerated || false)
                              
                              // Load Event fields
                              if ((post.post_type || post.postType) === 'event' && post.metadata) {
                                setEventTitle(post.metadata.eventTitle || '')
                                setEventStartDate(post.metadata.eventStartDate || '')
                                setEventEndDate(post.metadata.eventEndDate || '')
                              }
                              
                              // Load Offer fields
                              if ((post.post_type || post.postType) === 'offer' && post.metadata) {
                                setOfferTitle(post.metadata.offerTitle || '')
                                setCouponCode(post.metadata.couponCode || '')
                                setRedeemUrl(post.metadata.redeemUrl || '')
                                setTerms(post.metadata.terms || '')
                              }
                              
                              // Load location
                              setSelectedLocations([post.location_id])
                              
                              // Switch to create tab
                              const createTab = document.querySelector('[value="create"]') as HTMLElement
                              if (createTab) createTab.click()
                              
                              // Scroll to top
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                              
                              toast.success('Post loaded for editing')
                            }}
                            className="hover:bg-primary hover:text-white transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePost(post.id)}
                            className="hover:bg-destructive hover:text-white transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="glass-strong border-primary/30 shadow-xl">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Tag className="w-6 h-6 text-primary" />
                Post Templates
              </CardTitle>
              <CardDescription>Use pre-made templates to quickly create posts</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-5 glass rounded-lg border border-primary/20 hover:border-primary/40 transition-all duration-200 hover-lift"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2">{template.label}</h4>
                        <p className="text-sm text-muted-foreground">{template.content}</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Apply full template structure
                          setContent(template.content)
                          setPostType('whats_new') // Templates are for What's New posts
                          setTitle('') // Clear title to use content as summary
                          setCta('')
                          setCtaUrl('')
                          setSchedule('')
                          setSelectedLocations([])
                          toast.success("Template applied! Don't forget to select a location and customize the content.")
                        }}
                        className="hover:bg-primary hover:text-white transition-colors"
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function GMBDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  
  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      const data = await res.json()
      if (res.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    } finally {
      setNotificationsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'read' })
      })
      // Update local state
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error('Failed to mark notification as read:', e)
    }
  }

  // Fetch dashboard stats
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        setUser(user)

        // Fetch stats from database
        const { data: locations } = await supabase
          .from('gmb_locations')
          .select('*')
          .eq('user_id', user.id)

        const { data: reviews } = await supabase
          .from('gmb_reviews')
          .select('*')
          .eq('user_id', user.id)

        if (locations && reviews) {
          const totalReviews = reviews.length
          const averageRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
            : "0.0"
          const repliedReviews = reviews.filter(r => r.reply_text).length
          const responseRate = reviews.length > 0
            ? Math.round((repliedReviews / reviews.length) * 100)
            : 0

          setStats({
            totalLocations: locations.length,
            totalReviews,
            averageRating,
            responseRate
          })
        }
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) return <LoadingSkeleton />
  if (error) return <div className="text-red-500">Error: {error}</div>

  return (
    <div className="flex">
      <GMBDashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 gradient-text-orange">GMB Dashboard</h1>
              <p className="text-muted-foreground">Manage your Google Business Profile</p>
            </div>
            
            {/* Notifications */}
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative glass-strong border-primary/30">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 glass-strong border-primary/30" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-3">
                    <h3 className="font-semibold">Notifications</h3>
                    <Badge variant="outline" className="border-primary text-primary">
                      {unreadCount} unread
                    </Badge>
                  </div>
                  <ScrollArea className="h-[400px]">
                    {notificationsLoading ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No notifications</p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => !notif.read && markNotificationAsRead(notif.id)}
                            className={cn(
                              "p-3 rounded-lg cursor-pointer transition-all hover:bg-primary/10",
                              !notif.read ? "bg-primary/5 border-l-2 border-primary" : ""
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-full bg-primary/10">
                                {notif.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {notif.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                {notif.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
                                {!notif.type && <Bell className="h-4 w-4 text-primary" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{notif.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(notif.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-6 md:grid-cols-4">
                <StatCard
                  title="Total Locations"
                  value={stats?.totalLocations.toString() || "0"}
                  icon={MapPin}
                  change="+12% from last month"
                  changeType="positive"
                  index={0}
                />
                <StatCard
                  title="Total Reviews"
                  value={stats?.totalReviews.toString() || "0"}
                  icon={MessageSquare}
                  change="+8% from last month"
                  changeType="positive"
                  index={1}
                />
                <StatCard
                  title="Average Rating"
                  value={stats?.averageRating || "0.0"}
                  icon={Star}
                  change="+0.2 from last month"
                  changeType="positive"
                  index={2}
                />
                <StatCard
                  title="Response Rate"
                  value={`${stats?.responseRate || 0}%`}
                  icon={TrendingUp}
                  change="+5% from last month"
                  changeType="positive"
                  index={3}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <PerformanceChart />
                <ActivityFeed />
              </div>
            </div>
          )}

          {activeTab === "posts" && <GMBPostsSection />}
          {activeTab === "locations" && <LocationsList />}
          {activeTab === "reviews" && <ReviewsList />}
          {activeTab === "analytics" && <AnalyticsDashboard />}
          {activeTab === "settings" && <GMBSettings />}
        </div>
      </main>
    </div>
  )
}