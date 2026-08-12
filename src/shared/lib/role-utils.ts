export function hasRole(userRoles: string[], role: string) {
  return userRoles.includes(role) || userRoles.includes(`ROLE_${role}`);
}
