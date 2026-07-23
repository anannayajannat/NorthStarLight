import React from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Cart: React.FC = () => {
  const { cart, removeItem, updateItemQuantity, isLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeItem(itemId);
      toast({
        title: "Item removed",
        description: "The item has been removed from your cart.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not remove item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateQuantity = async (itemId: number, quantity: number) => {
    if (quantity < 1) return;
    
    try {
      await updateItemQuantity(itemId, quantity);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update quantity. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to checkout.",
        variant: "destructive",
      });
      navigate("/login?redirect=checkout");
      return;
    }
    
    navigate("/checkout");
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Your Cart</h1>
        <p className="text-gray-600 mt-2">
          {cart?.itemCount
            ? `You have ৳{cart.itemCount} item৳{cart.itemCount > 1 ? "s" : ""} in your cart`
            : "Your cart is empty"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : cart?.items && cart.items.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-start py-4 border-b last:border-b-0">
                    <div className="w-24 h-24 bg-gray-100 rounded flex-shrink-0">
                      <img 
                        src={item.product.imageUrl} 
                        alt={item.product.name} 
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    
                    <div className="ml-4 flex-grow">
                      <div className="flex justify-between">
                        <Link href={`/products/৳{item.product.id}`}>
                          <a className="font-medium text-lg hover:text-primary">
                            {item.product.name}
                          </a>
                        </Link>
                        <button 
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-500">{item.product.brand}</p>
                      
                      {item.variant && (
                        <p className="text-sm text-gray-500 mt-1">
                          Size: {item.variant.size} | Color: {item.variant.color}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center border rounded">
                          <button 
                            className="px-3 py-1 hover:bg-gray-100"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="px-4 py-1 border-x">{item.quantity}</span>
                          <button 
                            className="px-3 py-1 hover:bg-gray-100"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium">৳{item.price.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">
                            Subtotal: ৳{item.subtotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>৳{cart.totals.subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{cart.totals.shipping === 0 ? "Free" : `৳৳{cart.totals.shipping.toFixed(2)}`}</span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>৳{cart.totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col">
                <Button 
                  className="w-full mb-2"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Link href="/products">
                  <a className="w-full text-center text-primary hover:text-blue-700 font-medium">
                    Continue Shopping
                  </a>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex justify-center items-center w-24 h-24 bg-gray-100 rounded-full mb-6">
            <ShoppingBag className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Looks like you haven't added any items to your cart yet.</p>
          <Button asChild>
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Cart;
