import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

/**
 * GET /api/me
 * Requires: Authorization: Bearer <accessToken>
 * Returns: { id, email, createdAt }
 */
router.get("/", requireAuth, async (req, res) => {
  const userId = (req.user as any).sub as number;
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, createdAt: true, role: true }, //added role
  });
  if (!me) return res.status(404).json({ error: "User not found" });
  res.json(me);
});

export default router;
