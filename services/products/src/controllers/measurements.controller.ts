import { Request, Response } from 'express';
import { db } from '../db';
import { 
  shoeMeasurements, 
  products, 
  InsertShoeMeasurement
} from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get all shoe measurements for a product
 */
export async function getShoeMeasurements(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const { size, sizeSystem, gender } = req.query;
    
    // Verify that the product exists
    const [product] = await db.select()
      .from(products)
      .where(
        and(
          eq(products.id, parseInt(productId)),
          eq(products.active, true)
        )
      )
      .limit(1);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Build query for measurements
    let query = db.select()
      .from(shoeMeasurements)
      .where(eq(shoeMeasurements.productId, parseInt(productId)));
    
    // Apply filters if provided
    if (size) {
      query = query.where(eq(shoeMeasurements.size, size as string));
    }
    
    if (sizeSystem) {
      query = query.where(eq(shoeMeasurements.sizeSystem, sizeSystem as string));
    }
    
    if (gender) {
      query = query.where(eq(shoeMeasurements.gender, gender as string));
    }
    
    // Get measurements
    const measurements = await query;
    
    return res.status(200).json(measurements);
  } catch (error) {
    console.error('Error fetching shoe measurements:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get specific shoe measurement by ID
 */
export async function getShoeMeasurement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const [measurement] = await db.select()
      .from(shoeMeasurements)
      .where(eq(shoeMeasurements.id, parseInt(id)))
      .limit(1);
    
    if (!measurement) {
      return res.status(404).json({ message: 'Shoe measurement not found' });
    }
    
    return res.status(200).json(measurement);
  } catch (error) {
    console.error('Error fetching shoe measurement:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create a new shoe measurement for a product
 */
export async function createShoeMeasurement(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const measurementData = req.body as InsertShoeMeasurement;
    
    // Verify that the product exists
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, parseInt(productId)))
      .limit(1);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if a measurement with the same size, system and gender already exists
    const existingMeasurement = await db.select()
      .from(shoeMeasurements)
      .where(
        and(
          eq(shoeMeasurements.productId, parseInt(productId)),
          eq(shoeMeasurements.size, measurementData.size),
          eq(shoeMeasurements.sizeSystem, measurementData.sizeSystem),
          eq(shoeMeasurements.gender, measurementData.gender)
        )
      )
      .limit(1);
    
    if (existingMeasurement.length > 0) {
      return res.status(400).json({ 
        message: 'A measurement for this size, system and gender already exists' 
      });
    }
    
    // Insert the measurement
    const [newMeasurement] = await db.insert(shoeMeasurements)
      .values({
        ...measurementData,
        productId: parseInt(productId)
      })
      .returning();
    
    return res.status(201).json(newMeasurement);
  } catch (error) {
    console.error('Error creating shoe measurement:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update a shoe measurement
 */
export async function updateShoeMeasurement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const measurementData = req.body;
    
    // Check if measurement exists
    const [existingMeasurement] = await db.select()
      .from(shoeMeasurements)
      .where(eq(shoeMeasurements.id, parseInt(id)))
      .limit(1);
    
    if (!existingMeasurement) {
      return res.status(404).json({ message: 'Shoe measurement not found' });
    }
    
    // Update measurement
    const [updatedMeasurement] = await db.update(shoeMeasurements)
      .set({
        ...measurementData,
        updatedAt: new Date()
      })
      .where(eq(shoeMeasurements.id, parseInt(id)))
      .returning();
    
    return res.status(200).json(updatedMeasurement);
  } catch (error) {
    console.error('Error updating shoe measurement:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a shoe measurement
 */
export async function deleteShoeMeasurement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if measurement exists
    const [existingMeasurement] = await db.select()
      .from(shoeMeasurements)
      .where(eq(shoeMeasurements.id, parseInt(id)))
      .limit(1);
    
    if (!existingMeasurement) {
      return res.status(404).json({ message: 'Shoe measurement not found' });
    }
    
    // Delete the measurement
    await db.delete(shoeMeasurements)
      .where(eq(shoeMeasurements.id, parseInt(id)));
    
    return res.status(200).json({ message: 'Shoe measurement deleted successfully' });
  } catch (error) {
    console.error('Error deleting shoe measurement:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Predict shoe size based on user measurements
 * This is a placeholder for AI size prediction functionality
 */
export async function predictShoeSize(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const { 
      footLength, 
      footWidth, 
      userGender,
      preferredFit  // 'tight', 'normal', 'loose'
    } = req.body;
    
    // Validate required parameters
    if (!footLength || !userGender) {
      return res.status(400).json({ 
        message: 'Foot length and gender are required for size prediction' 
      });
    }
    
    // Get product measurements
    const measurements = await db.select()
      .from(shoeMeasurements)
      .where(
        and(
          eq(shoeMeasurements.productId, parseInt(productId)),
          eq(shoeMeasurements.gender, userGender)
        )
      );
    
    if (measurements.length === 0) {
      return res.status(404).json({ 
        message: 'No measurement data available for this product and gender' 
      });
    }
    
    // Simple algorithm to find the best size match
    // In a real implementation, this would be a more sophisticated ML model
    let bestMatch = measurements[0];
    let minDifference = Math.abs((bestMatch.lengthMm?.toNumber() || 0) - footLength);
    
    for (const measurement of measurements) {
      const lengthDifference = Math.abs((measurement.lengthMm?.toNumber() || 0) - footLength);
      
      // Consider width if provided
      if (footWidth && measurement.widthMm) {
        const widthDifference = Math.abs((measurement.widthMm.toNumber() || 0) - footWidth);
        
        // Combined difference with more weight on length
        const combinedDifference = lengthDifference * 0.7 + widthDifference * 0.3;
        
        if (combinedDifference < minDifference) {
          minDifference = combinedDifference;
          bestMatch = measurement;
        }
      } else if (lengthDifference < minDifference) {
        minDifference = lengthDifference;
        bestMatch = measurement;
      }
    }
    
    // Adjust size based on preferred fit
    let recommendedSize = bestMatch.size;
    let sizeOffset = 0;
    
    if (preferredFit === 'tight' && minDifference > 2) {
      // Go down half a size for tight fit
      sizeOffset = -0.5;
    } else if (preferredFit === 'loose' && minDifference > 2) {
      // Go up half a size for loose fit
      sizeOffset = 0.5;
    }
    
    // Apply size offset if it's a numeric size
    if (!isNaN(parseFloat(recommendedSize)) && sizeOffset !== 0) {
      const numericSize = parseFloat(recommendedSize);
      recommendedSize = (numericSize + sizeOffset).toString();
    }
    
    return res.status(200).json({
      recommendedSize,
      sizeSystem: bestMatch.sizeSystem,
      confidence: calculateConfidence(minDifference),
      alternatives: findAlternativeSizes(measurements, bestMatch, preferredFit)
    });
  } catch (error) {
    console.error('Error predicting shoe size:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Calculate confidence level (0-100%) based on measurement difference
 */
function calculateConfidence(difference: number): number {
  // Simple linear confidence calculation
  // 0mm difference = 100% confidence
  // 10mm or more difference = 50% confidence
  if (difference >= 10) return 50;
  return 100 - (difference * 5);
}

/**
 * Find alternative sizes
 */
function findAlternativeSizes(
  measurements: any[], 
  bestMatch: any, 
  preferredFit?: string
): { size: string, sizeSystem: string, confidence: number }[] {
  // Sort measurements by length
  const sortedMeasurements = [...measurements].sort((a, b) => {
    return (a.lengthMm?.toNumber() || 0) - (b.lengthMm?.toNumber() || 0);
  });
  
  // Find index of best match
  const bestMatchIndex = sortedMeasurements.findIndex(m => m.id === bestMatch.id);
  
  // Get one size up and one size down
  const alternatives = [];
  
  // One size down
  if (bestMatchIndex > 0) {
    const smaller = sortedMeasurements[bestMatchIndex - 1];
    const difference = Math.abs((smaller.lengthMm?.toNumber() || 0) - (bestMatch.lengthMm?.toNumber() || 0));
    
    alternatives.push({
      size: smaller.size,
      sizeSystem: smaller.sizeSystem,
      confidence: calculateConfidence(difference)
    });
  }
  
  // One size up
  if (bestMatchIndex < sortedMeasurements.length - 1) {
    const larger = sortedMeasurements[bestMatchIndex + 1];
    const difference = Math.abs((larger.lengthMm?.toNumber() || 0) - (bestMatch.lengthMm?.toNumber() || 0));
    
    alternatives.push({
      size: larger.size,
      sizeSystem: larger.sizeSystem,
      confidence: calculateConfidence(difference)
    });
  }
  
  return alternatives;
}