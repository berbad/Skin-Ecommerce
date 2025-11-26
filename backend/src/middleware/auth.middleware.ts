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
  console.log("🔐 Auth Middleware - Path:", req.path);
  console.log("🔐 Headers:", {
    origin: req.headers.origin,
    cookie: req.headers.cookie ? "present" : "missing",
    authorization: req.headers.authorization ? "present" : "missing",
  });
  console.log("🍪 Parsed cookies:", req.cookies);

  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
      console.log("Using token from Authorization header");
    }
  }

  if (!token) {
    console.error("No token found");
    res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
      debug: {
        hasCookieToken: !!req.cookies?.token,
        hasAuthHeader: !!req.headers.authorization,
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role?: string;
      name?: string;
    };

    console.log(
      "Token verified for user:",
      decoded.email,
      "Role:",
      decoded.role
    );

    req.user = decoded;
    next();
  } catch (err: any) {
    console.error("Token verification failed:", err.message);
    res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
