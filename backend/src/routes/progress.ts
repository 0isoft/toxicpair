import { Router } from "express";
import { getLevelProgress } from "../lib/progress";

const router = Router();

// Try common places your auth might put the user id
function getUserId(req: any): number | undefined {
  return req.user?.id ?? req.session?.userId ?? resLocalUserId(req);
}
function resLocalUserId(req: any): number | undefined {
  try { return req.res?.locals?.user?.id; } catch { return undefined; }
}

router.get("/", async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const progress = await getLevelProgress(userId);
      res.set("Cache-Control", "no-store");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Vary", "Authorization, Cookie");
      res.json(progress);
    } catch (err) {
      next(err);
    }
  });

export default router;
