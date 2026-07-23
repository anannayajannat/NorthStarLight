import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useTrackInteraction from '@/hooks/useTrackInteraction';
import { useCartActions } from '@/hooks/use-cart-actions';

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  salePrice?: number;
  categoryId?: number;
  brand?: string;
  imageUrl?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNew?: boolean;
  isSale?: boolean;
}

interface FrequentlyBoughtTogetherProps {
  productId: number;
  currentProduct: Product;
}

const FrequentlyBoughtTogether: React.FC<FrequentlyBoughtTogetherProps> = ({ 
  productId,
  currentProduct
}) => {
  const { toast } = useToast();
  const { trackClick, trackAddToCart } = useTrackInteraction();
  const { addToCart, isAddingToCart } = useCartActions();
  const [selectedProducts, setSelectedProducts] = useState<{[key: number]: boolean}>({});
  
  const { data: products, isLoading, error } = useQuery<Product[]>({
  queryKey: [`/api/products/${productId}/frequently-bought-together`],    enabled: !!productId,
    retry: 1,
  });

  // Initialize all suggested products as selected by default when data loads
  React.useEffect(() => {
    if (products && products.length > 0) {
      const initialSelection = products.reduce((acc, product) => {
        acc[product.id] = true;
        return acc;
      }, {} as {[key: number]: boolean});
      
      setSelectedProducts(initialSelection);
    }
  }, [products]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (error || !products || products.length === 0) {
    return null; // Don't show anything if no frequently bought together products
  }

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const handleCheckboxChange = (productId: number) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
    
    trackClick(productId, { action: 'toggle_selection', source: 'frequently_bought_together' });
  };

  const getSelectedProductsCount = () => {
    return Object.values(selectedProducts).filter(Boolean).length;
  };

  const getTotalPrice = () => {
    let total = 0;
    
    if (products) {
      products.forEach(product => {
        if (selectedProducts[product.id]) {
          total += product.salePrice || product.price;
        }
      });
    }
    
    return total;
  };

  const handleAddToCart = async () => {
    if (getSelectedProductsCount() === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to add to your cart.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Get selected product IDs
      const selectedProductIds = Object.entries(selectedProducts)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => parseInt(id));
      
      // Add each selected product to cart
      await Promise.all(
        selectedProductIds.map(id => addToCart(id, 1))
      );
      
      // Track add to cart events for each product
      selectedProductIds.forEach(id => {
        trackAddToCart(id, { 
          source: 'frequently_bought_together',
          referringProductId: productId 
        });
      });
      
      toast({
        title: "Added to cart",
        description: `${getSelectedProductsCount()} products have been added to your cart.`,
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not add products to cart. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleProductClick = (product: Product) => {
    trackClick(product.id, { source: 'frequently_bought_together', referringProductId: productId });
  };

  return (
    <div className="border rounded-lg p-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Product Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          {/* Current Product */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <div className="relative p-2">
                <img 
                  src={currentProduct.imageUrl} 
                  alt={currentProduct.name} 
                  className="w-full h-32 object-contain"
                />
                <div className="absolute -top-2 -left-2 bg-primary text-white text-xs px-2 py-1 rounded-md">
                  Current Item
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm line-clamp-2 h-10">{currentProduct.name}</h3>
                <p className="font-bold text-gray-900 mt-2">
                  Tk{formatPrice(currentProduct.salePrice || currentProduct.price)}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Suggested Products */}
          {products.slice(0, 3).map((product) => (
            <div className="lg:col-span-1" key={product.id}>
              <Card className="h-full relative">
                <div className="absolute top-2 right-2 z-10">
                  <Checkbox 
                    id={`select-${product.id}`}
                    checked={selectedProducts[product.id] || false}
                    onCheckedChange={() => handleCheckboxChange(product.id)}
                  />
                </div>
                <Link 
                  href={`/product/${product.id}`} 
                  onClick={() => handleProductClick(product)}
                >
                  <div className="p-2">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-32 object-contain"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-sm line-clamp-2 h-10">{product.name}</h3>
                    <p className="font-bold text-gray-900 mt-2">
                      Tk{formatPrice(product.salePrice || product.price)}
                    </p>
                  </CardContent>
                </Link>
              </Card>
            </div>
          ))}
        </div>
        
        {/* Order Summary */}
        <div className="w-full lg:w-64 bg-gray-50 p-4 rounded-md shrink-0">
          <h3 className="font-bold text-lg mb-4">Frequently Bought Together</h3>
          
          <div className="space-y-3 mb-4">
            <p className="text-sm text-gray-600">
              Buy these {getSelectedProductsCount() + 1} items together:
            </p>
            
            <div className="flex justify-between">
              <span className="text-sm">Current item:</span>
              <span className="font-medium">Tk{formatPrice(currentProduct.salePrice || currentProduct.price)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm">Selected items ({getSelectedProductsCount()}):</span>
              <span className="font-medium">Tk{formatPrice(getTotalPrice())}</span>
            </div>
            
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total:</span>
              <span>Tk{formatPrice((currentProduct.salePrice || currentProduct.price) + getTotalPrice())}</span>
            </div>
          </div>
          
          <Button 
            className="w-full gap-2" 
            onClick={handleAddToCart}
            disabled={isAddingToCart}
          >
            {isAddingToCart ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            {isAddingToCart ? "Adding..." : "Add Selected to Cart"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FrequentlyBoughtTogether;