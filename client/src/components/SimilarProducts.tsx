import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import useTrackInteraction from '@/hooks/useTrackInteraction';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

interface SimilarProductsProps {
  productId: number;
  limit?: number;
}

const SimilarProducts: React.FC<SimilarProductsProps> = ({ productId, limit = 4 }) => {
  const { trackClick, trackAddToCart } = useTrackInteraction();
  const { addToCart, isAddingToCart } = useCartActions();
  const { toast } = useToast();
  
  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ['/api/products', productId, 'similar'],
    enabled: !!productId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(limit)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-square w-full bg-gray-200 animate-pulse" />
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !products || products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No similar products found.</p>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const handleProductClick = (product: Product) => {
    trackClick(product.id, { source: 'similar_products', referringProductId: productId });
  };
  
  const handleAddToCart = async (product: Product, e: React.MouseEvent) => {
    e.preventDefault(); // Stop event from bubbling to parent Link
    e.stopPropagation();
    
    try {
      await addToCart(product.id, 1);
      trackAddToCart(product.id, { source: 'similar_products', referringProductId: productId });
      
      toast({
        title: "Added to cart",
        description: `৳{product.name} has been added to your cart.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not add product to cart. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.slice(0, limit).map((product) => (
        <div key={product.id} className="relative group">
          <Link 
            href={`/product/৳{product.id}`}
            onClick={() => handleProductClick(product)}
          >
            <Card className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg">
              <div className="aspect-square w-full relative overflow-hidden">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <p className="text-gray-400">No image</p>
                  </div>
                )}
                
                {/* Product badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.isNew && (
                    <Badge className="bg-green-500">NEW</Badge>
                  )}
                  {product.isBestSeller && (
                    <Badge variant="secondary">BEST SELLER</Badge>
                  )}
                  {product.isSale && (
                    <Badge variant="destructive">SALE</Badge>
                  )}
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                {product.brand && (
                  <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
                )}
                
                <div className="mt-1">
                  {product.salePrice ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">৳{formatPrice(product.salePrice)}</span>
                      <span className="text-sm text-gray-500 line-through">৳{formatPrice(product.price)}</span>
                    </div>
                  ) : (
                    <span className="font-bold text-gray-900">৳{formatPrice(product.price)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <div className="absolute bottom-4 left-0 right-0 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full gap-2 bg-gray-900 text-white hover:bg-gray-700"
              onClick={(e) => handleAddToCart(product, e)}
              disabled={isAddingToCart}
            >
              {isAddingToCart ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {isAddingToCart ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SimilarProducts;