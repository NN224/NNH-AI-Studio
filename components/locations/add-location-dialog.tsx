"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface AddLocationDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddLocationDialog({ open: externalOpen, onOpenChange }: AddLocationDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [formData, setFormData] = useState({
    location_name: "",
    address: "",
    phone: "",
    website: "",
    category: "",
    categoryId: "",
  })
  const [categories, setCategories] = useState<any[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoadingCategories(true)
    try {
      const response = await fetch('/api/gmb/categories?regionCode=US&languageCode=en&view=FULL&pageSize=100')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase.from("gmb_locations").insert({
        user_id: user.id,
        location_id: `loc_${Date.now()}`,
        ...formData,
        rating: 0,
        review_count: 0,
        response_rate: 0,
        is_active: true,
        is_syncing: false,
      })

      if (error) throw error

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: "location",
        activity_message: `Added new location: ${formData.location_name}`,
        actionable: false,
      })

      setOpen(false)
      setFormData({
        location_name: "",
        address: "",
        phone: "",
        website: "",
        category: "",
        categoryId: "",
      })
      router.refresh()
    } catch (error) {
      console.error("Error adding location:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex gap-2">
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </DialogTrigger>
        <Button
          variant="outline"
          onClick={() => setSearchDialogOpen(true)}
          className="border-primary/30"
        >
          <Search className="h-4 w-4 mr-2" />
          Search Google
        </Button>
      </div>
      <DialogContent className="bg-card border-primary/30 text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Location</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a new Google My Business location to manage
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location_name" className="text-foreground">
                Location Name *
              </Label>
              <Input
                id="location_name"
                required
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                className="bg-secondary border-primary/30 text-foreground"
                placeholder="My Business Location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-foreground">
                Address
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-secondary border-primary/30 text-foreground resize-none"
                placeholder="123 Main St, City, State 12345"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-secondary border-primary/30 text-foreground"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-foreground">
                  Category
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => {
                    const selected = categories.find(cat => cat.name === value)
                    setFormData({
                      ...formData,
                      category: selected?.displayName || selected?.name || "",
                      categoryId: value,
                    })
                  }}
                  disabled={loadingCategories}
                >
                  <SelectTrigger className="w-full bg-secondary border-primary/30 text-foreground">
                    <SelectValue placeholder={loadingCategories ? "Loading..." : "Select category..."} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {categories.slice(0, 100).map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.displayName || category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="text-foreground">
                Website
              </Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="bg-secondary border-primary/30 text-foreground"
                placeholder="https://example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-primary/30 text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Location"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <SearchGoogleLocationsDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onLocationSelect={(location) => {
          if (location.location) {
            const loc = location.location
            setFormData({
              location_name: loc.title || "",
              address: loc.storefrontAddress
                ? `${(loc.storefrontAddress.addressLines || []).join(', ')}${
                    loc.storefrontAddress.locality ? `, ${loc.storefrontAddress.locality}` : ''
                  }${loc.storefrontAddress.administrativeArea ? `, ${loc.storefrontAddress.administrativeArea}` : ''}${
                    loc.storefrontAddress.postalCode ? ` ${loc.storefrontAddress.postalCode}` : ''
                  }`
                : "",
              phone: loc.phoneNumbers?.primaryPhone || "",
              website: loc.websiteUri || "",
              category: loc.categories?.primaryCategory?.displayName || "",
              categoryId: loc.categories?.primaryCategory?.name || "",
            })
            setInternalOpen(true)
          }
        }}
      />
    </Dialog>
  )
}
