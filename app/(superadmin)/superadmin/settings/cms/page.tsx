"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
}

const slugs = ["about-us", "terms-of-service"] as const;

type Slug = typeof slugs[number];

export default function SuperadminCMSSettingsPage() {
  const [pages, setPages] = useState<Record<Slug, CMSPage | null>>({ "about-us": null, "terms-of-service": null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<Slug, boolean>>({ "about-us": false, "terms-of-service": false });

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(slugs.map(async (slug) => {
        const res = await fetch(`/api/superadmin/cms?slug=${slug}`);
        if (!res.ok) throw new Error("Failed to load page: " + slug);
        return (await res.json()) as CMSPage;
      }));
      setPages({ "about-us": results[0], "terms-of-service": results[1] });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load CMS pages");
    } finally {
      setLoading(false);
    }
  };

  const savePage = async (slug: Slug) => {
    const page = pages[slug];
    if (!page) return;
    setSaving(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`/api/superadmin/cms?slug=${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: page.title,
            content: page.content,
            isPublished: page.isPublished,
            metaTitle: page.metaTitle,
            metaDescription: page.metaDescription,
        }),
      });
      if (!res.ok) throw new Error("Failed to save page");
      const updated = await res.json();
      setPages(prev => ({ ...prev, [slug]: updated }));
      toast.success("Saved " + page.title);
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaving(prev => ({ ...prev, [slug]: false }));
    }
  };

  const updateField = (slug: Slug, field: keyof CMSPage, value: any) => {
    setPages(prev => ({ ...prev, [slug]: prev[slug] ? { ...prev[slug]!, [field]: value } : prev[slug] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Marketing CMS</h2>
        <p className="text-muted-foreground">Edit public marketing site content pages</p>
      </div>

      {slugs.map(slug => {
        const page = pages[slug];
        if (!page) return null;
        return (
          <Card key={slug}>
            <CardHeader>
              <CardTitle>{page.title}</CardTitle>
              <CardDescription>{slug === "about-us" ? "Core company introduction page" : "Legal terms and conditions"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Page Title</Label>
                  <Input value={page.title} onChange={e => updateField(slug, "title", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input value={page.metaTitle || ""} onChange={e => updateField(slug, "metaTitle", e.target.value)} placeholder="Optional SEO title" />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Input value={page.metaDescription || ""} onChange={e => updateField(slug, "metaDescription", e.target.value)} placeholder="Optional SEO description" />
                </div>
                <div className="space-y-2 flex items-center gap-2">
                  <Switch checked={page.isPublished} onCheckedChange={val => updateField(slug, "isPublished", val)} />
                  <Label>Published</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content (HTML)</Label>
                <Textarea className="min-h-[240px]" value={page.content} onChange={e => updateField(slug, "content", e.target.value)} placeholder="Enter HTML content" />
              </div>
              <Button onClick={() => savePage(slug)} disabled={saving[slug]}>{saving[slug] ? "Saving..." : "Save Changes"}</Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
