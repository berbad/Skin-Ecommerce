import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
    name?: string;
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  console.log("🍪 Cookies:", req.cookies);
  const token = req.cookies.token;
  if (!token) {
    res.status(401).json({ success: false, message: "Unauthorized: No token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role?: string;
      name?: string;
    };
    req.user = decoded;
    next();
  } catch {
    res
      .status(403)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
