import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

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
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: number;
  productId: number;
  size: string;
  color?: string;
  sku: string;
  stock?: number;
  price?: number;
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

export interface ProductFilterParams {
  category?: number;
  brand?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  limit?: number;
  page?: number;
  featured?: boolean;
  bestSeller?: boolean;
  newArrivals?: boolean;
  onSale?: boolean;
}

export interface ProductSortOption {
  label: string;
  value: string;
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

interface ProductContextType {
  products: Product[];
  filteredProducts: Product[];
  bestSellers: Product[];
  featuredProducts: Product[];
  newArrivals: Product[];
  onSaleProducts: Product[];

  categories: Category[];

  filters: ProductFilterParams;
  setFilters: (filters: ProductFilterParams) => void;

  sortOptions: ProductSortOption[];
  selectedSort: string;
  setSelectedSort: (sort: string) => void;

  isLoading: boolean;
  isFilteredLoading: boolean;

  totalProducts: number;
  currentPage: number;
  totalPages: number;
  productsPerPage: number;
  setCurrentPage: (page: number) => void;
  setProductsPerPage: (limit: number) => void;

  availableBrands: string[];
  priceRange: { min: number; max: number };

  getProductById: (id: number) => Product | undefined;
  getSimilarProducts: (productId: number, limit?: number) => Promise<Product[]>;
  getFrequentlyBoughtTogether: (productId: number, limit?: number) => Promise<Product[]>;

  refetchProducts: () => void;
  refetchCategories: () => void;
}

interface ProductProviderProps {
  children: ReactNode;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const [filters, setFilters] = useState<ProductFilterParams>({
    limit: 12,
    page: 1
  });
  const [selectedSort, setSelectedSort] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [productsPerPage, setProductsPerPage] = useState<number>(12);

  const sortOptions: ProductSortOption[] = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Name: A-Z', value: 'name_asc' },
    { label: 'Name: Z-A', value: 'name_desc' },
    { label: 'Best Selling', value: 'bestselling' }
  ];

  const {
    data: productsData,
    isLoading: isProductsLoading,
    refetch: refetchProducts
  } = useQuery<ProductsResponse>({
    queryKey: ['/api/products'],
  });

  const {
    data: filteredData,
    isLoading: isFilteredLoading,
    refetch: refetchFiltered
  } = useQuery<ProductsResponse>({
    queryKey: ['/api/products', filters],
    enabled: Object.keys(filters).length > 0
  });

  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    refetch: refetchCategories
  } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const {
    data: bestSellersData,
    isLoading: isBestSellersLoading
  } = useQuery<Product[]>({
    queryKey: ['/api/products/best-sellers'],
  });

  const products: Product[] = productsData?.products || [];
  const filteredProducts: Product[] = filteredData?.products || [];
  const totalProducts: number = filteredData?.pagination?.total || 0;
  const totalPages: number = filteredData?.pagination?.totalPages || 1;
  const categories: Category[] = categoriesData || [];
  const bestSellers: Product[] = bestSellersData || [];

  const featuredProducts: Product[] = products.filter(p => p.isFeatured);
  const newArrivals: Product[] = products.filter(p => p.isNew);
  const onSaleProducts: Product[] = products.filter(p => p.isSale);

  const availableBrands = [...new Set(products.map(p => p.brand).filter(Boolean))] as string[];
  const priceRange = {
    min: products.length ? Math.min(...products.map(p => p.salePrice || p.price)) : 0,
    max: products.length ? Math.max(...products.map(p => p.price)) : 0
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.category, filters.brand, filters.search, filters.minPrice, filters.maxPrice]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, page: currentPage }));
  }, [currentPage]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, limit: productsPerPage }));
  }, [productsPerPage]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, sort: selectedSort }));
  }, [selectedSort]);

  const getProductById = (id: number): Product | undefined => {
    return products.find(p => p.id === id);
  };

  const getSimilarProducts = async (productId: number, limit: number = 4): Promise<Product[]> => {
    try {
      const response = await fetch(`/api/products/${productId}/similar?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch similar products');
      return await response.json();
    } catch (error) {
      console.error('Error fetching similar products:', error);
      return [];
    }
  };

  const getFrequentlyBoughtTogether = async (productId: number, limit: number = 4): Promise<Product[]> => {
    try {
      const response = await fetch(`/api/products/${productId}/frequently-bought-together?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch frequently bought together products');
      return await response.json();
    } catch (error) {
      console.error('Error fetching frequently bought together products:', error);
      return [];
    }
  };

  const isLoading = isProductsLoading || isCategoriesLoading || isBestSellersLoading;

  const value: ProductContextType = {
    products,
    filteredProducts,
    bestSellers,
    featuredProducts,
    newArrivals,
    onSaleProducts,
    categories,
    filters,
    setFilters,
    sortOptions,
    selectedSort,
    setSelectedSort,
    isLoading,
    isFilteredLoading,
    totalProducts,
    currentPage,
    totalPages,
    productsPerPage,
    setCurrentPage,
    setProductsPerPage,
    availableBrands,
    priceRange,
    getProductById,
    getSimilarProducts,
    getFrequentlyBoughtTogether,
    refetchProducts,
    refetchCategories
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
