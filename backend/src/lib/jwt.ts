import jwt from "jsonwebtoken";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET");

// we create short lived access tokens (take a payload (userId, email), use 
// a secret key from .env to produce a string, which expires in 15 mins
export function signAccessToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
}
// same but for long lived tokens (send to browser as cookie)
export function signRefreshToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TTL });
}

//verify token signature and check whether is valid or not
export function verifyToken<T = any>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}

//jwt is a header.payload.signature,  we use this on register/login but also on
//protected routes