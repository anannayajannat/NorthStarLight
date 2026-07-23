import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Newsletter: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Thank you for subscribing!",
        description: "You'll receive updates on new arrivals and special offers.",
      });
      setEmail("");
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <section className="bg-primary py-12">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Stay Updated</h2>
        <p className="text-blue-100 mb-6 max-w-xl mx-auto">
          Subscribe to our newsletter to receive updates on new arrivals, special offers, and more.
        </p>
        <form 
          className="flex flex-col sm:flex-row max-w-md mx-auto"
          onSubmit={handleSubmit}
        >
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-grow py-3 px-4 rounded-l-md sm:rounded-r-none rounded-r-md sm:mb-0 mb-2 focus:outline-none bg-white"
          />
          <Button 
            type="submit"
            className="bg-secondary hover:bg-amber-600 text-white py-3 px-6 rounded-r-md sm:rounded-l-none rounded-l-md font-medium transition"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;
