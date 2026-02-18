import { withLatency } from "@/services/api/mock-utils";
import { mockDb } from "@/services/api/mock-db";

export const organizationApi = {
  async getCurrent() {
    return withLatency(mockDb.organization);
  }
};
