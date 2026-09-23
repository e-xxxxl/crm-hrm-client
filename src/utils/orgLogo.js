// Default per-brand logos, dropped into client/public by the user. Keyed by
// Organization.type (see the server's ORG_TYPES). An org can still override
// its logo via HR Settings → Branding (stored as Organization.logoUrl) —
// that takes priority when set; this is just the out-of-the-box default.
const DEFAULT_LOGOS = {
  courier: "/ajcl.png",
  logistics: "/quickship.png",
  marketplace: "/naijatradies.png",
};

export function orgLogoFor(organizationType, organizationLogoUrl) {
  return organizationLogoUrl || DEFAULT_LOGOS[organizationType] || null;
}
