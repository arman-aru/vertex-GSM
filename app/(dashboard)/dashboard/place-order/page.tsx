"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShoppingCart, DollarSign, Clock } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  serviceType: "IMEI" | "FILE" | "SERVER";
  ourPrice: number;
  deliveryTime: string | null;
  minQuantity: number;
  maxQuantity: number;
}

// Form schema with conditional validation
const createOrderSchema = (serviceType: "IMEI" | "FILE" | "SERVER" | null) => {
  const baseSchema = {
    serviceId: z.string().min(1, "Please select a service"),
    quantity: z.coerce
      .number()
      .int()
      .min(1, "Quantity must be at least 1")
      .default(1),
    notes: z.string().optional(),
  };

  if (serviceType === "IMEI") {
    return z.object({
      ...baseSchema,
      imei: z
        .string()
        .min(15, "IMEI must be exactly 15 digits")
        .max(15, "IMEI must be exactly 15 digits")
        .regex(/^\d{15}$/, "IMEI must contain only digits"),
    });
  }

  if (serviceType === "FILE") {
    return z.object({
      ...baseSchema,
      file: z
        .any()
        .refine((files) => files?.length > 0, "File is required"),
    });
  }

  return z.object(baseSchema);
};

export default function PlaceOrderPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Dynamic schema based on selected service type
  const formSchema = createOrderSchema(selectedService?.serviceType || null);
  type FormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  const serviceId = watch("serviceId");
  const quantity = watch("quantity") || 1;

  // Fetch services
  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/services");
        if (res.ok) {
          const data = await res.json();
          setServices(data);
        } else {
          toast.error("Failed to load services");
        }
      } catch (error) {
        toast.error("Failed to load services");
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  // Update selected service when serviceId changes
  useEffect(() => {
    if (serviceId) {
      const service = services.find((s) => s.id === serviceId);
      setSelectedService(service || null);
      
      // Reset quantity to min when service changes
      if (service) {
        setValue("quantity", service.minQuantity);
      }
    } else {
      setSelectedService(null);
    }
  }, [serviceId, services, setValue]);

  // Calculate total price
  const totalPrice = selectedService
    ? (selectedService.ourPrice * quantity).toFixed(2)
    : "0.00";

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      let fileData = null;

      // Handle file upload for FILE service type
      if (selectedService?.serviceType === "FILE" && data.file) {
        const file = data.file[0];
        const reader = new FileReader();
        
        fileData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve({
            name: file.name,
            data: reader.result,
          });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const payload = {
        serviceId: data.serviceId,
        quantity: data.quantity,
        notes: data.notes,
        ...(selectedService?.serviceType === "IMEI" && { imei: (data as any).imei }),
        ...(selectedService?.serviceType === "FILE" && { file: fileData }),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Order placed successfully!");
        reset();
        router.push(`/dashboard/orders`);
      } else {
        toast.error(result.error || "Failed to place order");
      }
    } catch (error) {
      toast.error("Failed to place order");
    } finally {
      setSubmitting(false);
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Place New Order</h1>
        <p className="text-gray-600 mt-1">
          Select a service and provide the required information
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Service Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Service</CardTitle>
            <CardDescription>
              Choose from available services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="serviceId">Service *</Label>
              <Select
                value={serviceId}
                onValueChange={(value) => setValue("serviceId", value)}
              >
                <SelectTrigger
                  id="serviceId"
                  className={errors.serviceId ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">
                      No services available
                    </div>
                  ) : (
                    services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{service.name}</span>
                          <span className="ml-4 text-xs text-gray-500">
                            ${service.ourPrice.toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.serviceId && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.serviceId.message}
                </p>
              )}
            </div>

            {/* Service Details */}
            {selectedService && (
              <div className="rounded-lg bg-blue-50 p-4 space-y-2">
                {selectedService.description && (
                  <p className="text-sm text-gray-700">
                    {selectedService.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  {selectedService.category && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Category:</span>
                      <span className="text-gray-600">
                        {selectedService.category}
                      </span>
                    </span>
                  )}
                  {selectedService.deliveryTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-gray-600">
                        {selectedService.deliveryTime}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service-specific inputs */}
        {selectedService && (
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
              <CardDescription>
                Provide the required information for this service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* IMEI Input */}
              {selectedService.serviceType === "IMEI" && (
                <div>
                  <Label htmlFor="imei">IMEI Number *</Label>
                  <Input
                    id="imei"
                    {...register("imei" as any)}
                    placeholder="Enter 15-digit IMEI"
                    maxLength={15}
                    className={errors.imei ? "border-red-500" : ""}
                  />
                  {errors.imei && (
                    <p className="text-sm text-red-500 mt-1">
                      {(errors as any).imei.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 15-digit IMEI number
                  </p>
                </div>
              )}

              {/* File Upload */}
              {selectedService.serviceType === "FILE" && (
                <div>
                  <Label htmlFor="file">Upload File *</Label>
                  <Input
                    id="file"
                    type="file"
                    {...register("file" as any)}
                    className={errors.file ? "border-red-500" : ""}
                  />
                  {errors.file && (
                    <p className="text-sm text-red-500 mt-1">
                      {(errors as any).file?.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Upload the required file for processing
                  </p>
                </div>
              )}

              {/* Quantity Input */}
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register("quantity")}
                  min={selectedService.minQuantity}
                  max={selectedService.maxQuantity}
                  className={errors.quantity ? "border-red-500" : ""}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.quantity.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Min: {selectedService.minQuantity}, Max:{" "}
                  {selectedService.maxQuantity}
                </p>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Any additional information..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        {selectedService && (
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service</span>
                <span className="font-medium">{selectedService.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unit Price</span>
                <span className="font-medium">
                  ${selectedService.ourPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Quantity</span>
                <span className="font-medium">{quantity}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-lg">Total</span>
                <span className="font-bold text-xl text-blue-600 flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {totalPrice}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !selectedService}
            className="flex-1 gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Place Order
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
