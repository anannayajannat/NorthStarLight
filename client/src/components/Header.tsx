import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Heart, ShoppingCart, Menu } from "lucide-react";

interface HeaderProps {
  onMobileMenuToggle: () => void;
  onCartToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle, onCartToggle }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { cart } = useCart();
  
  const itemCount = cart?.itemCount || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
                <span className="text-xl font-bold text-primary">
                    NorthStarLight
                </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-neutral-dark hover:text-primary font-medium">
              Home
            </Link>
            <Link href="/products?category=men" className="text-neutral-dark hover:text-primary font-medium">
              Men
            </Link>
            <Link href="/products?category=women" className="text-neutral-dark hover:text-primary font-medium">
              Women
            </Link>
            <Link href="/products?category=kids" className="text-neutral-dark hover:text-primary font-medium">
              Kids
            </Link>
            <Link href="/products?onSale=true" className="text-neutral-dark hover:text-primary font-medium">
              Sale
            </Link>
          </nav>

          {/* User actions */}
          <div className="flex items-center space-x-4">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="py-1 px-3 rounded-full text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-40 lg:w-60"
              />
              <Button 
                type="submit"
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6"
              >
                <Search size={16} />
              </Button>
            </form>
            
            <Button variant="ghost" size="icon" asChild>
              <Link href={isAuthenticated ? "/account" : "/login"}>
                <User className="h-5 w-5" />
              </Link>
            </Button>
            
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="relative" onClick={onCartToggle}>
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {itemCount}
                </span>
              )}
            </Button>
            
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onMobileMenuToggle}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
