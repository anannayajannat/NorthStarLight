import React from "react";
import HeroSection from "@/components/HeroSection";
import FeaturedCategories from "@/components/FeaturedCategories";
import BestSellers from "@/components/BestSellers";
import Newsletter from "@/components/Newsletter";
import Features from "@/components/Features";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // Fetch user if authenticated (prefetch for header)
  useQuery({
    queryKey: ["/api/auth/me"],
    enabled: isAuthenticated,
  });

  return (
    <div>
      <HeroSection />
      <FeaturedCategories />
      <BestSellers />
      <Newsletter />
      <Features />
    </div>
  );
};

export default Home;
