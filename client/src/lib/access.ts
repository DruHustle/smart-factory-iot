export type AppRole = "user" | "viewer" | "operator" | "engineer" | "admin";

const roleRank: Record<AppRole, number> = {
  user: 0,
  viewer: 0,
  operator: 1,
  engineer: 2,
  admin: 3,
};

export function hasMinimumRole(role: string | undefined, minimum: Exclude<AppRole, "user">) {
  return (roleRank[role as AppRole] ?? -1) >= roleRank[minimum];
}

export function canViewEngineering(role: string | undefined) {
  return hasMinimumRole(role, "engineer");
}

export function canAdministerUsers(role: string | undefined) {
  return role === "admin";
}

export function roleLabel(role: string | undefined) {
  return role === "user" ? "Viewer" : role ? role[0].toUpperCase() + role.slice(1) : "Viewer";
}
