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

interface ProductContextType {
  // Products state
  products: Product[];
  filteredProducts: Product[];
  bestSellers: Product[];
  featuredProducts: Product[];
  newArrivals: Product[];
  onSaleProducts: Product[];
  
  // Categories state
  categories: Category[];
  
  // Filter state
  filters: ProductFilterParams;
  setFilters: (filters: ProductFilterParams) => void;
  
  // Sort options
  sortOptions: ProductSortOption[];
  selectedSort: string;
  setSelectedSort: (sort: string) => void;
  
  // Loading states
  isLoading: boolean;
  isFilteredLoading: boolean;
  
  // Pagination
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  productsPerPage: number;
  setCurrentPage: (page: number) => void;
  setProductsPerPage: (limit: number) => void;
  
  // Filter operations
  availableBrands: string[];
  priceRange: { min: number; max: number };
  
  // Product operations
  getProductById: (id: number) => Product | undefined;
  getSimilarProducts: (productId: number, limit?: number) => Promise<Product[]>;
  getFrequentlyBoughtTogether: (productId: number, limit?: number) => Promise<Product[]>;
  
  // Refresh operations
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
  
  // Configure sort options
  const sortOptions: ProductSortOption[] = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Name: A-Z', value: 'name_asc' },
    { label: 'Name: Z-A', value: 'name_desc' },
    { label: 'Best Selling', value: 'bestselling' }
  ];
  
  // Fetch all products
  const { 
    data: productsData, 
    isLoading: isProductsLoading,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['/api/products'],
  });
  
  // Fetch filtered products
  const { 
    data: filteredData, 
    isLoading: isFilteredLoading,
    refetch: refetchFiltered
  } = useQuery({
    queryKey: ['/api/products', filters],
    enabled: Object.keys(filters).length > 0
  });
  
  // Fetch categories
  const { 
    data: categoriesData, 
    isLoading: isCategoriesLoading,
    refetch: refetchCategories
  } = useQuery({
    queryKey: ['/api/categories'],
  });
  
  // Fetch best sellers
  const { 
    data: bestSellersData, 
    isLoading: isBestSellersLoading
  } = useQuery({
    queryKey: ['/api/products/best-sellers'],
  });
  
  // Derived state
  const products: Product[] = productsData?.products || [];
  const filteredProducts: Product[] = filteredData?.products || [];
  const totalProducts: number = filteredData?.pagination?.total || 0;
  const totalPages: number = filteredData?.pagination?.totalPages || 1;
  const categories: Category[] = categoriesData || [];
  const bestSellers: Product[] = bestSellersData || [];
  
  // For now, these are placeholders - would connect to real API endpoints later
  const featuredProducts: Product[] = products.filter(p => p.isFeatured);
  const newArrivals: Product[] = products.filter(p => p.isNew);
  const onSaleProducts: Product[] = products.filter(p => p.isSale);
  
  // Calculate available brands and price range from products
  const availableBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  const priceRange = {
    min: Math.min(...products.map(p => p.salePrice || p.price)),
    max: Math.max(...products.map(p => p.price))
  };
  
  // Effect to update page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.category, filters.brand, filters.search, filters.minPrice, filters.maxPrice]);
  
  // Effect to update filters when page changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      page: currentPage
    }));
  }, [currentPage]);
  
  // Effect to update filters when items per page changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      limit: productsPerPage
    }));
  }, [productsPerPage]);
  
  // Effect to update filters when sort changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      sort: selectedSort
    }));
  }, [selectedSort]);
  
  // Helper methods
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
  
  // Overall loading state
  const isLoading = isProductsLoading || isCategoriesLoading || isBestSellersLoading;
  
  const value = {
    // Products state
    products,
    filteredProducts,
    bestSellers,
    featuredProducts,
    newArrivals,
    onSaleProducts,
    
    // Categories state
    categories,
    
    // Filter state
    filters,
    setFilters,
    
    // Sort options
    sortOptions,
    selectedSort,
    setSelectedSort,
    
    // Loading states
    isLoading,
    isFilteredLoading,
    
    // Pagination
    totalProducts,
    currentPage,
    totalPages,
    productsPerPage,
    setCurrentPage,
    setProductsPerPage,
    
    // Filter operations
    availableBrands,
    priceRange,
    
    // Product operations
    getProductById,
    getSimilarProducts,
    getFrequentlyBoughtTogether,
    
    // Refresh operations
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