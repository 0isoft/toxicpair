import type { Runner } from "./types";
import { LocalRunner } from "./localRunner";

let singleton: Runner | null = null;

export function makeRunner(): Runner {
  if (singleton) return singleton;

  const impl = (process.env.RUNNER_IMPL || "local").toLowerCase();

  switch (impl) {
    // case "docker":  return (singleton = new DockerRunner(...));
    // case "fargate": return (singleton = new FargateRunner(...));
    // case "ecs":     return (singleton = new EcsChildContainerRunner(...));
    default:
      return (singleton = new LocalRunner());
  }
}
