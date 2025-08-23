import { AttemptJob } from "../types";

export type QueueMessage<J = AttemptJob> = {
  id: string;           // queue-specific message id/handle
  job: J;               // payload
};

export interface JobQueue {
  // API service calls this to enqueue a new attempt
  enqueueAttempt(job: AttemptJob): Promise<void>;

  // Worker calls this to get the next job (or null after waitMs)
  receive(opts?: { waitMs?: number }): Promise<QueueMessage | null>;

  // Worker must delete (ack) the message after successful processing
  delete(msg: QueueMessage): Promise<void>;

  // Worker can mark a message as failed (for visibility/backoff/etc.)
  fail(msg: QueueMessage, reason?: string): Promise<void>;
}
