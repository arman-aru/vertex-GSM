"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Wallet,
  CreditCard,
  Loader2,
  CheckCircle,
  DollarSign,
} from "lucide-react";

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function AddFundsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();
  const [amount, setAmount] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");

  // Handle success/cancel callbacks
  useEffect(() => {
    const success = searchParams.get("success");
    const cancelled = searchParams.get("cancelled");

    if (success) {
      toast.success("Payment successful! Your balance has been updated.");
      // Update session to reflect new balance
      updateSession();
      // Clean URL
      router.replace("/dashboard/add-funds");
    } else if (cancelled) {
      toast.error("Payment was cancelled");
      router.replace("/dashboard/add-funds");
    }
  }, [searchParams, router, updateSession]);

  const handlePresetClick = (presetAmount: number) => {
    setAmount(presetAmount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setAmount(numValue);
    }
  };

  const handleAddFunds = async () => {
    if (amount < 10) {
      toast.error("Minimum amount is $10");
      return;
    }

    if (amount > 10000) {
      toast.error("Maximum amount is $10,000");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to create checkout session");
        setLoading(false);
      }
    } catch {
      toast.error("Failed to process payment");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add Funds</h1>
        <p className="text-gray-600 mt-1">
          Add credits to your account using Stripe
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Balance */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              ${session?.user?.balance?.toFixed(2) || "0.00"}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Available account credits
            </p>
          </CardContent>
        </Card>

        {/* Add Funds Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Add Credits
            </CardTitle>
            <CardDescription>
              Choose an amount to add to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset Amounts */}
            <div>
              <Label className="mb-3 block">Quick Select</Label>
              <div className="grid grid-cols-3 gap-3">
                {PRESET_AMOUNTS.map((presetAmount) => (
                  <Button
                    key={presetAmount}
                    type="button"
                    variant={amount === presetAmount ? "default" : "outline"}
                    onClick={() => handlePresetClick(presetAmount)}
                    className="h-auto py-4"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    {presetAmount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <Label htmlFor="customAmount">Custom Amount</Label>
              <div className="relative mt-2">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="customAmount"
                  type="number"
                  min="10"
                  max="10000"
                  step="0.01"
                  placeholder="Enter custom amount"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum: $10 | Maximum: $10,000
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount to add</span>
                <span className="font-semibold">${amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current balance</span>
                <span className="font-semibold">
                  ${session?.user?.balance?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-semibold">New balance</span>
                <span className="font-bold text-lg text-blue-600">
                  $
                  {(
                    (session?.user?.balance || 0) + amount
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleAddFunds}
              disabled={loading || amount < 10}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Add ${amount.toFixed(2)} with Stripe
                </>
              )}
            </Button>

            {/* Payment Info */}
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Secure payment powered by Stripe. Your card details are never
                stored on our servers.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Credit & Debit Cards</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Secure 3D Authentication</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Instant Credit Addition</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>1. Select or enter the amount you want to add</p>
            <p>2. Click the button to proceed to Stripe Checkout</p>
            <p>3. Complete your payment securely</p>
            <p>4. Credits are added instantly to your account</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
