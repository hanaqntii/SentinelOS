import { withLatency } from "@/services/api/mock-utils";
import { mockDb } from "@/services/api/mock-db";
import type { User, UserRole } from "@/types";

export const authApi = {
  async loginAs(role: UserRole) {
    const user = mockDb.users.find((entry) => entry.role === role);

    if (!user) {
      throw new Error(`Role not found: ${role}`);
    }

    return withLatency<User>(user);
  }
};
