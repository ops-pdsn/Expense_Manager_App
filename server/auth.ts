import { storage } from "./storage.js";
import { supabase } from "./db.js";

// Supabase JWT auth middleware for API routes
// Expects Authorization: Bearer <access_token> header set by the client
export async function verifySupabaseToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid authorization header" });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({ message: "Missing access token" });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const sbUser = data.user;
    // Ensure user exists in our DB (create minimal record if missing)
    const existing = await storage.getUser(sbUser.id);
    if (!existing) {
      await storage.createOrUpdateUser({
        id: sbUser.id,
        email: sbUser.email || "",
        first_name: (sbUser.user_metadata as any)?.first_name,
        last_name: (sbUser.user_metadata as any)?.last_name,
        department: "",
      });
    }

    const userRecord = await storage.getUser(sbUser.id);
    if (!userRecord) {
      return res.status(500).json({ message: "Failed to load user profile" });
    }

    // Attach a normalized user object on req
    req.user = {
      id: userRecord.id,
      email: userRecord.email,
      first_name: userRecord.first_name ?? null,
      last_name: userRecord.last_name ?? null,
      department: userRecord.department,
    };

    return next();
  } catch (err) {
    console.error("verifySupabaseToken error:", err);
    return res.status(500).json({ message: "Authentication failed" });
  }
}