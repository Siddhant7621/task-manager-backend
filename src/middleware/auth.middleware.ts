import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: { userId: string };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers["authorization"];
    if (!header) return res.status(401).json({ message: "No token" });
    const parts = header.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return res.status(401).json({ message: "Invalid token format" });
    const token = parts[1];
    const payload = verifyAccessToken(token) as any;
    req.user = { userId: payload.userId };
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
