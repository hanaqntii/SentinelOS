export type UserRole = "admin" | "operator" | "viewer";

export interface User {
  id: string;
  role: UserRole;
}
