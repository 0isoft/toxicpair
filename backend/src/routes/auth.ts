import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import bcrypt from "bcrypt";
import { signAccessToken, signRefreshToken, verifyToken, type AccessPayload } from "../lib/jwt";
import admin from "../lib/firebaseAdmin";
const router = Router();
const Email = z.string().email();
const Password = z.string().min(8);

const cookieOpts = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: false, // set true in production behind HTTPS
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
};

router.post("/firebase", async (req, res) => {
  const idToken = req.body?.idToken as string | undefined;
  if (!idToken) return res.status(400).json({ error: "Missing idToken" });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decoded;

    // 1) Try by email, then by firebaseUid (BOTH return full User)
    let user =
      (email ? await prisma.user.findUnique({ where: { email } }) : null) ||
      (await prisma.user.findUnique({ where: { firebaseUid: uid } }));

    // 2) Link if needed, otherwise create (both return full User)
    if (user) {
      if (!user.firebaseUid) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid: uid },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email: email ?? `${uid}@firebase.local`,
          firebaseUid: uid,
          // passwordHash stays null for OAuth-only accounts
        },
      });
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = signRefreshToken({ sub: user.id });

    const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  sameSite: isProd ? 'none' as const : 'lax' as const,
  secure: isProd,
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30d
};
res.cookie('refreshToken', refreshToken, cookieOpts);

    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: "Invalid Firebase token" });
  }
});

router.post("/register", async (req, res) => {
  const parse = z.object({ email: Email, password: Password }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const { email, password } = parse.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, role: true },
  });
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id });

  res.cookie("refreshToken", refreshToken, cookieOpts);
  return res.status(201).json({ accessToken });
});

router.post("/login", async (req, res) => {
  const parse = z.object({ email: Email, password: Password }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const { email, password } = parse.data;

  const user = await prisma.user.findUnique({
    where: { email },
    // return full User (no select) to keep types consistent
  });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  // NEW: OAuth-only users have no password hash
  if (!user.passwordHash) {
    return res.status(401).json({ error: "Account uses OAuth. Please sign in with Google/GitHub." });
  }

  const ok = await bcrypt.compare(password, user.passwordHash); // now string, not null
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id });

  res.cookie("refreshToken", refreshToken, cookieOpts);
  return res.json({ accessToken });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) return res.status(401).json({ error: "Missing refresh token" });

  try {
    const payload = verifyToken<{ sub: number }>(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) return res.status(401).json({ error: "Unknown user" });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = signRefreshToken({ sub: user.id });

    res.cookie("refreshToken", refreshToken, cookieOpts);
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

router.get("/me", async (req, res) => {
  // This one expects the frontend to send an access token; reuse middleware if you prefer
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  try {
    const payload = verifyToken<{ sub: number }>(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, createdAt: true, role: true },
    });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// OPTIONAL if you don't already have it: logout clears cookie
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: cookieOpts.sameSite,
    secure: cookieOpts.secure,
    path: cookieOpts.path,
  });
  return res.sendStatus(204);
});

router.delete("/account", async (req, res) => {
  // Auth like /me
  const header = req.headers.authorization || "";
  const [, accessToken] = header.split(" ");
  if (!accessToken) return res.status(401).json({ error: "Missing bearer token" });

  let payload: { sub: number; email?: string };
  try { payload = verifyToken(accessToken); }
  catch { return res.status(401).json({ error: "Invalid token" }); }

  const { password, idToken } = (req.body ?? {}) as { password?: string; idToken?: string };

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, passwordHash: true, firebaseUid: true },
  });
  if (!user) return res.sendStatus(204);

  // Password account → confirm password
  if (user.passwordHash) {
    if (!password) return res.status(400).json({ error: "Password required" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });
  }
  // OAuth account → confirm via fresh Firebase ID token
  else if (user.firebaseUid) {
    if (!idToken) return res.status(400).json({ error: "Re-auth token required" });
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      if (decoded.uid !== user.firebaseUid) return res.status(401).json({ error: "Token mismatch" });
      // Optional: also remove Firebase auth user
      await admin.auth().deleteUser(user.firebaseUid).catch(() => {});
    } catch {
      return res.status(401).json({ error: "Invalid Firebase token" });
    }
  }

  await prisma.user.delete({ where: { id: user.id } });

  // clear refresh cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // true in prod
    path: "/",
  });

  return res.sendStatus(204);
});

export default router;
