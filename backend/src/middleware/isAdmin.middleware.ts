import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
export function isAdminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== "admin" || !req.user.mfaVerified) {
    res
      .status(403)
      .json({ message: "Admin access requires multi-factor authentication" });
    return;
  }
  next();
}
