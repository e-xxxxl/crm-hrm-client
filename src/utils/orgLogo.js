import ajclLogo from "../assets/logos/ajcl.png";
import quickshipLogo from "../assets/logos/quickship.png";
import naijatradiesLogo from "../assets/logos/naijatradies.png";

// Default per-brand logos, keyed by Organization.type (see the server's
// ORG_TYPES). Imported (not referenced from public/) so Vite fingerprints
// the built filename with a content hash — replacing the source file under
// the same name always busts the browser/CDN cache on the next build,
// instead of silently keeping the old cached bytes at an unchanged URL.
// An org can still override its logo via HR Settings → Branding (stored as
// Organization.logoUrl) — that takes priority when set; this is just the
// out-of-the-box default.
const DEFAULT_LOGOS = {
  courier: ajclLogo,
  logistics: quickshipLogo,
  marketplace: naijatradiesLogo,
};

export function orgLogoFor(organizationType, organizationLogoUrl) {
  return organizationLogoUrl || DEFAULT_LOGOS[organizationType] || null;
}
