import React, { useEffect } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 bg-white shadow-lg transform transition-transform duration-300">
      <div className="flex justify-between items-center p-4 border-b">
        <span className="text-xl font-bold text-primary">
  NorthStarLight
</span>
        <button onClick={onClose} className="text-gray-600">
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <nav className="p-4 flex flex-col space-y-4">
        <Link href="/" onClick={onClose} className="text-neutral-dark hover:text-primary font-medium py-2 border-b border-gray-100">
          Home
        </Link>
        <Link href="/products?category=men" onClick={onClose} className="text-neutral-dark hover:text-primary font-medium py-2 border-b border-gray-100">
          Men
        </Link>
        <Link href="/products?category=women" onClick={onClose} className="text-neutral-dark hover:text-primary font-medium py-2 border-b border-gray-100">
          Women
        </Link>
        <Link href="/products?category=kids" onClick={onClose} className="text-neutral-dark hover:text-primary font-medium py-2 border-b border-gray-100">
          Kids
        </Link>
        <Link href="/products?onSale=true" onClick={onClose} className="text-neutral-dark hover:text-primary font-medium py-2 border-b border-gray-100">
          Sale
        </Link>
      </nav>
    </div>
  );
};

export default MobileMenu;
