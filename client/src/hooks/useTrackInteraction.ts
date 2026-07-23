import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface TrackInteractionParams {
  productId: number;
  action: 'view' | 'click' | 'add_to_cart' | 'add_to_wishlist' | 'purchase' | 'search' | string;
  metadata?: Record<string, any>;
}

/**
 * Hook for tracking user interactions with products
 */
export function useTrackInteraction() {
  const trackMutation = useMutation({
    mutationFn: async (params: TrackInteractionParams) => {
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to track interaction');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // We don't need to invalidate any queries here as this is just tracking
    }
  });

  const trackInteraction = (params: TrackInteractionParams) => {
    // Only track interactions if in production or if explicitly testing
    if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_TRACKING) {
      trackMutation.mutate(params);
    }
  };

  // Helper functions for common interaction types
  const trackView = (productId: number, metadata?: Record<string, any>) => {
    trackInteraction({ productId, action: 'view', metadata });
  };

  const trackClick = (productId: number, metadata?: Record<string, any>) => {
    trackInteraction({ productId, action: 'click', metadata });
  };

  const trackAddToCart = (productId: number, metadata?: Record<string, any>) => {
    trackInteraction({ productId, action: 'add_to_cart', metadata });
  };

  const trackAddToWishlist = (productId: number, metadata?: Record<string, any>) => {
    trackInteraction({ productId, action: 'add_to_wishlist', metadata });
  };

  const trackPurchase = (productId: number, metadata?: Record<string, any>) => {
    trackInteraction({ productId, action: 'purchase', metadata });
  };

  const trackSearch = (productId: number, metadata?: Record<string, any>) => {
    trackInteraction({ productId, action: 'search', metadata });
  };

  return {
    trackInteraction,
    trackView,
    trackClick,
    trackAddToCart,
    trackAddToWishlist,
    trackPurchase,
    trackSearch,
    isTracking: trackMutation.isPending,
  };
}

export default useTrackInteraction;