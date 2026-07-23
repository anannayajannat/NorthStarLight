import React from "react";
import { Truck, RotateCcw, Shield, Headphones } from "lucide-react";

const Features: React.FC = () => {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Truck className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Free Shipping</h3>
            <p className="text-gray-600">On all orders over $75</p>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <RotateCcw className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Easy Returns</h3>
            <p className="text-gray-600">30-day return policy</p>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Secure Shopping</h3>
            <p className="text-gray-600">100% protected checkout</p>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Headphones className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">24/7 Support</h3>
            <p className="text-gray-600">We're here to help</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
