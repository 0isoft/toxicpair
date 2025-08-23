import type { JobQueue } from "./types";
import { InMemoryJobQueue } from "./memoryQueue";
import { DbJobQueue } from "./dbQueue";

let singleton: JobQueue | null = null;

export function makeJobQueue(): JobQueue {
  if (singleton) return singleton;
  const impl = (process.env.QUEUE_IMPL || "db").toLowerCase(); // default to db

  switch (impl) {
    case "db":
      singleton = new DbJobQueue(); break;
    case "memory":
      singleton = new InMemoryJobQueue(); break; // same-process only
    default:
      singleton = new DbJobQueue(); break;
  }
  return singleton;
}
