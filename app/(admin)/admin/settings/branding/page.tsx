"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Save, Upload, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface BrandingData {
  companyName: string
  customLogoUrl: string
  customDomain: string
  phone: string
  address: string
}

export default function BrandingSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<BrandingData>({
    companyName: "",
    customLogoUrl: "",
    customDomain: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    fetchBranding()
  }, [])

  const fetchBranding = async () => {
    try {
      const response = await fetch("/api/admin/settings/branding")
      if (!response.ok) throw new Error("Failed to fetch branding")
      
      const data = await response.json()
      setFormData({
        companyName: data.companyName || "",
        customLogoUrl: data.customLogoUrl || "",
        customDomain: data.customDomain || "",
        phone: data.phone || "",
        address: data.address || "",
      })
    } catch (error) {
      console.error("Error fetching branding:", error)
      toast.error("Failed to load branding settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/admin/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to update branding")

      toast.success("Branding updated successfully")
    } catch (error) {
      console.error("Error updating branding:", error)
      toast.error("Failed to update branding")
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB")
      return
    }

    // TODO: In production, upload to cloud storage (AWS S3, Cloudinary, etc.)
    // For now, we'll use a base64 data URL (not recommended for production)
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setFormData({ ...formData, customLogoUrl: base64String })
      toast.success("Logo uploaded (temporary). Save to apply.")
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Branding Settings</h2>
        <p className="text-muted-foreground">
          Customize your company branding and white-label settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Update your company details that will be displayed to customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Your Company Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>
          </CardContent>
        </Card>

        {/* White Label Settings */}
        <Card>
          <CardHeader>
            <CardTitle>White Label Settings</CardTitle>
            <CardDescription>
              Customize your brand identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain</Label>
              <Input
                id="customDomain"
                type="url"
                value={formData.customDomain}
                onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                placeholder="https://yourdomain.com"
              />
              <p className="text-xs text-muted-foreground">
                Your custom domain for white-label access
              </p>
            </div>

            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {formData.customLogoUrl && (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={formData.customLogoUrl}
                      alt="Company Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("logoUpload")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG or GIF (max 2MB). Recommended: 400x400px
                  </p>
                </div>
              </div>
              
              {/* Manual URL input option */}
              <div className="pt-2">
                <Label htmlFor="logoUrl">Or enter logo URL</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={formData.customLogoUrl}
                  onChange={(e) => setFormData({ ...formData, customLogoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
