import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, CreditCard, ArrowLeft } from "lucide-react";

const checkoutSchema = z.object({
  shippingAddress: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "ZIP code is required"),
    country: z.string().min(1, "Country is required"),
  }),
  paymentMethod: z.enum(["credit_card", "paypal"]),
  cardDetails: z.object({
    cardNumber: z.string().min(16, "Card number must be 16 digits").max(16),
    cardName: z.string().min(1, "Name on card is required"),
    expMonth: z.string().min(1, "Expiry month is required"),
    expYear: z.string().min(1, "Expiry year is required"),
    cvc: z.string().min(3, "CVC is required").max(4),
  }).optional().refine(data => {
    if (data) return true;
    return false;
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

const states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", 
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", 
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", 
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", 
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", 
  "New Hampshire", "New Jersey", "New Mexico", "New York", 
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", 
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", 
  "West Virginia", "Wisconsin", "Wyoming"
];

const Checkout: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [_, navigate] = useLocation();
  const { cart, clearCart, refetchCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingAddress: {
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        address: user?.address || "",
        city: user?.city || "",
        state: user?.state || "",
        zipCode: user?.zipCode || "",
        country: "United States",
      },
      paymentMethod: "credit_card",
    },
  });

  const paymentMethod = form.watch("paymentMethod");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login?redirect=checkout");
    }
  }, [isAuthenticated, navigate]);

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (cart && cart.items.length === 0 && !orderComplete) {
      toast({
        title: "Your cart is empty",
        description: "Please add items to your cart before checkout.",
        variant: "destructive",
      });
      navigate("/cart");
    }
  }, [cart, navigate, orderComplete, toast]);

  const onSubmit = async (data: CheckoutFormValues) => {
    try {
      setIsProcessing(true);
      
      // 1. Create order
      const orderResponse = await apiRequest("POST", "/api/orders", {
        shippingAddress: data.shippingAddress,
        paymentMethod: data.paymentMethod,
      });
      
      const order = await orderResponse.json();
      setOrderId(order.id);
      
      // 2. Process payment
      await apiRequest("POST", "/api/payments", {
        orderId: order.id,
        amount: cart?.totals.total,
        paymentMethod: data.paymentMethod,
        cardDetails: data.paymentMethod === "credit_card" ? data.cardDetails : undefined,
      });
      
      // 3. Clear cart and show success
      await clearCart();
      await refetchCart();
      setOrderComplete(true);
      
      toast({
        title: "Order placed successfully",
        description: `Your order #${order.id} has been placed.`,
      });
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex justify-center items-center w-24 h-24 bg-green-100 rounded-full mb-6">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Order Complete!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your purchase. Your order #{orderId} has been placed and will be processed shortly.
          </p>
          <Button asChild>
            <a href="/account">View Order Details</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!cart || !isAuthenticated) {
    return <div className="container mx-auto py-12 px-4 text-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shippingAddress.firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shippingAddress.lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="shippingAddress.address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shippingAddress.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="shippingAddress.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {states.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shippingAddress.zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="shippingAddress.country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="credit_card" id="credit_card" />
                              <Label htmlFor="credit_card" className="flex items-center">
                                <CreditCard className="h-5 w-5 mr-2" />
                                Credit / Debit Card
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="paypal" id="paypal" />
                              <Label htmlFor="paypal">PayPal</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {paymentMethod === "credit_card" && (
                    <div className="space-y-4 mt-4 pt-4 border-t">
                      <FormField
                        control={form.control}
                        name="cardDetails.cardNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Card Number</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="1234 5678 9012 3456" 
                                maxLength={16}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="cardDetails.cardName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name on Card</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="John Doe" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="cardDetails.expMonth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expiry Month</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="MM" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => {
                                    const month = (i + 1).toString().padStart(2, "0");
                                    return (
                                      <SelectItem key={month} value={month}>
                                        {month}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="cardDetails.expYear"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expiry Year</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="YY" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({ length: 10 }, (_, i) => {
                                    const year = (new Date().getFullYear() + i).toString().slice(-2);
                                    return (
                                      <SelectItem key={year} value={year}>
                                        {year}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="cardDetails.cvc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CVC</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="123" 
                                  maxLength={4}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/cart")}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cart
                </Button>
                
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Place Order"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between py-2">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-gray-100 rounded mr-3">
                      <img 
                        src={item.product.imageUrl} 
                        alt={item.product.name} 
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity}
                        {item.variant && ` | Size: ${item.variant.size}`}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium">Tk{item.subtotal.toFixed(2)}</p>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Tk{cart.totals.subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{cart.totals.shipping === 0 ? "Free" : `Tk${cart.totals.shipping.toFixed(2)}`}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>Tk{cart.totals.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
