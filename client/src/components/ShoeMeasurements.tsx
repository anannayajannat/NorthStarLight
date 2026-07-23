import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ShoeMeasurement {
  id: number;
  productId: number;
  size: string;
  lengthMm: number;
  widthMm: number;
  insoleLength?: number;
  insoleWidth?: number;
  heelHeight?: number;
  weight?: number;
  measurements: {
    [key: string]: number;
  };
  notes?: string;
}

interface ShoeMeasurementsProps {
  productId: number;
}

const ShoeMeasurements: React.FC<ShoeMeasurementsProps> = ({ productId }) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [showSizingGuide, setShowSizingGuide] = useState(false);

  const { data: measurements, isLoading, error } = useQuery<ShoeMeasurement[]>({
    queryKey: ['/api/products', productId, 'measurements'],
    enabled: !!productId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="my-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Size & Fit</h3>
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (error || !measurements || measurements.length === 0) {
    return (
      <div className="my-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Size & Fit</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSizingGuide(!showSizingGuide)}
          >
            {showSizingGuide ? 'Hide Size Guide' : 'Size Guide'}
          </Button>
        </div>
        <p className="text-sm text-gray-500">No detailed measurements available for this product.</p>
        
        {showSizingGuide && (
          <div className="mt-4 p-4 border rounded-md">
            <h4 className="font-bold mb-2">General Shoe Sizing Guide</h4>
            <p className="text-sm mb-2">For the best fit, we recommend measuring your feet and referring to the size chart below:</p>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>US Size</TableHead>
                  <TableHead>EU Size</TableHead>
                  <TableHead>UK Size</TableHead>
                  <TableHead>Foot Length (cm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>7</TableCell>
                  <TableCell>40</TableCell>
                  <TableCell>6</TableCell>
                  <TableCell>25</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>8</TableCell>
                  <TableCell>41</TableCell>
                  <TableCell>7</TableCell>
                  <TableCell>25.7</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>9</TableCell>
                  <TableCell>42</TableCell>
                  <TableCell>8</TableCell>
                  <TableCell>26.3</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>10</TableCell>
                  <TableCell>43</TableCell>
                  <TableCell>9</TableCell>
                  <TableCell>27</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>11</TableCell>
                  <TableCell>44</TableCell>
                  <TableCell>10</TableCell>
                  <TableCell>27.8</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            <p className="text-xs text-gray-500 mt-2">Note: This is a general sizing guide. For the most accurate fit, refer to specific measurements for each shoe model when available.</p>
          </div>
        )}
      </div>
    );
  }

  // Get all available sizes
  const availableSizes = measurements.map(m => m.size).sort((a, b) => {
    // Convert to numbers if possible for proper sorting
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });

  // Set the first size as default if no size is selected
  if (availableSizes.length > 0 && !selectedSize) {
    setSelectedSize(availableSizes[0]);
  }

  // Get the selected measurement data
  const selectedMeasurement = measurements.find(m => m.size === selectedSize);

  return (
    <div className="my-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Size & Fit</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowSizingGuide(!showSizingGuide)}
        >
          {showSizingGuide ? 'Hide Size Guide' : 'Size Guide'}
        </Button>
      </div>
      
      <div className="mb-4">
        <p className="text-sm mb-2">Select a size to view detailed measurements:</p>
        <Select value={selectedSize} onValueChange={setSelectedSize}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            {availableSizes.map(size => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedMeasurement && (
        <div className="p-4 border rounded-md">
          <h4 className="font-bold mb-2">Measurements for Size {selectedMeasurement.size}</h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium">Length</p>
              <p className="text-lg">{selectedMeasurement.lengthMm} mm</p>
            </div>
            <div>
              <p className="text-sm font-medium">Width</p>
              <p className="text-lg">{selectedMeasurement.widthMm} mm</p>
            </div>
            
            {selectedMeasurement.insoleLength && (
              <div>
                <p className="text-sm font-medium">Insole Length</p>
                <p className="text-lg">{selectedMeasurement.insoleLength} mm</p>
              </div>
            )}
            
            {selectedMeasurement.insoleWidth && (
              <div>
                <p className="text-sm font-medium">Insole Width</p>
                <p className="text-lg">{selectedMeasurement.insoleWidth} mm</p>
              </div>
            )}
            
            {selectedMeasurement.heelHeight && (
              <div>
                <p className="text-sm font-medium">Heel Height</p>
                <p className="text-lg">{selectedMeasurement.heelHeight} mm</p>
              </div>
            )}
            
            {selectedMeasurement.weight && (
              <div>
                <p className="text-sm font-medium">Weight</p>
                <p className="text-lg">{selectedMeasurement.weight} g</p>
              </div>
            )}
          </div>
          
          {/* Custom measurements if available */}
          {selectedMeasurement.measurements && Object.keys(selectedMeasurement.measurements).length > 0 && (
            <div className="mt-4">
              <h4 className="font-bold mb-2">Additional Measurements</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(selectedMeasurement.measurements).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm font-medium">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-lg">{value} mm</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedMeasurement.notes && (
            <div className="mt-4">
              <h4 className="font-bold mb-1">Fit Notes</h4>
              <p className="text-sm">{selectedMeasurement.notes}</p>
            </div>
          )}
        </div>
      )}
      
      {showSizingGuide && (
        <div className="mt-4 p-4 border rounded-md">
          <h4 className="font-bold mb-2">General Shoe Sizing Guide</h4>
          <p className="text-sm mb-2">For the best fit, we recommend measuring your feet and referring to the size chart below:</p>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>US Size</TableHead>
                <TableHead>EU Size</TableHead>
                <TableHead>UK Size</TableHead>
                <TableHead>Foot Length (cm)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>7</TableCell>
                <TableCell>40</TableCell>
                <TableCell>6</TableCell>
                <TableCell>25</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>8</TableCell>
                <TableCell>41</TableCell>
                <TableCell>7</TableCell>
                <TableCell>25.7</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>9</TableCell>
                <TableCell>42</TableCell>
                <TableCell>8</TableCell>
                <TableCell>26.3</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>10</TableCell>
                <TableCell>43</TableCell>
                <TableCell>9</TableCell>
                <TableCell>27</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>11</TableCell>
                <TableCell>44</TableCell>
                <TableCell>10</TableCell>
                <TableCell>27.8</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <div className="mt-4">
            <h4 className="font-bold mb-1">How to Measure Your Feet</h4>
            <ol className="text-sm list-decimal pl-5 space-y-1">
              <li>Stand on a piece of paper with your heel against a wall.</li>
              <li>Mark the longest part of your foot on the paper.</li>
              <li>Measure the distance from the wall to the mark in centimeters.</li>
              <li>Repeat for your other foot and use the larger measurement.</li>
            </ol>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">Note: This is a general sizing guide. For the most accurate fit, refer to specific measurements for each shoe model.</p>
        </div>
      )}
    </div>
  );
};

export default ShoeMeasurements;