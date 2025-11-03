"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { 
  Loader2, Settings, Link2, Lock, Unlock, AlertCircle, CheckCircle2, 
  ExternalLink, Plus, X, Sparkles, TrendingUp, MapPin
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { GMBLocation } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface Attribute {
  name: string
  valueType: string
  displayName: string
  groupDisplayName?: string
  repeatable: boolean
  deprecated: boolean
  valueMetadata?: Array<{
    value: any
    displayName: string
  }>
}

interface LocationAttributesDialogProps {
  location: GMBLocation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function LocationAttributesDialog({
  location,
  open,
  onOpenChange,
  onSuccess,
}: LocationAttributesDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingAttributes, setLoadingAttributes] = useState(false)
  const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([])
  const [currentAttributes, setCurrentAttributes] = useState<any[]>([])
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({})
  const [isLocked, setIsLocked] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (location && open) {
      fetchAvailableAttributes()
      fetchCurrentAttributes()
      fetchLockStatus()
    }
  }, [location, open])

  const fetchLockStatus = async () => {
    if (!location) return
    
    try {
      const metadata = (location.metadata as any) || {}
      // Check if profile is locked (can be stored in metadata or settings)
      setIsLocked(metadata.profileLocked === true)
    } catch (error) {
      console.error('Error fetching lock status:', error)
    }
  }

  const fetchAvailableAttributes = async () => {
    if (!location) return

    setLoadingAttributes(true)
    try {
      if (location.id) {
        const locationResponse = await fetch(`/api/gmb/attributes?locationId=${location.id}`)
        
        if (locationResponse.ok) {
          const locationData = await locationResponse.json()
          const attributes = locationData.data?.attributeMetadata || locationData.attributeMetadata || []
          if (attributes.length > 0) {
            setAvailableAttributes(attributes)
            setLoadingAttributes(false)
            return
          }
        }
      }

      if (location.category) {
        const categoryResponse = await fetch(`/api/gmb/attributes?categoryName=${encodeURIComponent(location.category)}`)
        
        if (categoryResponse.ok) {
          const categoryData = await categoryResponse.json()
          const attributes = categoryData.data?.attributeMetadata || categoryData.attributeMetadata || []
          if (attributes.length > 0) {
            setAvailableAttributes(attributes)
            setLoadingAttributes(false)
            return
          }
        }
      }

      const countryResponse = await fetch(`/api/gmb/attributes?country=US`)
      
      if (countryResponse.ok) {
        const countryData = await countryResponse.json()
        const attributes = countryData.data?.attributeMetadata || countryData.attributeMetadata || []
        if (attributes.length > 0) {
          setAvailableAttributes(attributes)
          setLoadingAttributes(false)
          return
        }
      }

      throw new Error('Failed to fetch attributes')
    } catch (error: any) {
      console.error('Error fetching available attributes:', error)
      toast.error(error.message || 'Failed to load available attributes')
    } finally {
      setLoadingAttributes(false)
    }
  }

  const fetchCurrentAttributes = async () => {
    if (!location) return

    try {
      const response = await fetch(`/api/gmb/location/${location.id}/attributes`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setCurrentAttributes([])
          return
        }
        throw new Error('Failed to fetch current attributes')
      }

      const data = await response.json()
      const attrs = data.data?.attributes || data.attributes || []
      setCurrentAttributes(attrs)

      const values: Record<string, any> = {}
      attrs.forEach((attr: any) => {
        values[attr.name] = attr.values || []
      })
      setAttributeValues(values)
    } catch (error: any) {
      console.error('Error fetching current attributes:', error)
    }
  }

  const handleAttributeChange = (attributeName: string, value: any, attribute: Attribute) => {
    if (isLocked) {
      toast.error('Profile is locked. Unlock to make changes.')
      return
    }
    
    setAttributeValues((prev) => {
      if (attribute.repeatable) {
        const current = prev[attributeName] || []
        if (current.includes(value)) {
          return { ...prev, [attributeName]: current.filter((v: any) => v !== value) }
        } else {
          return { ...prev, [attributeName]: [...current, value] }
        }
      } else {
        return { ...prev, [attributeName]: [value] }
      }
    })
  }

  const handleToggleLock = async () => {
    if (!location) return
    
    try {
      // Update lock status in metadata
      const { error } = await supabase
        .from('gmb_locations')
        .update({
          metadata: {
            ...(location.metadata as any || {}),
            profileLocked: !isLocked
          }
        })
        .eq('id', location.id)
      
      if (error) throw error
      
      setIsLocked(!isLocked)
      toast.success(`Profile ${!isLocked ? 'locked' : 'unlocked'} successfully`)
    } catch (error: any) {
      console.error('Error toggling lock:', error)
      toast.error('Failed to update lock status')
    }
  }

  const handleSubmit = async () => {
    if (!location) return
    if (isLocked) {
      toast.error('Profile is locked. Unlock to make changes.')
      return
    }

    setLoading(true)
    try {
      const attributesToUpdate: any[] = []
      const attributeMask: string[] = []

      Object.entries(attributeValues).forEach(([name, values]) => {
        if (values && values.length > 0) {
          attributeMask.push(`attributes/${name}`)
          attributesToUpdate.push({
            name: `attributes/${name}`,
            values: values,
          })
        } else {
          attributeMask.push(`attributes/${name}`)
          attributesToUpdate.push({
            name: `attributes/${name}`,
            values: [],
          })
        }
      })

      const response = await fetch(`/api/gmb/location/${location.id}/attributes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributeMask: attributeMask.join(','),
          attributes: attributesToUpdate,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update attributes')
      }

      toast.success('Attributes updated successfully')
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error updating attributes:', error)
      toast.error(error.message || 'Failed to update attributes')
    } finally {
      setLoading(false)
    }
  }

  if (!location) return null

  // Separate links and attributes
  const linksList = availableAttributes.filter(attr => attr.valueType === 'URL' && !attr.deprecated)
  const attributesList = availableAttributes.filter(attr => attr.valueType !== 'URL' && !attr.deprecated)

  // Get current link values
  const currentLinkValues = useMemo(() => {
    const values: Record<string, string> = {}
    linksList.forEach(link => {
      const current = currentAttributes.find(attr => attr.name === link.name)
      values[link.name] = current?.values?.[0] || ''
    })
    return values
  }, [currentAttributes, linksList])

  // Get current attribute values for comparison
  const currentAttributeValues = useMemo(() => {
    const values: Record<string, any[]> = {}
    currentAttributes.forEach(attr => {
      values[attr.name] = attr.values || []
    })
    return values
  }, [currentAttributes])

  // Calculate profile strength
  const profileStrength = useMemo(() => {
    if (!location) return 0
    
    const metadata = (location.metadata as any) || {}
    let score = 0
    const maxScore = 100
    
    // Links (20 points total - 5 points per link)
    const linksCount = linksList.filter(link => {
      const value = attributeValues[link.name]?.[0] || currentLinkValues[link.name]
      return value && value.trim() !== ''
    }).length
    score += Math.min(linksCount * 5, 20)
    
    // Attributes (30 points total)
    const attributesCount = attributesList.length
    const filledAttributesCount = attributesList.filter(attr => {
      const values = attributeValues[attr.name] || currentAttributeValues[attr.name] || []
      return values.length > 0 && values.some(v => v !== null && v !== '' && v !== false)
    }).length
    score += Math.min((filledAttributesCount / attributesCount) * 30, 30) || 0
    
    // Basic location info (20 points)
    if (location.phone) score += 5
    if (location.website) score += 5
    if (location.address) score += 5
    if (location.category) score += 5
    
    // Profile description (10 points)
    if (metadata.profile?.description) score += 10
    
    // Business hours (10 points)
    if (metadata.regularHours?.periods?.length > 0) score += 10
    
    // Service items (10 points)
    if (metadata.serviceItems?.length > 0) score += Math.min(metadata.serviceItems.length * 2, 10)
    
    return Math.round(score)
  }, [location, linksList, attributesList, attributeValues, currentLinkValues, currentAttributeValues])

  // Missing links
  const missingLinks = useMemo(() => {
    return linksList.filter(link => {
      const value = attributeValues[link.name]?.[0] || currentLinkValues[link.name]
      return !value || value.trim() === ''
    })
  }, [linksList, attributeValues, currentLinkValues])

  // Existing links
  const existingLinks = useMemo(() => {
    return linksList.filter(link => {
      const value = attributeValues[link.name]?.[0] || currentLinkValues[link.name]
      return value && value.trim() !== ''
    })
  }, [linksList, attributeValues, currentLinkValues])

  // Missing attributes
  const missingAttributes = useMemo(() => {
    return attributesList.filter(attr => {
      const values = attributeValues[attr.name] || currentAttributeValues[attr.name] || []
      return values.length === 0 || !values.some(v => v !== null && v !== '' && v !== false)
    })
  }, [attributesList, attributeValues, currentAttributeValues])

  // Existing attributes (grouped)
  const existingAttributesByGroup = useMemo(() => {
    const filled = attributesList.filter(attr => {
      const values = attributeValues[attr.name] || currentAttributeValues[attr.name] || []
      return values.length > 0 && values.some(v => v !== null && v !== '' && v !== false)
    })
    
    return filled.reduce((acc, attr) => {
      const group = attr.groupDisplayName || 'Other'
      if (!acc[group]) acc[group] = []
      acc[group].push(attr)
      return acc
    }, {} as Record<string, Attribute[]>)
  }, [attributesList, attributeValues, currentAttributeValues])

  // Missing attributes (grouped)
  const missingAttributesByGroup = useMemo(() => {
    return missingAttributes.reduce((acc, attr) => {
      const group = attr.groupDisplayName || 'Other'
      if (!acc[group]) acc[group] = []
      acc[group].push(attr)
      return acc
    }, {} as Record<string, Attribute[]>)
  }, [missingAttributes])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-card border-primary/30">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Location Profile Management
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                Manage links, attributes, and profile settings for {location?.location_name || 'this location'}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleLock}
              className={cn(
                "gap-2",
                isLocked ? "border-orange-500/50 text-orange-500" : "border-primary/30"
              )}
            >
              {isLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  Unlock Profile
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Lock Profile
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Profile Strength Indicator */}
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Profile Strength</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-primary">{profileStrength}%</span>
              {profileStrength >= 80 && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Excellent
                </Badge>
              )}
              {profileStrength >= 60 && profileStrength < 80 && (
                <Badge className="bg-blue-500 text-white">
                  Good
                </Badge>
              )}
              {profileStrength < 60 && (
                <Badge className="bg-orange-500 text-white">
                  Needs Improvement
                </Badge>
              )}
            </div>
          </div>
          <Progress value={profileStrength} className="h-2 mb-2" />
          <div className="flex items-center justify-between text-xs">
            <p className="text-muted-foreground">
              Complete missing fields to increase profile strength and visibility
            </p>
            <span className="text-primary font-medium">
              {missingLinks.length} links + {missingAttributes.length} attributes missing
            </span>
          </div>
        </div>

        {loadingAttributes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8 mt-6">
            {/* Links Section */}
            <div className="space-y-4">
              <div className="border-b border-primary/20 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Link2 className="w-5 h-5" />
                      Links
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      External links for your business profile
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    {existingLinks.length}/{linksList.length} Complete
                  </Badge>
                </div>
              </div>

              {/* Existing Links */}
              {existingLinks.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Existing Links
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {existingLinks.map((link) => {
                      const value = attributeValues[link.name]?.[0] || currentLinkValues[link.name] || ''
                      return (
                        <motion.div
                          key={link.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-lg bg-green-500/10 border border-green-500/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <Label className="text-sm font-medium text-foreground mb-1 block">
                                {link.displayName}
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  type="url"
                                  value={value}
                                  onChange={(e) =>
                                    handleAttributeChange(link.name, e.target.value || null, link)
                                  }
                                  disabled={isLocked}
                                  className="bg-secondary border-primary/30 text-foreground text-xs h-8"
                                  placeholder="https://example.com"
                                />
                                {value && (
                                  <a
                                    href={value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0"
                                  >
                                    <ExternalLink className="w-4 h-4 text-primary" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Missing Links */}
              {missingLinks.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Missing Links ({missingLinks.length})
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {missingLinks.map((link) => (
                      <motion.div
                        key={link.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-3 rounded-lg border-2 border-dashed transition-all",
                          "bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50",
                          "relative group"
                        )}
                      >
                        <div className="absolute -top-2 -right-2">
                          <Badge className="bg-orange-500 text-white text-xs">
                            Missing
                          </Badge>
                        </div>
                        <Label className="text-sm font-medium text-foreground mb-2 block">
                          {link.displayName}
                        </Label>
                        <Input
                          type="url"
                          value={attributeValues[link.name]?.[0] || ''}
                          onChange={(e) =>
                            handleAttributeChange(link.name, e.target.value || null, link)
                          }
                          disabled={isLocked}
                          className="bg-secondary border-primary/30 text-foreground text-xs h-8"
                          placeholder={`Add ${link.displayName}...`}
                        />
                        <p className="text-xs text-orange-500/70 flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3" />
                          +{Math.round(20 / linksList.length)}% profile strength
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Attributes Section */}
            <div className="space-y-4">
              <div className="border-b border-primary/20 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Attributes
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Business features and characteristics
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    {attributesList.length - missingAttributes.length}/{attributesList.length} Complete
                  </Badge>
                </div>
              </div>

              {/* Existing Attributes by Group */}
              {Object.keys(existingAttributesByGroup).length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Configured Attributes
                  </h4>
                  {Object.entries(existingAttributesByGroup).map(([groupName, attributes]) => (
                    <div key={groupName} className="space-y-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        {groupName}
                      </h5>
                      <div className="grid gap-3 md:grid-cols-2">
                        {attributes.map((attribute) => {
                          const currentValues = attributeValues[attribute.name] || currentAttributeValues[attribute.name] || []
                          const valueMetadata = attribute.valueMetadata || []

                          return (
                            <div key={attribute.name} className="space-y-2">
                              <Label className="text-sm font-medium text-foreground">
                                {attribute.displayName}
                                {attribute.repeatable && (
                                  <span className="text-xs text-muted-foreground ml-1">(Multiple)</span>
                                )}
                              </Label>

                              {attribute.valueType === 'BOOL' ? (
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={attribute.name}
                                    checked={currentValues.includes(true)}
                                    disabled={isLocked}
                                    onCheckedChange={(checked) =>
                                      handleAttributeChange(attribute.name, checked ? true : null, attribute)
                                    }
                                  />
                                  <Label htmlFor={attribute.name} className="text-sm text-muted-foreground cursor-pointer">
                                    Enabled
                                  </Label>
                                </div>
                              ) : attribute.valueType === 'ENUM' && valueMetadata.length > 0 ? (
                                <Select
                                  value={currentValues[0] || ''}
                                  disabled={isLocked}
                                  onValueChange={(value) => handleAttributeChange(attribute.name, value, attribute)}
                                >
                                  <SelectTrigger className="bg-secondary border-primary/30 text-foreground h-8 text-xs">
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {valueMetadata.map((meta, idx) => (
                                      <SelectItem key={idx} value={meta.value}>
                                        {meta.displayName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : attribute.valueType === 'REPEATED_ENUM' && valueMetadata.length > 0 ? (
                                <div className="space-y-1">
                                  {valueMetadata.map((meta, idx) => (
                                    <div key={idx} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${attribute.name}-${idx}`}
                                        checked={currentValues.includes(meta.value)}
                                        disabled={isLocked}
                                        onCheckedChange={(checked) =>
                                          handleAttributeChange(attribute.name, meta.value, attribute)
                                        }
                                      />
                                      <Label
                                        htmlFor={`${attribute.name}-${idx}`}
                                        className="text-xs text-muted-foreground cursor-pointer"
                                      >
                                        {meta.displayName}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <Input
                                  value={currentValues[0] || ''}
                                  disabled={isLocked}
                                  onChange={(e) =>
                                    handleAttributeChange(attribute.name, e.target.value || null, attribute)
                                  }
                                  className="bg-secondary border-primary/30 text-foreground h-8 text-xs"
                                  placeholder="Enter value"
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Missing Attributes by Group */}
              {Object.keys(missingAttributesByGroup).length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Missing Attributes ({missingAttributes.length})
                  </h4>
                  {Object.entries(missingAttributesByGroup).map(([groupName, attributes]) => (
                    <div key={groupName} className="space-y-3 p-3 rounded-lg border-2 border-dashed bg-orange-500/5 border-orange-500/30">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          {groupName}
                        </h5>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-xs">
                          {attributes.length} missing
                        </Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {attributes.map((attribute) => {
                          const currentValues = attributeValues[attribute.name] || []
                          const valueMetadata = attribute.valueMetadata || []

                          return (
                            <motion.div
                              key={attribute.name}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="p-2 rounded border border-orange-500/20 bg-orange-500/5"
                            >
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                                  {attribute.displayName}
                                  <Badge className="bg-orange-500 text-white text-xs ml-1">Required</Badge>
                                </Label>

                                {attribute.valueType === 'BOOL' ? (
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={attribute.name}
                                      checked={currentValues.includes(true)}
                                      disabled={isLocked}
                                      onCheckedChange={(checked) =>
                                        handleAttributeChange(attribute.name, checked ? true : null, attribute)
                                      }
                                    />
                                    <Label htmlFor={attribute.name} className="text-xs text-muted-foreground cursor-pointer">
                                      Enable {attribute.displayName}
                                    </Label>
                                  </div>
                                ) : attribute.valueType === 'ENUM' && valueMetadata.length > 0 ? (
                                  <Select
                                    value={currentValues[0] || ''}
                                    disabled={isLocked}
                                    onValueChange={(value) => handleAttributeChange(attribute.name, value, attribute)}
                                  >
                                    <SelectTrigger className="bg-secondary border-orange-500/30 text-foreground h-8 text-xs">
                                      <SelectValue placeholder={`Select ${attribute.displayName}...`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {valueMetadata.map((meta, idx) => (
                                        <SelectItem key={idx} value={meta.value}>
                                          {meta.displayName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : attribute.valueType === 'REPEATED_ENUM' && valueMetadata.length > 0 ? (
                                  <div className="space-y-1">
                                    {valueMetadata.map((meta, idx) => (
                                      <div key={idx} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`${attribute.name}-${idx}`}
                                          checked={currentValues.includes(meta.value)}
                                          disabled={isLocked}
                                          onCheckedChange={(checked) =>
                                            handleAttributeChange(attribute.name, meta.value, attribute)
                                          }
                                        />
                                        <Label
                                          htmlFor={`${attribute.name}-${idx}`}
                                          className="text-xs text-muted-foreground cursor-pointer"
                                        >
                                          {meta.displayName}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <Input
                                    value={currentValues[0] || ''}
                                    disabled={isLocked}
                                    onChange={(e) =>
                                      handleAttributeChange(attribute.name, e.target.value || null, attribute)
                                    }
                                    className="bg-secondary border-orange-500/30 text-foreground h-8 text-xs"
                                    placeholder={`Enter ${attribute.displayName}...`}
                                  />
                                )}
                                <p className="text-xs text-orange-500/70 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  +{Math.round(30 / attributesList.length)}% strength
                                </p>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <div className="border-b border-primary/20 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Location Details
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Basic location information and settings
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-secondary/50 border border-primary/20">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className={cn(
                    "p-3 rounded border",
                    location.location_name ? "bg-green-500/5 border-green-500/20" : "bg-orange-500/5 border-orange-500/20 border-dashed"
                  )}>
                    <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                      Location Name
                      {location.location_name ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-orange-500" />
                      )}
                    </Label>
                    <p className={cn(
                      "text-sm mt-1",
                      location.location_name ? "text-muted-foreground" : "text-orange-500 italic"
                    )}>
                      {location.location_name || 'Missing - Add location name'}
                    </p>
                  </div>
                  
                  <div className={cn(
                    "p-3 rounded border",
                    location.category ? "bg-green-500/5 border-green-500/20" : "bg-orange-500/5 border-orange-500/20 border-dashed"
                  )}>
                    <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                      Category
                      {location.category ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-orange-500" />
                      )}
                    </Label>
                    <p className={cn(
                      "text-sm mt-1",
                      location.category ? "text-muted-foreground" : "text-orange-500 italic"
                    )}>
                      {location.category || 'Missing - Add category'}
                    </p>
                  </div>
                  
                  <div className={cn(
                    "p-3 rounded border",
                    location.address ? "bg-green-500/5 border-green-500/20" : "bg-orange-500/5 border-orange-500/20 border-dashed"
                  )}>
                    <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                      Address
                      {location.address ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-orange-500" />
                      )}
                    </Label>
                    <p className={cn(
                      "text-sm mt-1",
                      location.address ? "text-muted-foreground" : "text-orange-500 italic"
                    )}>
                      {location.address || 'Missing - Add address'}
                    </p>
                  </div>
                  
                  <div className={cn(
                    "p-3 rounded border",
                    location.phone ? "bg-green-500/5 border-green-500/20" : "bg-orange-500/5 border-orange-500/20 border-dashed"
                  )}>
                    <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                      Phone
                      {location.phone ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-orange-500" />
                      )}
                    </Label>
                    <p className={cn(
                      "text-sm mt-1",
                      location.phone ? "text-muted-foreground" : "text-orange-500 italic"
                    )}>
                      {location.phone || 'Missing - Add phone number'}
                    </p>
                  </div>
                  
                  <div className={cn(
                    "p-3 rounded border",
                    location.website ? "bg-green-500/5 border-green-500/20" : "bg-orange-500/5 border-orange-500/20 border-dashed"
                  )}>
                    <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                      Website
                      {location.website ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-orange-500" />
                      )}
                    </Label>
                    <p className={cn(
                      "text-sm mt-1",
                      location.website ? "text-muted-foreground" : "text-orange-500 italic"
                    )}>
                      {location.website || 'Missing - Add website URL'}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded border bg-secondary/30 border-primary/20">
                    <Label className="text-sm font-medium text-foreground">Rating</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(location.rating || 0).toFixed(1)} ⭐ ({location.review_count || 0} reviews)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-primary/20">
          <div className="flex items-center gap-2">
            {isLocked && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                <Lock className="w-3 h-3 mr-1" />
                Profile Locked
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Completing missing fields increases profile strength
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-primary/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || loadingAttributes || isLocked}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

