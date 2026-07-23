import { Request, Response } from 'express';
import { db } from '../db';
import { 
  userRewards, 
  rewardTransactions,
  InsertUserRewards,
  InsertRewardTransaction
} from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
}

// Validation schemas
const addPointsSchema = z.object({
  points: z.number().int(),
  orderId: z.number().int().optional(),
  type: z.enum(['earn', 'spend', 'expire', 'adjust']),
  description: z.string().min(1)
});

/**
 * Get a user's rewards information
 */
export async function getUserRewards(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Find or create user rewards
    let [userRewardsData] = await db.select()
      .from(userRewards)
      .where(eq(userRewards.userId, parseInt(userId)))
      .limit(1);
    
    if (!userRewardsData) {
      // Create new rewards profile
      const rewardsData: InsertUserRewards = {
        userId: parseInt(userId),
        points: 0,
        totalEarned: 0,
        totalSpent: 0,
        tier: 'bronze'
      };
      
      [userRewardsData] = await db.insert(userRewards)
        .values(rewardsData)
        .returning();
    }
    
    // Get recent transactions
    const recentTransactions = await db.select()
      .from(rewardTransactions)
      .where(eq(rewardTransactions.userId, parseInt(userId)))
      .orderBy(desc(rewardTransactions.createdAt))
      .limit(10);
    
    // Calculate points needed for next tier
    let nextTier = null;
    let pointsToNextTier = null;
    
    if (userRewardsData.tier === 'bronze') {
      nextTier = 'silver';
      pointsToNextTier = 1000 - userRewardsData.points;
    } else if (userRewardsData.tier === 'silver') {
      nextTier = 'gold';
      pointsToNextTier = 5000 - userRewardsData.points;
    } else if (userRewardsData.tier === 'gold') {
      nextTier = 'platinum';
      pointsToNextTier = 10000 - userRewardsData.points;
    }
    
    return res.status(200).json({
      ...userRewardsData,
      recentTransactions,
      nextTier,
      pointsToNextTier
    });
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get all reward transactions for a user
 */
export async function getUserRewardTransactions(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Count total transactions
    const [{ count }] = await db.select({
      count: count()
    })
    .from(rewardTransactions)
    .where(eq(rewardTransactions.userId, parseInt(userId)));
    
    // Get transactions with pagination
    const transactions = await db.select()
      .from(rewardTransactions)
      .where(eq(rewardTransactions.userId, parseInt(userId)))
      .orderBy(desc(rewardTransactions.createdAt))
      .limit(limit)
      .offset(offset);
    
    return res.status(200).json({
      transactions,
      pagination: {
        total: Number(count),
        page,
        limit,
        pages: Math.ceil(Number(count) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user reward transactions:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Add points to a user's rewards (admin only)
 */
export async function addUserRewardPoints(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Only admins can add points directly
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Validate request body
    const validatedData = addPointsSchema.parse(req.body);
    
    // Find or create user rewards
    let [userRewardsData] = await db.select()
      .from(userRewards)
      .where(eq(userRewards.userId, parseInt(userId)))
      .limit(1);
    
    if (!userRewardsData) {
      // Create new rewards profile
      const rewardsData: InsertUserRewards = {
        userId: parseInt(userId),
        points: 0,
        totalEarned: 0,
        totalSpent: 0,
        tier: 'bronze'
      };
      
      [userRewardsData] = await db.insert(userRewards)
        .values(rewardsData)
        .returning();
    }
    
    // Determine how to apply the points
    let newPoints = userRewardsData.points;
    let newTotalEarned = userRewardsData.totalEarned;
    let newTotalSpent = userRewardsData.totalSpent;
    
    if (validatedData.type === 'earn') {
      newPoints += validatedData.points;
      newTotalEarned += validatedData.points;
    } else if (validatedData.type === 'spend') {
      // Ensure user has enough points
      if (userRewardsData.points < Math.abs(validatedData.points)) {
        return res.status(400).json({ message: 'Insufficient points' });
      }
      newPoints -= Math.abs(validatedData.points);
      newTotalSpent += Math.abs(validatedData.points);
    } else if (validatedData.type === 'expire') {
      // Ensure user has enough points
      if (userRewardsData.points < Math.abs(validatedData.points)) {
        validatedData.points = -userRewardsData.points; // Only expire available points
      }
      newPoints += validatedData.points; // This will be negative
    } else if (validatedData.type === 'adjust') {
      newPoints += validatedData.points; // Can be positive or negative
      if (validatedData.points > 0) {
        newTotalEarned += validatedData.points;
      }
    }
    
    // Determine tier based on points
    let newTier = userRewardsData.tier;
    if (newPoints >= 10000) {
      newTier = 'platinum';
    } else if (newPoints >= 5000) {
      newTier = 'gold';
    } else if (newPoints >= 1000) {
      newTier = 'silver';
    } else {
      newTier = 'bronze';
    }
    
    // Update user rewards
    const [updatedRewards] = await db.update(userRewards)
      .set({
        points: newPoints,
        totalEarned: newTotalEarned,
        totalSpent: newTotalSpent,
        tier: newTier,
        lastActivity: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userRewards.userId, parseInt(userId)))
      .returning();
    
    // Create transaction record
    const transactionData: InsertRewardTransaction = {
      userId: parseInt(userId),
      orderId: validatedData.orderId,
      points: validatedData.points,
      type: validatedData.type,
      description: validatedData.description
    };
    
    const [transaction] = await db.insert(rewardTransactions)
      .values(transactionData)
      .returning();
    
    // Check if user was upgraded to a new tier
    const tierUpgraded = newTier !== userRewardsData.tier;
    
    return res.status(200).json({
      ...updatedRewards,
      transaction,
      tierUpgraded,
      newTier: tierUpgraded ? newTier : undefined
    });
  } catch (error) {
    console.error('Error adding reward points:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Calculate points for an order (called by Orders service)
 */
export async function calculateOrderPoints(req: Request, res: Response) {
  try {
    const { orderId, userId, total } = req.body;
    
    if (!orderId || !userId || total === undefined) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
    
    // Basic points calculation: $1 = 1 point
    const orderTotal = Number(total);
    const points = Math.floor(orderTotal);
    
    // Get user rewards tier for potential bonus
    const [userRewardsData] = await db.select()
      .from(userRewards)
      .where(eq(userRewards.userId, userId))
      .limit(1);
    
    let bonusMultiplier = 1.0;
    
    if (userRewardsData) {
      // Apply tier bonuses
      if (userRewardsData.tier === 'silver') {
        bonusMultiplier = 1.1; // 10% bonus
      } else if (userRewardsData.tier === 'gold') {
        bonusMultiplier = 1.25; // 25% bonus
      } else if (userRewardsData.tier === 'platinum') {
        bonusMultiplier = 1.5; // 50% bonus
      }
    }
    
    const totalPoints = Math.floor(points * bonusMultiplier);
    
    return res.status(200).json({
      orderId,
      userId,
      basePoints: points,
      bonusMultiplier,
      totalPoints
    });
  } catch (error) {
    console.error('Error calculating order points:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}