const configuredAdminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase();

export function isAdminEmail(email: string | undefined) {
  return Boolean(configuredAdminEmail && email?.trim().toLowerCase() === configuredAdminEmail);
}
