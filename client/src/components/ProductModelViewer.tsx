import React, { Suspense, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Html } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductModel {
  id: number;
  productId: number;
  modelUrl: string;
  textureUrl?: string;
  thumbnailUrl?: string;
  format: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  animationUrl?: string;
  options?: {
    [key: string]: any;
  };
}

interface ProductModelViewerProps {
  productId: number;
}

// Model component
function Model({ modelUrl, scale = 1, rotation = [0, 0, 0], position = [0, 0, 0] }: {
  modelUrl: string;
  scale?: number;
  rotation?: [number, number, number];
  position?: [number, number, number];
}) {
  const modelRef = useRef<any>();
  const { scene } = useGLTF(modelUrl);
  
  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={scale} 
      rotation={rotation} 
      position={position} 
    />
  );
}

const ProductModelViewer: React.FC<ProductModelViewerProps> = ({ productId }) => {
  const [viewMode, setViewMode] = useState<'3d' | 'ar'>('3d');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  
  const { data: model, isLoading, error } = useQuery<ProductModel>({
    queryKey: ['/api/products', productId, 'model'],
    enabled: !!productId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="w-full h-[400px] rounded-md overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border rounded-md">
        <div className="text-center p-6">
          <p className="text-lg font-medium mb-2">3D model not available</p>
          <p className="text-sm text-gray-500">This product doesn't have a 3D model to display.</p>
        </div>
      </div>
    );
  }

  const availableColors = model.options?.colors || [];
  
  const handleARView = () => {
    // This is a placeholder for AR functionality
    // In a real implementation, we would use WebXR or a similar technology
    alert('AR functionality would launch here in a production environment');
  };

  // Drei's ContactShadows types can drift out of sync with the installed
  // Three.js version, causing a prop type mismatch at build time.
  // Casting the props to `any` sidesteps that without touching runtime behavior.
  const contactShadowsProps = {
    opacity: 0.25,
    scale: 10,
    blur: 1,
    far: 10,
    resolution: 256,
    color: "#000000",
  } as any;
  
  return (
    <div className="w-full rounded-md overflow-hidden border">
      <Tabs defaultValue="3d" className="w-full">
        <div className="p-2 border-b bg-gray-50">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="3d">3D View</TabsTrigger>
            <TabsTrigger value="ar">AR View</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="3d" className="w-full h-[400px]">
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            <Suspense fallback={<Html center><p>Loading 3D model...</p></Html>}>
              <Model 
                modelUrl={model.modelUrl} 
                scale={model.scale || 1} 
                rotation={model.rotation || [0, 0, 0]} 
                position={model.position || [0, 0, 0]} 
              />
              <Environment preset="city" />
              <ContactShadows {...contactShadowsProps} />
              <OrbitControls 
                enablePan={true} 
                enableZoom={true} 
                enableRotate={true} 
              />
            </Suspense>
          </Canvas>
          
          {availableColors.length > 0 && (
            <div className="p-3 border-t">
              <p className="text-sm font-medium mb-2">Available Colors:</p>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color: any) => (
                  <button
                    key={color.name}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color.value ? 'border-black' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="ar" className="w-full h-[400px] flex items-center justify-center">
          <div className="text-center p-6">
            <h3 className="text-xl font-bold mb-2">See this product in your space</h3>
            <p className="text-gray-600 mb-4">
              Use your phone's camera to see how this product looks in your environment.
            </p>
            <Button onClick={handleARView}>
              Launch AR Experience
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
        Rotate: Click and drag | Zoom: Scroll or pinch | Pan: Shift + drag
      </div>
    </div>
  );
};

export default ProductModelViewer;
