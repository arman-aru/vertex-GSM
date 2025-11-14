"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileText, Plus, Edit, Trash2, RefreshCw, Save, Globe } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface CMSPage {
  id: string
  slug: string
  title: string
  content: string
  isPublished: boolean
  metaTitle: string | null
  metaDescription: string | null
  createdAt: string
  updatedAt: string
}

const DEFAULT_PAGES = [
  { slug: "about-us", title: "About Us", description: "Tell customers about your company" },
  { slug: "terms-of-service", title: "Terms of Service", description: "Your terms and conditions" },
  { slug: "privacy-policy", title: "Privacy Policy", description: "Your privacy policy" },
  { slug: "refund-policy", title: "Refund Policy", description: "Your refund and cancellation policy" },
  { slug: "contact-us", title: "Contact Us", description: "Contact information and support" },
]

export default function CMSSettingsPage() {
  const [pages, setPages] = useState<CMSPage[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    content: "",
    isPublished: false,
    metaTitle: "",
    metaDescription: "",
  })

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      const response = await fetch("/api/admin/settings/cms")
      if (!response.ok) throw new Error("Failed to fetch pages")
      
      const data = await response.json()
      setPages(data)
    } catch (error) {
      console.error("Error fetching pages:", error)
      toast.error("Failed to load CMS pages")
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePage = (pageTemplate?: { slug: string; title: string }) => {
    setEditingPage(null)
    setFormData({
      slug: pageTemplate?.slug || "",
      title: pageTemplate?.title || "",
      content: "",
      isPublished: false,
      metaTitle: "",
      metaDescription: "",
    })
    setDialogOpen(true)
  }

  const handleEditPage = (page: CMSPage) => {
    setEditingPage(page)
    setFormData({
      slug: page.slug,
      title: page.title,
      content: page.content,
      isPublished: page.isPublished,
      metaTitle: page.metaTitle || "",
      metaDescription: page.metaDescription || "",
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editingPage
        ? `/api/admin/settings/cms/${editingPage.id}`
        : "/api/admin/settings/cms"
      
      const response = await fetch(url, {
        method: editingPage ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save page")
      }

      toast.success(editingPage ? "Page updated successfully" : "Page created successfully")
      setDialogOpen(false)
      fetchPages()
    } catch (error: any) {
      console.error("Error saving page:", error)
      toast.error(error.message || "Failed to save page")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return

    try {
      const response = await fetch(`/api/admin/settings/cms/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete page")

      toast.success("Page deleted successfully")
      fetchPages()
    } catch (error) {
      console.error("Error deleting page:", error)
      toast.error("Failed to delete page")
    }
  }

  const handleTogglePublish = async (page: CMSPage) => {
    try {
      const response = await fetch(`/api/admin/settings/cms/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...page, isPublished: !page.isPublished }),
      })

      if (!response.ok) throw new Error("Failed to update page")

      toast.success(`Page ${!page.isPublished ? "published" : "unpublished"}`)
      fetchPages()
    } catch (error) {
      console.error("Error toggling publish:", error)
      toast.error("Failed to update page")
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CMS Content</h2>
          <p className="text-muted-foreground">
            Manage your public-facing content pages
          </p>
        </div>
        <Button onClick={() => handleCreatePage()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Page
        </Button>
      </div>

      {/* Quick Start Templates */}
      {pages.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>
              Create essential pages for your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {DEFAULT_PAGES.map((template) => (
                <Button
                  key={template.slug}
                  variant="outline"
                  className="justify-start h-auto p-4"
                  onClick={() => handleCreatePage(template)}
                >
                  <div className="text-left">
                    <div className="font-medium">{template.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {template.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Content Pages ({pages.length})
          </CardTitle>
          <CardDescription>
            Manage all your custom content pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No pages created yet. Use quick start templates above.
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        /{page.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={page.isPublished}
                          onCheckedChange={() => handleTogglePublish(page)}
                        />
                        <Badge variant={page.isPublished ? "default" : "secondary"}>
                          {page.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(page.updatedAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {page.isPublished && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPage(page)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(page.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingPage ? "Edit Page" : "Create New Page"}
              </DialogTitle>
              <DialogDescription>
                {editingPage ? "Update your page content" : "Add a new content page to your website"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Page Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="About Us"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                    placeholder="about-us"
                    disabled={!!editingPage}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Page Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter your page content here..."
                  rows={10}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  You can use HTML for formatting
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title (SEO)</Label>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder="Page title for search engines"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description (SEO)</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  placeholder="Brief description for search engines"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isPublished">Publish Immediately</Label>
                <Switch
                  id="isPublished"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : editingPage ? "Update Page" : "Create Page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
