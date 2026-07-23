import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Filters from "@/components/Filters";
import ProductCard from "@/components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductListingProps {}

const ProductListing: React.FC<ProductListingProps> = () => {
  const [location] = useLocation();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSort, setSelectedSort] = useState("featured");
  
  // Extract query parameters from URL
  const queryParams = new URLSearchParams(location.split("?")[1]);
  const category = queryParams.get("category");
  const search = queryParams.get("search");
  const minPrice = queryParams.get("minPrice");
  const maxPrice = queryParams.get("maxPrice");
  const brand = queryParams.get("brand");
  const featured = queryParams.get("featured");
  const bestSeller = queryParams.get("bestSeller");
  const newArrivals = queryParams.get("newArrivals");
  const onSale = queryParams.get("onSale");

  // Build query string for API request
  const buildQueryString = () => {
    const params = new URLSearchParams();
    
    if (category) params.append("category", category);
    if (search) params.append("search", search);
    if (minPrice) params.append("minPrice", minPrice);
    if (maxPrice) params.append("maxPrice", maxPrice);
    if (brand) params.append("brand", brand);
    if (featured) params.append("featured", featured);
    if (bestSeller) params.append("bestSeller", bestSeller);
    if (newArrivals) params.append("newArrivals", newArrivals);
    if (onSale) params.append("onSale", onSale);
    
    // Add sort parameter based on selected sort option
    if (selectedSort && selectedSort !== "featured") {
      params.append("sort", selectedSort);
    }
    
    params.append("page", currentPage.toString());
    params.append("limit", "9");
    
    return params.toString();
  };

  // Fetch products with filtering, sorting, and pagination
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/products?${buildQueryString()}`],
    keepPreviousData: true,
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [category, search, minPrice, maxPrice, brand, featured, bestSeller, newArrivals, onSale, selectedSort]);

  // Handle error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Page title based on category or search
  const getPageTitle = () => {
    if (search) return `Search Results: "${search}"`;
    if (category === "men") return "Men's Shoes";
    if (category === "women") return "Women's Shoes";
    if (category === "kids") return "Kids' Shoes";
    if (onSale === "true") return "Sale Items";
    if (newArrivals === "true") return "New Arrivals";
    if (bestSeller === "true") return "Best Sellers";
    return "All Products";
  };

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">{getPageTitle()}</h2>
          <div className="flex space-x-3">
            {category !== "men" && (
              <Button
                variant={category === "men" ? "default" : "outline"}
                className="font-medium"
                asChild
              >
                <a href="/products?category=men">Men</a>
              </Button>
            )}
            {category !== "women" && (
              <Button
                variant={category === "women" ? "default" : "outline"}
                className="font-medium"
                asChild
              >
                <a href="/products?category=women">Women</a>
              </Button>
            )}
            {category !== "kids" && (
              <Button
                variant={category === "kids" ? "default" : "outline"}
                className="font-medium"
                asChild
              >
                <a href="/products?category=kids">Kids</a>
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4 pr-0 lg:pr-8">
            <Filters
              minPrice={minPrice ? parseInt(minPrice) : 0}
              maxPrice={maxPrice ? parseInt(maxPrice) : 300}
              selectedBrands={brand ? [brand] : []}
            />
          </div>

          {/* Product Grid */}
          <div className="lg:w-3/4 mt-6 lg:mt-0">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-500">
                {isLoading
                  ? "Loading products..."
                  : `Showing ${data?.products.length || 0} of ${data?.pagination.total || 0} products`}
              </div>
              <div className="flex items-center">
                <label className="text-sm text-gray-600 mr-2">Sort by:</label>
                <Select
                  value={selectedSort}
                  onValueChange={(value) => setSelectedSort(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="name_asc">Name: A to Z</SelectItem>
                    <SelectItem value="name_desc">Name: Z to A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm h-80 animate-pulse">
                    <div className="bg-gray-200 h-56"></div>
                    <div className="p-4">
                      <div className="bg-gray-200 h-4 w-2/3 mb-2"></div>
                      <div className="bg-gray-200 h-3 w-1/2 mb-4"></div>
                      <div className="flex justify-between items-center">
                        <div className="bg-gray-200 h-4 w-1/4"></div>
                        <div className="bg-gray-200 h-8 w-1/4 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.products.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No products found. Try adjusting your filters.</p>
              </div>
            )}

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  
                  {[...Array(data.pagination.totalPages)].map((_, i) => {
                    // Show at most 5 page links
                    if (
                      i === 0 || // First page
                      i === data.pagination.totalPages - 1 || // Last page
                      (i >= currentPage - 2 && i <= currentPage) || // 2 pages before current
                      (i <= currentPage + 1 && i > currentPage) // 1 page after current
                    ) {
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={currentPage === i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    
                    // Show ellipsis for skipped pages
                    if (
                      (i === 1 && currentPage > 3) || 
                      (i === data.pagination.totalPages - 2 && currentPage < data.pagination.totalPages - 2)
                    ) {
                      return (
                        <PaginationItem key={i}>
                          <span className="px-4">...</span>
                        </PaginationItem>
                      );
                    }
                    
                    return null;
                  })}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(data.pagination.totalPages, currentPage + 1))}
                      disabled={currentPage === data.pagination.totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductListing;
