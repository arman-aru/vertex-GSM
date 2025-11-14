"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";

const webexSchema = z.object({
  webexApiKey: z.string().optional(),
  webexSenderId: z.string().optional(),
  smsEnabled: z.boolean(),
  smsBalance: z.coerce.number().min(0),
  smsCostPerMsg: z.coerce.number().min(0).max(1),
});

type WebexFormData = z.infer<typeof webexSchema>;

export default function WebexSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WebexFormData>({
    resolver: zodResolver(webexSchema),
    defaultValues: {
      smsEnabled: false,
      smsBalance: 0,
      smsCostPerMsg: 0.05,
    },
  });

  const smsEnabled = watch("smsEnabled");
  const smsBalance = watch("smsBalance") || 0;
  const smsCostPerMsg = watch("smsCostPerMsg") || 0.05;

  // Calculate estimated messages
  const estimatedMessages = smsCostPerMsg > 0 ? Math.floor(smsBalance / smsCostPerMsg) : 0;

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings/webex");
        if (res.ok) {
          const data = await res.json();
          setValue("webexApiKey", data.webexApiKey || "");
          setValue("webexSenderId", data.webexSenderId || "");
          setValue("smsEnabled", data.smsEnabled || false);
          setValue("smsBalance", data.smsBalance || 0);
          setValue("smsCostPerMsg", data.smsCostPerMsg || 0.05);
        }
      } catch (error) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [setValue]);

  const onSubmit = async (data: WebexFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/webex", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success("Webex settings saved successfully");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SMS Notifications</h1>
        <p className="text-gray-600 mt-1">
          Configure Webex Connect API for SMS notifications
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Webex Connect API</CardTitle>
            <CardDescription>
              Configure your Webex Connect (IMIconnect) API credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webexApiKey">API Key</Label>
              <Input
                id="webexApiKey"
                {...register("webexApiKey")}
                type="password"
                placeholder="Your Webex Connect API Key"
                className={errors.webexApiKey ? "border-red-500" : ""}
              />
              {errors.webexApiKey && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.webexApiKey.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Get your API key from the Webex Connect dashboard
              </p>
            </div>

            <div>
              <Label htmlFor="webexSenderId">Sender ID</Label>
              <Input
                id="webexSenderId"
                {...register("webexSenderId")}
                placeholder="e.g., YourBrand or +1234567890"
                className={errors.webexSenderId ? "border-red-500" : ""}
              />
              {errors.webexSenderId && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.webexSenderId.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                The name or number that appears as the sender
              </p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="smsEnabled" className="text-base">
                  Enable SMS Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Send unlock codes via SMS to customers
                </p>
              </div>
              <Switch
                id="smsEnabled"
                checked={smsEnabled}
                onCheckedChange={(checked) => setValue("smsEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* SMS Balance & Costing */}
        <Card>
          <CardHeader>
            <CardTitle>SMS Balance & Pricing</CardTitle>
            <CardDescription>
              Manage your SMS credits and pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="smsBalance">SMS Balance ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="smsBalance"
                  type="number"
                  step="0.01"
                  {...register("smsBalance")}
                  className={`pl-9 ${errors.smsBalance ? "border-red-500" : ""}`}
                />
              </div>
              {errors.smsBalance && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.smsBalance.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Current SMS credit balance
              </p>
            </div>

            <div>
              <Label htmlFor="smsCostPerMsg">Cost Per Message ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="smsCostPerMsg"
                  type="number"
                  step="0.001"
                  {...register("smsCostPerMsg")}
                  className={`pl-9 ${errors.smsCostPerMsg ? "border-red-500" : ""}`}
                />
              </div>
              {errors.smsCostPerMsg && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.smsCostPerMsg.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Cost deducted per SMS segment sent
              </p>
            </div>

            {/* Balance Summary */}
            <div className="rounded-lg bg-blue-50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Balance</span>
                <span className="font-semibold">${smsBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cost Per Message</span>
                <span className="font-semibold">${smsCostPerMsg.toFixed(3)}</span>
              </div>
              <div className="border-t border-blue-200 pt-2 flex justify-between">
                <span className="font-semibold">Estimated Messages</span>
                <span className="font-bold text-lg text-blue-600">
                  ~{estimatedMessages}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>GSM-7 Encoding:</strong> Standard messages (160 chars) are cheapest. Uses basic Latin characters, numbers, and common symbols.
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Unicode Messages:</strong> Messages with emojis, special characters, or non-Latin scripts cost more (70 chars per segment).
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Multi-segment Messages:</strong> Long messages are split into segments. Each segment is charged separately.
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Cost Tracking:</strong> The system automatically detects Unicode characters and warns you about increased costs in the logs.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unicode Warning */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Unicode Character Cost Warning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-yellow-800">
            <p>
              The system automatically detects when messages contain non-GSM-7 characters and logs warnings including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Which specific Unicode characters were detected</li>
              <li>Number of segments required (70 chars vs 160 chars)</li>
              <li>Estimated cost increase compared to GSM-7</li>
            </ul>
            <p className="font-semibold mt-2">
              Check your server logs after each SMS to see cost breakdowns.
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
