import React from "react";
import { Link } from "wouter";

const HeroSection: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-r from-blue-900 to-blue-700 text-white">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 space-y-6 mb-8 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Step into <span className="text-secondary">Comfort</span> & <span className="text-secondary">Style</span>
            </h1>
            <p className="text-xl md:pr-12">
              Discover our latest collection of premium footwear designed for performance and everyday wear.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/products?category=men">
                <span className="bg-white text-primary hover:bg-gray-100 py-3 px-8 rounded-md font-semibold transition cursor-pointer inline-block">
                  Shop Men
                </span>
              </Link>
              <Link href="/products?category=women">
                <span className="bg-secondary hover:bg-amber-600 text-white py-3 px-8 rounded-md font-semibold transition cursor-pointer inline-block">
                  Shop Women
                </span>
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 relative">
            <img
              src="https://images.unsplash.com/photo-1600269452121-4f2416e55c28?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
              alt="Featured sneakers"
              className="rounded-lg shadow-xl md:transform md:-rotate-6 md:hover:rotate-0 transition-transform duration-500"
            />
            <div className="absolute bottom-4 left-4 bg-white text-black px-6 py-2 rounded-full shadow-lg flex items-center">
              <span className="font-bold">Limited Edition</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
