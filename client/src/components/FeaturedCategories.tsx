import React from "react";
import { Link } from "wouter";

const categories = [
  {
    id: "running",
    name: "Running",
    description: "Performance & Style",
    imageUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80"
  },
  {
    id: "basketball",
    name: "Basketball",
    description: "Court-Ready Designs",
    imageUrl: "https://images.unsplash.com/photo-1605348532760-6753d2c43329?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80"
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    description: "Everyday Comfort",
    imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80"
  },
  {
    id: "training",
    name: "Training",
    description: "Built for Performance",
    imageUrl: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80"
  }
];

const FeaturedCategories: React.FC = () => {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8 text-center">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link key={category.id} href={`/products?category=${category.id}`}>
              <a className="relative rounded-lg overflow-hidden group">
                <img 
                  src={category.imageUrl} 
                  alt={`${category.name} shoes`} 
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-bold group-hover:text-secondary transition">{category.name}</h3>
                  <p className="text-sm">{category.description}</p>
                </div>
              </a>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
