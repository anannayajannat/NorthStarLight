import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// This is a simpler hook for components that only need to perform cart actions
// without direct access to the full cart context
export function useCartActions() {
  const queryClient = useQueryClient();
  
  const addToCartMutation = useMutation({
    mutationFn: async ({ 
      productId, 
      quantity, 
      variantId 
    }: { 
      productId: number; 
      quantity: number; 
      variantId?: number;
    }) => {
      return apiRequest("POST", "/api/cart/items", {
        productId,
        quantity,
        variantId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
  });

  const addToCart = (productId: number, quantity: number = 1, variantId?: number) => {
    return addToCartMutation.mutate({ productId, quantity, variantId });
  };

  const removeFromCart = async (itemId: number): Promise<void> => {
    await apiRequest("DELETE", `/api/cart/items/${itemId}`, {});
    queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
  };

  const updateQuantity = async (itemId: number, quantity: number): Promise<void> => {
    await apiRequest("PUT", `/api/cart/items/${itemId}`, { quantity });
    queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
  };

  const clearCart = async (): Promise<void> => {
    await apiRequest("DELETE", "/api/cart", {});
    queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
  };

  return {
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isAddingToCart: addToCartMutation.isPending,
  };
}