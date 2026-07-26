import type { CustomLink } from '../store/useStore.ts';

export const normalizeUsername = (username: string) =>
  username.trim().replace(/^@/, '').toLowerCase();

export const isValidUsername = (username: string) =>
  /^[\p{L}\p{N}._-]{3,30}$/u.test(normalizeUsername(username));

export function sanitizePublicLinks(links: CustomLink[]): CustomLink[] {
  return links.map((link) => {
    const sanitized: CustomLink = { ...link };
    if (link.donationConfig) {
      sanitized.donationConfig = { ...link.donationConfig };
      delete sanitized.donationConfig.idNumber;
    }
    if (link.links) sanitized.links = sanitizePublicLinks(link.links);
    return sanitized;
  });
}

export function applyLinkClicks(
  links: CustomLink[],
  linkClicks: Record<string, number>,
): CustomLink[] {
  return links.map((link) => ({
    ...link,
    clicks: linkClicks[link.id] || 0,
    links: link.links ? applyLinkClicks(link.links, linkClicks) : undefined,
  }));
}
