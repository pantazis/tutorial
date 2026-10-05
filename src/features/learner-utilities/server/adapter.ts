import "server-only";

import { currentSessionToken } from "@/features/identity/server/adapter";
import { getPool } from "@/server/db/pool";
import { LearnerUtilitiesService } from "@/server/learner-utilities/service";
import { NotificationService } from "@/server/notifications/service";
import { OversightService } from "@/server/oversight/service";

export async function learnerUtilitiesRequest() {
  const pool = getPool();
  return {
    sessionToken: await currentSessionToken(),
    utilities: new LearnerUtilitiesService(pool),
    notifications: new NotificationService(pool),
    oversight: new OversightService(pool),
  };
}