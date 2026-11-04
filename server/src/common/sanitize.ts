import sanitizeHtml from 'sanitize-html';

export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote', 'code', 'pre', 'hr', 'br', 'span', 'div'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: [],
    allowProtocolRelative: false,
  });
}

export function toText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}