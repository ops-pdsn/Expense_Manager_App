import { Express } from "express";
import { supabase } from "./db";
import { storage } from "./storage";

// Middleware to verify Supabase JWT token
export async function verifySupabaseToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Get user profile from our database
    const userProfile = await storage.getUser(user.id);
    
    if (!userProfile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    // Attach user to request
    req.user = userProfile;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Token verification failed' });
  }
}

// Alternative middleware for routes that don't require authentication
export function optionalAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  verifySupabaseToken(req, res, next);
}
