import React, { useEffect } from "react";
import { Link } from "wouter";
import { X, Trash2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

interface CartOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartOverlay: React.FC<CartOverlayProps> = ({ isOpen, onClose }) => {
  const { cart, removeItem, updateItemQuantity, isLoading } = useCart();
  const { toast } = useToast();

  // Prevent scrolling when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-lg transform transition-transform duration-300">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Your Cart ({cart?.itemCount || 0})</h2>
          <button onClick={onClose} className="text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-[calc(100%-170px)]">
            <p>Loading cart...</p>
          </div>
        ) : cart?.items && cart.items.length > 0 ? (
          <div className="overflow-y-auto h-[calc(100%-170px)]">
            {cart.items.map((item) => (
              <div key={item.id} className="p-4 border-b flex">
                <div className="w-20 h-20 bg-gray-100 rounded">
                  <img 
                    src={item.product.imageUrl} 
                    alt={item.product.name} 
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                
                <div className="ml-4 flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{item.product.name}</h3>
                    <button 
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-500">{item.product.brand}</p>
                  {item.variant && (
                    <p className="text-sm text-gray-500">
                      Size: {item.variant.size} | Color: {item.variant.color}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center">
                      <button 
                        className="w-6 h-6 border rounded-l flex items-center justify-center bg-gray-100"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 h-6 border-t border-b flex items-center justify-center">
                        {item.quantity}
                      </span>
                      <button 
                        className="w-6 h-6 border rounded-r flex items-center justify-center bg-gray-100"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="font-semibold">${item.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-[calc(100%-170px)]">
            <p className="text-gray-500">Your cart is empty</p>
          </div>
        )}
        
        <div className="p-4 bg-gray-50 absolute bottom-0 w-full">
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span className="font-semibold">${cart?.totals?.subtotal.toFixed(2) || "0.00"}</span>
          </div>
          
          <div className="flex justify-between mb-4">
            <span>Shipping</span>
            <span className="font-semibold">Free</span>
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex justify-between mb-4 pt-2">
            <span className="font-bold">Total</span>
            <span className="font-bold">${cart?.totals?.total.toFixed(2) || "0.00"}</span>
          </div>
          
          <Button 
            className="w-full font-medium"
            disabled={!cart?.items.length}
            asChild
          >
            <Link href="/checkout" onClick={onClose}>
              Proceed to Checkout
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            className="mt-2 w-full font-medium"
            onClick={onClose}
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CartOverlay;
