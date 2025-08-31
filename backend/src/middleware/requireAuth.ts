import { Request, Response, NextFunction } from "express";
import { verifyToken , type AccessPayload} from "../lib/jwt";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: number;
        id: number;                 // alias for convenience
        email?: string;
        role?: "ADMIN" | "USER";
      };
    }
  }
}

export function decodeAuth(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const cookieTok = (req as any).cookies?.token as string | undefined; // requires cookie-parser mounted
  const token = bearer || cookieTok;

  if (!token) return next();

  try {
    const payload = verifyToken<AccessPayload>(token); // <- strongly typed
    // normalize shape: keep sub, and add id alias
    (req as any).user = {
      sub: payload.sub,
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    // ignore; unauthenticated request proceeds without req.user
  }
  next();
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