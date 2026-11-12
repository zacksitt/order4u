export function signedInPath(role: string, mustChangePassword: boolean): string {
  if (role === "cargo") {
    return mustChangePassword ? "/cargo/change-password" : "/cargo/orders";
  }
  if (role === "customer") {
    return mustChangePassword ? "/customer/change-password" : "/customer/orders";
  }
  return mustChangePassword ? "/agent/change-password" : "/agent/dashboard";
}
