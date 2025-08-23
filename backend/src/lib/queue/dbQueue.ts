import type { JobQueue, QueueMessage } from "./types";
import type { AttemptJob } from "../types";
import { prisma } from "../../lib/prisma";

/**
 * DB queue: the Attempt row itself is the queue.
 * - Enqueue: create Attempt with status SUBMITTED (done in route) → no-op here
 * - Receive: atomically claim the oldest SUBMITTED row → set RUNNING, startedAt=now()
 * - Delete/Fail: no-ops (worker writes final status directly to the row)
 */
export class DbJobQueue implements JobQueue {
  async enqueueAttempt(_job: AttemptJob): Promise<void> {
    // no-op: enqueuing is the existence of SUBMITTED row in DB
    return;
  }

  async receive(opts?: { waitMs?: number }): Promise<QueueMessage | null> {
    // Atomic claim (Postgres): pick one SUBMITTED row, set RUNNING, return id+language.
    // Uses SKIP LOCKED to avoid contention with other workers.
    const rows = await prisma.$queryRawUnsafe<{
      id: number; language: string;
    }[]>(`
      WITH cte AS (
        SELECT "id","language"
        FROM "Attempt"
        WHERE "status" = 'SUBMITTED'
        ORDER BY "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "Attempt" a
      SET "status" = 'RUNNING',
          "startedAt" = NOW()
      FROM cte
      WHERE a."id" = cte."id"
      RETURNING a."id" AS id, a."language" AS language;
    `);

    if (!rows || rows.length === 0) {
      // optional small wait to avoid tight loop
      const waitMs = opts?.waitMs ?? 1000;
      await new Promise(r => setTimeout(r, waitMs));
      return null;
    }

    const row = rows[0];
    const msg: QueueMessage<AttemptJob> = {
      id: String(row.id),
      job: { attemptId: row.id, language: row.language as any },
    };
    return msg;
  }

  async delete(_msg: QueueMessage): Promise<void> {
    // no-op: completion is persisted by worker updating Attempt row
    return;
  }

  async fail(_msg: QueueMessage, _reason?: string): Promise<void> {
    // no-op for dev; (could write a dead-letter table later)
    return;
  }
}
