/**
 * Format a doc page URL into a human-readable title.
 * e.g. "/docs/language-learning/quick-references/fluent-forever" → "Fluent Forever"
 */
export function formatPageTitle(pageUrl: string): string {
  const segment = pageUrl.replace(/\/$/, '').split('/').filter(Boolean).pop() ?? pageUrl;
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
