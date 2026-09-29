const configuredAdminEmail = (
  import.meta.env.VITE_ADMIN_EMAIL?.trim() || "benayounidan92@gmail.com"
).toLowerCase();

export function isAdminEmail(email: string | undefined) {
  return email?.trim().toLowerCase() === configuredAdminEmail;
}
