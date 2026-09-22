/**
 * Helpers nom des associés.
 * Convention stockage (rétro-compatible) :
 *   "Nina"          -> prénom seul (nom absent)
 *   "Nina Lucas"    -> prénom + nom
 * Le prénom est le premier mot ; le nom est le reste.
 */

export function getFirstName(name) {
  return (name || '').trim().split(' ')[0] || '';
}

export function getLastName(name) {
  const parts = (name || '').trim().split(' ').filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

export function buildFullName(firstName, lastName) {
  return [firstName, lastName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
}
