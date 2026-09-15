import { Request, Response, NextFunction } from "express";
import { resolveSession } from "../services/sessions";
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
    name?: string;
    sessionId?: string;
    authenticatedAt?: Date;
    mfaVerified?: boolean;
  };
}
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await resolveSession(req);
    res.set("Cache-Control", "no-store");
    if (!user) {
      res.status(401).json({ success: false, message: "Please sign in again" });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
