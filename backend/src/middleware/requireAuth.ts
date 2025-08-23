import { Request, Response, NextFunction } from "express";
import { verifyToken , type AccessPayload} from "../lib/jwt";

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
    const payload = verifyToken<AccessPayload>(token);
    (req as any).user = payload; // { sub, email, role }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(role: "ADMIN" | "USER") {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user as AccessPayload | undefined;
    if (!u) return res.status(401).json({ error: "Unauthorized" });
    if (u.role !== role) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}