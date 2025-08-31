import jwt from "jsonwebtoken";

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || process.env.JWT_SECRET || "dev_access";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh";
const ACCESS_TTL  = "15m";
const REFRESH_TTL = "30d";

export function signAccessJwt(payload: object) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}
export function verifyAccessJwt<T = any>(token: string): T {
  return jwt.verify(token, ACCESS_SECRET) as T;
}

export function signRefreshJwt(payload: object) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}
export function verifyRefreshJwt<T = any>(token: string): T {
  return jwt.verify(token, REFRESH_SECRET) as T;
}