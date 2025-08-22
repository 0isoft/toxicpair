import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request { user?: { sub: number; email?: string } }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  try {
    const payload = verifyToken(token); // { sub: userId, email? }
    req.user = payload as any;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
