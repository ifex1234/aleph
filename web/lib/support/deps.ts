import { getBachsClient } from "./bachs";
import { createPostgresSupportStore } from "./store";
import type { SupportDeps } from "./types";

export function getSupportDeps(): SupportDeps {
  return {
    store: createPostgresSupportStore(),
    bachs: getBachsClient(),
  };
}
