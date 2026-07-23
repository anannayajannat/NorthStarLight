import { useQuery, keepPreviousData } from "@tanstack/react-query";

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

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  isActive?: boolean;
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
  const queryString = Object.entries(queryParams)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");

  const queryKey = [`/api/products${queryString ? `?${queryString}` : ""}`];

  return useQuery<ProductsResponse>({
    queryKey,
    placeholderData: keepPreviousData,
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
  return useQuery<Product>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });
};

export const useCategories = () => {
  return useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
};
