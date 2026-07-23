import React, { useState } from "react";
import { Link } from "wouter";
import { Heart, ShoppingBag, Star, StarHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useCartActions } from "@/hooks/use-cart-actions";

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

interface ProductCardProps {
  product: Product;
  showAddToCart?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, showAddToCart = true }) => {
  const { refetchCart } = useCart();
  const { toast } = useToast();
  const { addToCart, isAddingToCart } = useCartActions();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await addToCart(product.id, 1);
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
      refetchCart();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not add to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div className="product-card bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md cursor-pointer">
        <div className="relative">
          <img 
            src={product.imageUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"} 
            alt={product.name} 
            className="w-full h-56 object-cover"
          />
          <div className="absolute top-3 right-3 flex space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="secondary" className="rounded-full bg-white hover:bg-gray-100 h-9 w-9">
              <Heart className="h-5 w-5 text-gray-600 hover:text-red-500" />
            </Button>
          </div>
          
          {product.isBestSeller && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary">BEST SELLER</Badge>
            </div>
          )}
          
          {product.isNew && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-green-500">NEW</Badge>
            </div>
          )}
          
          {product.isSale && (
            <div className="absolute top-3 left-3">
              <Badge variant="destructive">SALE</Badge>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-medium mb-1">{product.name}</h3>
          <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
          
          <div className="flex items-center justify-between">
            <div>
              {product.salePrice ? (
                <>
                  <span className="font-semibold text-lg">${product.salePrice.toFixed(2)}</span>
                  <span className="text-sm text-gray-500 line-through ml-2">${product.price.toFixed(2)}</span>
                </>
              ) : (
                <span className="font-semibold text-lg">${product.price.toFixed(2)}</span>
              )}
            </div>
            
            {showAddToCart ? (
              <Button 
                size="sm"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="flex items-center gap-1"
              >
                <ShoppingBag className="h-4 w-4" />
                {isAddingToCart ? "Adding..." : "Add"}
              </Button>
            ) : (
              <div className="flex items-center">
                <div className="flex">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <StarHalf className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <span className="text-xs text-gray-500 ml-1">(124)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
