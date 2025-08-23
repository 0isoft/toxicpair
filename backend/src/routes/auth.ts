import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import bcrypt from "bcrypt";
import { signAccessToken, signRefreshToken, verifyToken, type AccessPayload } from "../lib/jwt";

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
    select: { id: true, email: true, passwordHash: true, role: true },
  });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
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

export default router;
