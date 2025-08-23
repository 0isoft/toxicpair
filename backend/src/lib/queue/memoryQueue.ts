import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { AttemptJob } from "../types";
import type { JobQueue, QueueMessage } from "./types";

export class InMemoryJobQueue implements JobQueue {
  private q: QueueMessage<AttemptJob>[] = [];
  private bus = new EventEmitter();

  async enqueueAttempt(job: AttemptJob): Promise<void> {
    const msg: QueueMessage<AttemptJob> = { id: randomUUID(), job };
    this.q.push(msg);
    // notify one waiter
    this.bus.emit("msg");
  }

  async receive(opts?: { waitMs?: number }): Promise<QueueMessage<AttemptJob> | null> {
    if (this.q.length > 0) return this.q.shift()!;
    const waitMs = opts?.waitMs ?? 1000;

    // wait until either a message arrives or timeout
    return new Promise((resolve) => {
      const onMsg = () => {
        cleanup();
        resolve(this.q.shift() ?? null);
      };
      const onTimeout = () => {
        cleanup();
        resolve(null);
      };
      const cleanup = () => {
        clearTimeout(t);
        this.bus.off("msg", onMsg);
      };
      const t = setTimeout(onTimeout, waitMs);
      this.bus.once("msg", onMsg);
    });
  }

  async delete(_msg: QueueMessage): Promise<void> {
    // nothing to do for memory queue
  }

  async fail(_msg: QueueMessage, _reason?: string): Promise<void> {
    // optional: push to a dead list; for dev we no-op
  }
}
