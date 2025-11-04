"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { 
  Sparkles, Calendar, Image as ImageIcon, Loader2, Send, Timer, Wand2, Upload, X, 
  Edit, Clock, FileText, Tag, Gift, CalendarClock, Link2, ExternalLink, Info,
  CheckCircle, AlertTriangle, Users, MessageSquare, Trash2
} from "lucide-react"

type LocationItem = { id: string; location_name: string }

interface Post {
  id: string
  title?: string
  content: string
  post_type?: string
  postType?: string
  status: string
  created_at: string
  location_id: string
  media_url?: string
  cta_type?: string
  cta_url?: string
  scheduled_at?: string
  ai_generated?: boolean
  event_title?: string
  event_start_date?: string
  event_end_date?: string
  offer_title?: string
  coupon_code?: string
  redeem_url?: string
  terms?: string
}

export function GMBPostsSection() {
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
  const [posts, setPosts] = useState<Post[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [postTypeFilter, setPostTypeFilter] = useState<'all' | 'whats_new' | 'event' | 'offer'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all')
  const [isDragging, setIsDragging] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  
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
    try {
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
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error('Failed to upload image. Please try again.')
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to upload image')
      }
      
      const data = await res.json()
      if (data.url) {
        return data.url
      }
      throw new Error('No URL returned from upload')
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error('Failed to upload image. Please try again.')
      return null
    }
  }

  const handleGenerate = async () => {
    try {
      setGenLoading(true)
      const prompt = postType === 'event' ? 
        `Create an event post for: ${eventTitle || content}` :
        postType === 'offer' ?
        `Create an offer post for: ${offerTitle || content}` :
        content || title
      
      if (!prompt.trim()) {
        toast.error('Please provide some content to generate from')
        return
      }
      
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'gmb', prompt, tone: 'friendly' })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate content')
      }
      
      const data = await res.json()
      if (data?.title) setTitle(data.title)
      if (data?.description) setContent(data.description)
      setAiGenerated(true)
      toast.success('Content generated successfully!')
    } catch (error: any) {
      console.error('Generate error:', error)
      toast.error(error.message || 'Failed to generate content')
    } finally {
      setGenLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          setListLoading(false)
          return
        }
        
        // First get active GMB account IDs
        const { data: activeAccounts, error: accountsError } = await supabase
          .from("gmb_accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)

        if (accountsError) {
          console.error('Failed to fetch active accounts:', accountsError)
          toast.error('Failed to load accounts')
          setLocations([])
        } else {
          const activeAccountIds = activeAccounts?.map(acc => acc.id) || []

          if (activeAccountIds.length === 0) {
            setLocations([])
          } else {
            // Only fetch locations from active accounts
            const { data: locationsData, error: locationsError } = await supabase
              .from("gmb_locations")
              .select("id, location_name")
              .eq("user_id", user.id)
              .in("gmb_account_id", activeAccountIds)
              .order("location_name")
            
            if (locationsError) {
              console.error('Failed to fetch locations:', locationsError)
              toast.error('Failed to load locations')
              setLocations([])
            } else {
              setLocations((locationsData ?? []) as LocationItem[])
            }
          }
        }
        
        // Fetch posts
        try {
          const res = await fetch('/api/gmb/posts/list')
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to fetch posts')
          }
          const data = await res.json()
          // Handle both direct response and wrapped response
          const items = data.data?.items || data.items || []
          setPosts(items)
        } catch (error) {
          console.error('Failed to fetch posts:', error)
          toast.error('Failed to load posts')
          setPosts([])
        }
      } catch (error) {
        console.error('Initialization error:', error)
        toast.error('Failed to initialize posts section')
      } finally {
        setLoading(false)
        setListLoading(false)
      }
    }
    
    fetchData()
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
      
      const results = await Promise.allSettled(savePromises)
      const responses = results.map(result => 
        result.status === 'fulfilled' ? result.value : null
      ).filter(r => r !== null) as Response[]
      
      const responsesData = await Promise.allSettled(
        responses.map(r => r.json().catch(() => ({})))
      )
      const results_data = responsesData.map(result =>
        result.status === 'fulfilled' ? result.value : {}
      )
      
      const successful = responses.filter(r => r.ok).length
      const failed = responses.length - successful
      
      if (successful > 0) {
        toast.success(`Post saved as draft for ${successful} location(s)`)
        if (failed > 0) {
          toast.error(`Failed to save for ${failed} location(s)`)
        }
        // Refresh posts list
        await refreshPosts()
        // Return the first post ID for publishing
        return results_data.find(r => r.post?.id)?.post?.id
      } else {
        throw new Error("Failed to save posts")
      }
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(error.message || 'Failed to save post')
      return null
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
    
    try {
      // Save first then publish
      const postId = await handleSave()
      if (!postId) return
      
      const res = await fetch('/api/gmb/posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_SCOPES') {
          toast.error('Your Google Business Profile connection needs to be updated. Please disconnect and reconnect your account.')
          return
        }
        if (data.code === 'UNSUPPORTED_POST_TYPE') {
          toast.error(data.error || 'This post type cannot be published to Google.')
          return
        }
        throw new Error(data.error || 'Failed to publish')
      }
      
      toast.success('Published to Google successfully')
      
      // Clear form after publish
      resetForm()
      
      // Refresh posts list
      await refreshPosts()
    } catch (error: any) {
      console.error('Publish error:', error)
      toast.error(error.message || 'Failed to publish post')
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    
    try {
      const res = await fetch('/api/gmb/posts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete post')
      }
      
      toast.success('Post deleted successfully')
      await refreshPosts()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete post')
    }
  }
  
  const refreshPosts = async () => {
    try {
      const res = await fetch('/api/gmb/posts/list')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch posts')
      }
      const data = await res.json()
      // Handle both direct response and wrapped response
      const items = data.data?.items || data.items || []
      setPosts(items)
    } catch (error) {
      console.error('Failed to refresh posts:', error)
      setPosts([])
    }
  }
  
  const resetForm = () => {
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { value: 'whats_new', label: "What's New", icon: Sparkles, description: 'Share updates & news' },
                    { value: 'event', label: 'Event', icon: CalendarClock, description: 'Announce events' },
                    { value: 'offer', label: 'Offer', icon: Gift, description: 'Share special offers' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setPostType(type.value as any)}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        postType === type.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <type.icon className={cn("w-5 h-5 mb-2", postType === type.value ? "text-primary" : "text-muted-foreground")} />
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Selection */}
              <div className="grid gap-3">
                <label className="text-sm font-medium text-primary">Select Locations</label>
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : locations.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed border-primary/30 rounded-lg">
                    <p className="text-muted-foreground">No locations available</p>
                    <p className="text-sm text-muted-foreground mt-2">Add locations in the Locations tab first</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {locations.map((location) => (
                      <label
                        key={location.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                          selectedLocations.includes(location.id)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
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
                          className="sr-only"
                        />
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center",
                          selectedLocations.includes(location.id)
                            ? "border-primary bg-primary"
                            : "border-gray-300"
                        )}>
                          {selectedLocations.includes(location.id) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{location.location_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Event-specific Fields */}
              {postType === 'event' && (
                <div className="space-y-4 p-4 rounded-lg bg-secondary/50 border border-primary/20">
                  <h3 className="text-sm font-semibold text-primary">Event Details</h3>
                  <Input
                    placeholder="Event Title"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="glass-strong"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Start Date</label>
                      <Input
                        type="datetime-local"
                        value={eventStartDate}
                        onChange={(e) => setEventStartDate(e.target.value)}
                        className="glass-strong"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">End Date</label>
                      <Input
                        type="datetime-local"
                        value={eventEndDate}
                        onChange={(e) => setEventEndDate(e.target.value)}
                        className="glass-strong"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Offer-specific Fields */}
              {postType === 'offer' && (
                <div className="space-y-4 p-4 rounded-lg bg-secondary/50 border border-primary/20">
                  <h3 className="text-sm font-semibold text-primary">Offer Details</h3>
                  <Input
                    placeholder="Offer Title"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    className="glass-strong"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Coupon Code (optional)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="glass-strong"
                    />
                    <Input
                      placeholder="Redeem URL (optional)"
                      value={redeemUrl}
                      onChange={(e) => setRedeemUrl(e.target.value)}
                      className="glass-strong"
                    />
                  </div>
                  <Textarea
                    placeholder="Terms & Conditions (optional)"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="glass-strong min-h-[80px]"
                  />
                </div>
              )}

              {/* Title & Content */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-primary">Title (optional)</label>
                  <Input
                    placeholder="Post title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 glass-strong"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-primary">Content *</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerate}
                      disabled={genLoading}
                      className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
                    >
                      {genLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      AI Generate
                    </Button>
                  </div>
                  <Textarea
                    placeholder="What's happening at your business?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="glass-strong min-h-[120px]"
                  />
                  {aiGenerated && (
                    <Badge variant="secondary" className="mt-2">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Generated
                    </Badge>
                  )}
                </div>
              </div>

              {/* Media Upload */}
              <div>
                <label className="text-sm font-medium text-primary">Media (optional)</label>
                <div 
                  className={cn(
                    "mt-1 border-2 border-dashed rounded-lg p-8 text-center transition-all",
                    isDragging ? "border-primary bg-primary/10" : "border-border",
                    imagePreview && "p-4"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-w-full max-h-64 rounded-lg shadow-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setImageFile(null)
                            setImagePreview("")
                          }}
                          className="absolute -top-2 -right-2 h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {imageFile?.name} ({((imageFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Drag & drop an image here, or click to select
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPEG, PNG, GIF or WebP (max 10MB)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4"
                      >
                        Choose File
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Call-to-Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-primary">Call to Action</label>
                  <Select value={cta} onValueChange={setCta}>
                    <SelectTrigger className="mt-1 glass-strong">
                      <SelectValue placeholder="Select CTA" />
                    </SelectTrigger>
                    <SelectContent>
                      {ctaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {cta && (
                  <div>
                    <label className="text-sm font-medium text-primary">CTA URL</label>
                    <Input
                      placeholder="https://..."
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      className="mt-1 glass-strong"
                    />
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div>
                <label className="text-sm font-medium text-primary">Schedule (optional)</label>
                <Input
                  type="datetime-local"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="mt-1 glass-strong"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving || selectedLocations.length === 0 || !content.trim()}
                  className="flex-1 bg-secondary hover:bg-secondary/90"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Timer className="h-4 w-4 mr-2" />
                  )}
                  Save as Draft
                </Button>
                
                <Button
                  onClick={handlePublish}
                  disabled={saving || selectedLocations.length === 0 || !content.trim() || postType !== 'whats_new'}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Publish Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manager" className="space-y-4">
          <Card className="glass-strong border-primary/30">
            <CardHeader className="border-b border-primary/20">
              <CardTitle>Posts Manager</CardTitle>
              <div className="flex gap-3 mt-4">
                <Select value={postTypeFilter} onValueChange={(v: any) => setPostTypeFilter(v)}>
                  <SelectTrigger className="w-[180px] glass-strong">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="whats_new">What's New</SelectItem>
                    <SelectItem value="event">Events</SelectItem>
                    <SelectItem value="offer">Offers</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-[180px] glass-strong">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {listLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="text-center p-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No posts found</p>
                    <p className="text-sm mt-2">Create your first post to get started</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredPosts.map((post) => {
                      const postType = post.post_type || post.postType || 'whats_new'
                      return (
                        <div key={post.id} className="p-4 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {postType === 'event' && <CalendarClock className="h-4 w-4 text-info" />}
                                {postType === 'offer' && <Gift className="h-4 w-4 text-success" />}
                                {postType === 'whats_new' && <Sparkles className="h-4 w-4 text-primary" />}
                                <Badge variant={
                                  post.status === 'published' ? 'default' :
                                  post.status === 'scheduled' ? 'secondary' :
                                  'outline'
                                }>
                                  {post.status}
                                </Badge>
                                {post.ai_generated && (
                                  <Badge variant="secondary">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium mb-1">{post.title || 'Untitled Post'}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(post.created_at).toLocaleDateString()}
                                </span>
                                {post.scheduled_at && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    Scheduled: {new Date(post.scheduled_at).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePost(post.id)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="glass-strong border-primary/30">
            <CardHeader className="border-b border-primary/20">
              <CardTitle>Post Templates</CardTitle>
              <CardDescription>Quick templates to get you started</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium mb-2">{template.label}</h3>
                        <p className="text-sm text-muted-foreground">{template.content}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setContent(template.content)
                          toast.success('Template applied!')
                        }}
                        className="ml-4"
                      >
                        Use
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