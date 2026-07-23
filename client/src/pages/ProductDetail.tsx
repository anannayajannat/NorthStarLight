import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Heart, Star, StarHalf, ShoppingBag, Truck, RotateCcw, Shield } from "lucide-react";
import SimilarProducts from "@/components/SimilarProducts";
import FrequentlyBoughtTogether from "@/components/FrequentlyBoughtTogether";
import ShoeMeasurements from "@/components/ShoeMeasurements";
import ProductModelViewer from "@/components/ProductModelViewer";
import useTrackInteraction from "@/hooks/useTrackInteraction";
import { useCartActions } from "@/hooks/use-cart-actions";

const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { refetchCart } = useCart();
  const { trackView, trackAddToCart, trackClick } = useTrackInteraction();
  const { addToCart, isAddingToCart } = useCartActions();
  
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'measurements' | '3d' | 'reviews' | 'shipping'>('details');

  // Fetch product details
  const { data: product, isLoading, error } = useQuery({
    queryKey: [`/api/products/${id}`],
  });
  
  // Track product view when product data is loaded
  useEffect(() => {
    if (product?.id) {
      trackView(product.id);
    }
  }, [product?.id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2 bg-gray-200 h-[500px] animate-pulse rounded-lg"></div>
          <div className="md:w-1/2 space-y-4">
            <div className="h-8 bg-gray-200 w-3/4 animate-pulse rounded"></div>
            <div className="h-6 bg-gray-200 w-1/2 animate-pulse rounded"></div>
            <div className="h-10 bg-gray-200 w-1/3 animate-pulse rounded"></div>
            <div className="h-4 bg-gray-200 w-full animate-pulse rounded"></div>
            <div className="h-4 bg-gray-200 w-full animate-pulse rounded"></div>
            <div className="h-4 bg-gray-200 w-3/4 animate-pulse rounded"></div>
            <div className="space-y-2 pt-4">
              <div className="h-6 bg-gray-200 w-1/4 animate-pulse rounded"></div>
              <div className="grid grid-cols-5 gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 animate-pulse rounded-full"></div>
                ))}
              </div>
            </div>
            <div className="space-y-2 pt-4">
              <div className="h-6 bg-gray-200 w-1/4 animate-pulse rounded"></div>
              <div className="grid grid-cols-5 gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 animate-pulse rounded-full"></div>
                ))}
              </div>
            </div>
            <div className="h-12 bg-gray-200 w-full animate-pulse rounded mt-6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h2>
        <p className="text-gray-600 mb-8">The product you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/products")}>Continue Shopping</Button>
      </div>
    );
  }

  const handleAddToCart = async () => {
    // Find the selected variant if size and color are selected
    let selectedVariant = null;
    
    if (product.variants && product.variants.length > 0) {
      if (!selectedSize) {
        toast({
          title: "Please select a size",
          variant: "destructive",
        });
        return;
      }
      
      if (product.variants.some(v => v.color) && !selectedColor) {
        toast({
          title: "Please select a color",
          variant: "destructive",
        });
        return;
      }
      
      selectedVariant = product.variants.find(
        v => v.size === selectedSize && (!v.color || v.color === selectedColor)
      );
      
      if (!selectedVariant) {
        toast({
          title: "Selected combination is not available",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedVariant.stock !== null && selectedVariant.stock < quantity) {
        toast({
          title: "Not enough stock available",
          description: `Only ${selectedVariant.stock} items available`,
          variant: "destructive",
        });
        return;
      }
    }
    
    try {
      // Add to cart using our cart actions hook
      await addToCart(
        product.id, 
        quantity, 
        selectedVariant ? selectedVariant.id : undefined
      );
      
      // Track add to cart interaction
      trackAddToCart(product.id, { 
        quantity,
        variant: selectedVariant ? {
          size: selectedSize,
          color: selectedColor
        } : undefined
      });
      
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
      
      // Refetch cart to update cart count in header
      refetchCart();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not add to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // Get unique sizes and colors from variants
  const sizes = product.variants 
    ? [...new Set(product.variants.map(v => v.size))].filter(Boolean)
    : [];
    
  const colors = product.variants 
    ? [...new Set(product.variants.map(v => v.color))].filter(Boolean)
    : [];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Product Image */}
        <div className="md:w-1/2 rounded-lg overflow-hidden">
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-auto object-cover rounded-lg transition-transform duration-300 hover:scale-125 cursor-zoom-in"
          />
        </div>
        
        {/* Product Details */}
        <div className="md:w-1/2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.isBestSeller && (
                <Badge variant="secondary">BEST SELLER</Badge>
              )}
              {product.isNew && (
                <Badge className="bg-green-500">NEW</Badge>
              )}
              {product.isSale && (
                <Badge variant="destructive">SALE</Badge>
              )}
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-lg text-gray-600 mt-1">{product.brand}</p>
            
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <StarHalf className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-gray-500 ml-2">(124 reviews)</span>
            </div>
            
            <div className="mt-4">
              {product.salePrice ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">Tk {formatPrice(product.salePrice)}</span>
                  <span className="text-lg text-gray-500 line-through">Tk {formatPrice(product.price)}</span>
                  <span className="text-sm font-medium text-red-600">
                    {Math.round(((product.price - product.salePrice) / product.price) * 100)}% OFF
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-gray-900">Tk {formatPrice(product.price)}</span>
              )}
            </div>
          </div>
          
          <p className="text-gray-700">{product.description}</p>
          
          {/* Size Selection */}
          {sizes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Select Size</h3>
              <RadioGroup 
                value={selectedSize || ""} 
                onValueChange={setSelectedSize}
                className="grid grid-cols-5 gap-2"
              >
                {sizes.map(size => (
                  <div key={size}>
                    <RadioGroupItem 
                      id={`size-${size}`} 
                      value={size} 
                      className="sr-only"
                    />
                    <Label
                      htmlFor={`size-${size}`}
                      className={`flex items-center justify-center h-10 rounded-md border cursor-pointer
                        ${selectedSize === size 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`
                      }
                    >
                      {size}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
          
          {/* Color Selection */}
          {colors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Select Color</h3>
              <RadioGroup 
                value={selectedColor || ""} 
                onValueChange={setSelectedColor}
                className="grid grid-cols-5 gap-2"
              >
                {colors.map(color => (
                  <div key={color}>
                    <RadioGroupItem 
                      id={`color-${color}`} 
                      value={color} 
                      className="sr-only"
                    />
                    <Label
                      htmlFor={`color-${color}`}
                      className={`flex items-center justify-center h-10 rounded-md border cursor-pointer
                        ${selectedColor === color 
                          ? 'border-primary' 
                          : 'border-gray-200 hover:border-gray-300'}`
                      }
                    >
                      {color}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
          
          {/* Quantity */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quantity</h3>
            <div className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="w-12 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
          </div>
          
          {/* Add to Cart */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              className="flex-1 gap-2"
              onClick={handleAddToCart}
              disabled={isAddingToCart}
            >
              {isAddingToCart ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingBag className="h-5 w-5" />
                  Add to Cart
                </>
              )}
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <Heart className="h-5 w-5" />
              Add to Wishlist
            </Button>
          </div>
          
          {/* Product Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
              <Truck className="h-6 w-6 text-primary mb-2" />
              <span className="font-medium text-sm">Free Shipping</span>
              <span className="text-xs text-gray-500">On orders over $75</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
              <RotateCcw className="h-6 w-6 text-primary mb-2" />
              <span className="font-medium text-sm">Easy Returns</span>
              <span className="text-xs text-gray-500">30-day returns</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
              <Shield className="h-6 w-6 text-primary mb-2" />
              <span className="font-medium text-sm">Secure Checkout</span>
              <span className="text-xs text-gray-500">Protected payment</span>
            </div>
          </div>
          
          {/* Product Details Tabs */}
          <Tabs 
            defaultValue="details" 
            className="w-full pt-6"
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as any);
              if (product?.id) {
                trackClick(product.id, { tab: value });
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="measurements">Size & Fit</TabsTrigger>
              <TabsTrigger value="3d">3D View</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="pt-4">
              <Card className="p-4">
                <p className="text-sm text-gray-700">
                  {product.description || "No details available for this product."}
                </p>
              </Card>
            </TabsContent>
            
            <TabsContent value="measurements" className="pt-4">
              <Card className="p-4">
                <ShoeMeasurements productId={product.id} />
              </Card>
            </TabsContent>
            
            <TabsContent value="3d" className="pt-4">
              <Card className="p-4">
                <ProductModelViewer productId={product.id} />
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews" className="pt-4">
              <Card className="p-4">
                <p className="text-sm text-gray-700">
                  Customer reviews will be displayed here.
                </p>
              </Card>
            </TabsContent>
            
            <TabsContent value="shipping" className="pt-4">
              <Card className="p-4">
                <p className="text-sm text-gray-700">
                  Free standard shipping on all orders over Tk 5000. Delivery within 5-7 business days.
                  <br /><br />
                  We offer a 30-day return policy. Items must be unworn and in original condition with tags attached.
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Similar Products */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Products</h2>
        <SimilarProducts productId={product.id} />
      </div>
      
      {/* Frequently Bought Together */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Bought Together</h2>
        <FrequentlyBoughtTogether productId={product.id} currentProduct={product} />
      </div>
    </div>
  );
};

export default ProductDetail;
