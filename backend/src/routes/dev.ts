import { Router } from "express";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";

const router = Router();
router.post("/login-as", async (req, res) => {
  if (process.env.NODE_ENV === "production")
    return res.status(403).json({ error: "Disabled in production" });

  const { email, userId } = req.body ?? {};
  const user = userId
    ? await prisma.user.findUnique({ where: { id: Number(userId) } })
    : await prisma.user.findUnique({ where: { email } });

  if (!user) return res.status(404).json({ error: "User not found" });

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  return res.json({ accessToken });
});

export default router;
