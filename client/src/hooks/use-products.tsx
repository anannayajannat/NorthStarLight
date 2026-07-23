import { useQuery } from "@tanstack/react-query";

export interface Product {
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

export interface ProductsResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useProducts = (queryParams: Record<string, string | number | boolean | undefined> = {}) => {
  // Build query string
  const queryString = Object.entries(queryParams)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");

  const queryKey = [`/api/products${queryString ? `?${queryString}` : ""}`];

  return useQuery<ProductsResponse>({
    queryKey,
    keepPreviousData: true,
  });
};

export const useBestSellers = (limit: number = 4) => {
  return useQuery<Product[]>({
    queryKey: [`/api/products/best-sellers?limit=${limit}`],
  });
};

export const useNewArrivals = (limit: number = 4) => {
  return useQuery<Product[]>({
    queryKey: [`/api/products/new-arrivals?limit=${limit}`],
  });
};

export const useProductDetail = (id: string | number | undefined) => {
  return useQuery({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["/api/categories"],
  });
};
