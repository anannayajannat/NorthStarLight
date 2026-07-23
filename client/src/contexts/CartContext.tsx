import React, { createContext, ReactNode, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: number;
  name: string;
  brand: string;
  description: string;
  price: number;
  salePrice?: number;
  imageUrl?: string;
  categoryId?: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNew?: boolean;
  isSale?: boolean;
}

interface ProductVariant {
  id: number;
  productId: number;
  size: string;
  color: string;
  stock: number;
  sku: string;
}

interface CartItem {
  id: number;
  product: Product;
  variant?: ProductVariant | null;
  quantity: number;
  price: number;
  subtotal: number;
}

interface CartTotals {
  subtotal: number;
  shipping: number;
  total: number;
}

interface Cart {
  id: number;
  items: CartItem[];
  totals: CartTotals;
  itemCount: number;
}

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  addItem: (productId: number, quantity: number, variantId?: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  updateItemQuantity: (itemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refetchCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextType>({
  cart: null,
  isLoading: false,
  addItem: async () => {},
  removeItem: async () => {},
  updateItemQuantity: async () => {},
  clearCart: async () => {},
  refetchCart: async () => {},
});

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();

  // Fetch cart data
  const { data: cart, isLoading, refetch } = useQuery<Cart>({
    queryKey: ["/api/cart"],
    refetchOnWindowFocus: false,
  });

  // Refetch cart after login/logout
  useEffect(() => {
    let lastAuthState: unknown = queryClient.getQueryData(["/api/auth/me"]);

    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      const authData = queryClient.getQueryData(["/api/auth/me"]);
      if (authData !== lastAuthState) {
        lastAuthState = authData;
        if (authData) {
          refetch();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, refetch]);

  const addItem = async (productId: number, quantity: number, variantId?: number): Promise<void> => {
    await apiRequest("POST", "/api/cart/items", {
      productId,
      quantity,
      variantId,
    });
    await refetch();
  };

  const removeItem = async (itemId: number): Promise<void> => {
    await apiRequest("DELETE", `/api/cart/items/${itemId}`, {});
    await refetch();
  };

  const updateItemQuantity = async (itemId: number, quantity: number): Promise<void> => {
    await apiRequest("PUT", `/api/cart/items/${itemId}`, { quantity });
    await refetch();
  };

  const clearCart = async (): Promise<void> => {
    await apiRequest("DELETE", "/api/cart", {});
    await refetch();
  };

  const refetchCart = async (): Promise<void> => {
    await refetch();
  };

  return (
    <CartContext.Provider
      value={{
        cart: cart || null,
        isLoading,
        addItem,
        removeItem,
        updateItemQuantity,
        clearCart,
        refetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
