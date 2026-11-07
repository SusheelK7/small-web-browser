export function normalizeAddress(input: string): string {
  let a = (input ?? '').trim().toLowerCase();
  a = a.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  a = a.split('#')[0].split('?')[0];
  a = a.replace(/\/+$/, '');
  return a;
}