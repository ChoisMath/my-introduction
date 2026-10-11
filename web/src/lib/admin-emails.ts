export function isAdminEmail(email: string | null | undefined, raw: string | undefined): boolean {
  const target = email?.trim().toLowerCase();
  if (!target) return false;
  return (raw ?? '').split(',').some((e) => e.trim().toLowerCase() === target);
}
