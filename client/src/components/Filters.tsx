import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCategories } from "@/hooks/use-products";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface FiltersProps {
  minPrice?: number;
  maxPrice?: number;
  selectedBrands?: string[];
}

const brands = [
  "Nike",
  "Adidas",
  "New Balance",
  "Under Armour",
  "Puma"
];

const colors = [
  { name: "Black", color: "bg-black" },
  { name: "White", color: "bg-white" },
  { name: "Red", color: "bg-red-500" },
  { name: "Blue", color: "bg-blue-500" },
  { name: "Yellow", color: "bg-yellow-500" },
  { name: "Green", color: "bg-green-500" },
  { name: "Purple", color: "bg-purple-500" },
  { name: "Pink", color: "bg-pink-500" }
];

const Filters: React.FC<FiltersProps> = ({ 
  minPrice = 0, 
  maxPrice = 300,
  selectedBrands = []
}) => {
  const [_, setLocation] = useLocation();
  const { data: categories } = useCategories();
  
  const [priceRange, setPriceRange] = useState<number[]>([minPrice, maxPrice]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [checkedBrands, setCheckedBrands] = useState<string[]>(selectedBrands);

  const handleCategoryChange = (category: string, checked: boolean) => {
    setSelectedCategories(prev => 
      checked 
        ? [...prev, category] 
        : prev.filter(c => c !== category)
    );
  };

  const handleBrandChange = (brand: string, checked: boolean) => {
    setCheckedBrands(prev => 
      checked 
        ? [...prev, brand] 
        : prev.filter(b => b !== brand)
    );
  };

  const handleColorChange = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const handlePriceChange = (values: number[]) => {
    setPriceRange(values);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(window.location.search);
    
    // Set price range
    if (priceRange[0] > 0) {
      params.set("minPrice", priceRange[0].toString());
    } else {
      params.delete("minPrice");
    }
    
    if (priceRange[1] < 300) {
      params.set("maxPrice", priceRange[1].toString());
    } else {
      params.delete("maxPrice");
    }
    
    // Set categories
    if (selectedCategories.length > 0) {
      params.set("categories", selectedCategories.join(","));
    } else {
      params.delete("categories");
    }
    
    // Set brands
    if (checkedBrands.length > 0) {
      params.set("brand", checkedBrands.join(","));
    } else {
      params.delete("brand");
    }
    
    // Set colors
    if (selectedColors.length > 0) {
      params.set("colors", selectedColors.join(","));
    } else {
      params.delete("colors");
    }
    
    // Keep page at 1 when filtering
    params.delete("page");
    
    setLocation(`/products?${params.toString()}`);
  };

  const resetFilters = () => {
    setPriceRange([0, 300]);
    setSelectedCategories([]);
    setCheckedBrands([]);
    setSelectedColors([]);
    
    const currentParams = new URLSearchParams(window.location.search);
    const category = currentParams.get("category");
    
    // Preserve only category parameter if it exists
    if (category) {
      setLocation(`/products?category=${category}`);
    } else {
      setLocation("/products");
    }
  };

  return (
    <Card className="bg-gray-50">
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-4">Filters</h3>
        
        <Accordion type="multiple" defaultValue={["price", "categories", "brands", "colors"]}>
          {/* Price Range */}
          <AccordionItem value="price">
            <AccordionTrigger className="font-semibold">Price Range</AccordionTrigger>
            <AccordionContent>
              <div className="py-4">
                <Slider
                  defaultValue={priceRange}
                  value={priceRange}
                  min={0}
                  max={300}
                  step={5}
                  onValueChange={handlePriceChange}
                  className="mb-4"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}+</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Categories */}
          <AccordionItem value="categories">
            <AccordionTrigger className="font-semibold">Categories</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 py-2">
                {categories?.map(category => (
                  <div key={category.id} className="flex items-center">
                    <Checkbox 
                      id={`category-${category.id}`}
                      checked={selectedCategories.includes(category.id.toString())}
                      onCheckedChange={(checked) => 
                        handleCategoryChange(category.id.toString(), checked === true)
                      }
                    />
                    <Label 
                      htmlFor={`category-${category.id}`}
                      className="ml-2 text-gray-700"
                    >
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Brands */}
          <AccordionItem value="brands">
            <AccordionTrigger className="font-semibold">Brands</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 py-2">
                {brands.map(brand => (
                  <div key={brand} className="flex items-center">
                    <Checkbox 
                      id={`brand-${brand}`}
                      checked={checkedBrands.includes(brand)}
                      onCheckedChange={(checked) => 
                        handleBrandChange(brand, checked === true)
                      }
                    />
                    <Label 
                      htmlFor={`brand-${brand}`}
                      className="ml-2 text-gray-700"
                    >
                      {brand}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Colors */}
          <AccordionItem value="colors">
            <AccordionTrigger className="font-semibold">Colors</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2 py-2">
                {colors.map(color => (
                  <button
                    key={color.name}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColors.includes(color.name)
                        ? "border-primary"
                        : "border-gray-300"
                    } ${color.color}`}
                    onClick={() => handleColorChange(color.name)}
                    title={color.name}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <div className="flex flex-wrap gap-2 mt-6">
          <Button onClick={applyFilters} className="flex-1">
            Apply Filters
          </Button>
          <Button variant="outline" onClick={resetFilters} className="flex-1">
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Filters;
