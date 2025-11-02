"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { GMBLocation } from "@/lib/types/database"

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

  useEffect(() => {
    if (location && open) {
      fetchAvailableAttributes()
      fetchCurrentAttributes()
    }
  }, [location, open])


  const fetchAvailableAttributes = async () => {
    if (!location) return

    setLoadingAttributes(true)
    try {
      // Strategy 1: Try with categoryName
      if (location.category) {
        const categoryResponse = await fetch(`/api/gmb/attributes?categoryName=${encodeURIComponent(location.category)}`)
        
        if (categoryResponse.ok) {
          const categoryData = await categoryResponse.json()
          // Handle both direct response and wrapped response
          const attributes = categoryData.data?.attributeMetadata || categoryData.attributeMetadata || []
          if (attributes.length > 0) {
            setAvailableAttributes(attributes)
            setLoadingAttributes(false)
            return
          }
        }
      }

      // Strategy 2: Fallback to country (US default)
      const countryResponse = await fetch(`/api/gmb/attributes?country=US`)
      
      if (countryResponse.ok) {
        const countryData = await countryResponse.json()
        // Handle both direct response and wrapped response
        const attributes = countryData.data?.attributeMetadata || countryData.attributeMetadata || []
        if (attributes.length > 0) {
          setAvailableAttributes(attributes)
          setLoadingAttributes(false)
          return
        }
      }

      // All methods failed
      const errorData = await countryResponse.json().catch(() => ({}))
      throw new Error(
        errorData.error?.message || errorData.error || 
        `Failed to fetch attributes. Please try syncing your location again.`
      )
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
        // If 404, no attributes set yet
        if (response.status === 404) {
          setCurrentAttributes([])
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || errorData.error || 'Failed to fetch current attributes')
      }

      const data = await response.json()
      // Handle both direct response and wrapped response
      const attrs = data.data?.attributes || data.attributes || []
      setCurrentAttributes(attrs)

      // Initialize attribute values from current attributes
      const values: Record<string, any> = {}
      attrs.forEach((attr: any) => {
        values[attr.name] = attr.values || []
      })
      setAttributeValues(values)
    } catch (error: any) {
      console.error('Error fetching current attributes:', error)
      // Don't show toast for 404 errors as they're expected when no attributes are set
      if (error.message && !error.message.includes('404')) {
        toast.error(error.message || 'Failed to load current attributes')
      }
    }
  }

  const handleAttributeChange = (attributeName: string, value: any, attribute: Attribute) => {
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

  const handleSubmit = async () => {
    if (!location) return

    setLoading(true)
    try {
      // Build attributes array for update
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
          // To delete an attribute, include it in mask but with empty values
          attributeMask.push(`attributes/${name}`)
          attributesToUpdate.push({
            name: `attributes/${name}`,
            values: [],
          })
        }
      })

      if (attributeMask.length === 0) {
        toast.error('Please select at least one attribute')
        return
      }

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

  // Group attributes by groupDisplayName
  const groupedAttributes = availableAttributes.reduce((acc, attr) => {
    const group = attr.groupDisplayName || 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(attr)
    return acc
  }, {} as Record<string, Attribute[]>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Location Attributes
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure attributes for {location?.location_name || 'this location'}
          </DialogDescription>
        </DialogHeader>

        {loadingAttributes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {Object.entries(groupedAttributes).map(([groupName, attributes]) => (
              <div key={groupName} className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground border-b border-primary/20 pb-2">
                  {groupName}
                </h3>
                <div className="space-y-4">
                  {attributes
                    .filter(attr => !attr.deprecated)
                    .map((attribute) => {
                      const currentValues = attributeValues[attribute.name] || []
                      const valueMetadata = attribute.valueMetadata || []

                      return (
                        <div key={attribute.name} className="space-y-2">
                          <Label className="text-foreground">
                            {attribute.displayName}
                            {attribute.repeatable && (
                              <span className="text-xs text-muted-foreground ml-2">(Multiple)</span>
                            )}
                          </Label>

                          {attribute.valueType === 'BOOL' ? (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={attribute.name}
                                checked={currentValues.includes(true)}
                                onCheckedChange={(checked) =>
                                  handleAttributeChange(attribute.name, checked ? true : null, attribute)
                                }
                              />
                              <Label htmlFor={attribute.name} className="text-sm text-muted-foreground cursor-pointer">
                                Enable {attribute.displayName}
                              </Label>
                            </div>
                          ) : attribute.valueType === 'ENUM' && valueMetadata.length > 0 ? (
                            <Select
                              value={currentValues[0] || ''}
                              onValueChange={(value) => handleAttributeChange(attribute.name, value, attribute)}
                            >
                              <SelectTrigger className="bg-secondary border-primary/30 text-foreground">
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
                            <div className="space-y-2">
                              {valueMetadata.map((meta, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${attribute.name}-${idx}`}
                                    checked={currentValues.includes(meta.value)}
                                    onCheckedChange={(checked) =>
                                      handleAttributeChange(attribute.name, meta.value, attribute)
                                    }
                                  />
                                  <Label
                                    htmlFor={`${attribute.name}-${idx}`}
                                    className="text-sm text-muted-foreground cursor-pointer"
                                  >
                                    {meta.displayName}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          ) : attribute.valueType === 'URL' ? (
                            <Input
                              type="url"
                              value={currentValues[0] || ''}
                              onChange={(e) =>
                                handleAttributeChange(attribute.name, e.target.value || null, attribute)
                              }
                              className="bg-secondary border-primary/30 text-foreground"
                              placeholder="https://example.com"
                            />
                          ) : (
                            <Input
                              value={currentValues[0] || ''}
                              onChange={(e) =>
                                handleAttributeChange(attribute.name, e.target.value || null, attribute)
                              }
                              className="bg-secondary border-primary/30 text-foreground"
                              placeholder="Enter value"
                            />
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}

            {availableAttributes.length === 0 && !loadingAttributes && (
              <div className="text-center py-8 text-muted-foreground">
                No attributes available for this location
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-primary/20">
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
            disabled={loading || loadingAttributes || availableAttributes.length === 0}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Attributes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

