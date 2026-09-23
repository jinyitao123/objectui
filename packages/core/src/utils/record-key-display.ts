/**
 * A database key may identify a row internally, but it is not a readable
 * business name for user-facing titles, breadcrumbs, or reference labels.
 */
export function isDatabaseKeyDisplay(label: string | undefined, recordId: unknown): boolean {
  if (!label?.trim() || recordId == null) return false;
  const display = label.trim();
  const id = String(recordId).trim();
  const shortId = id.length > 12 ? `${id.slice(0, 8)}…` : id;
  return display === id
    || display === `#${id}`
    || display === `#${shortId}`
    || display === `Record #${id}`;
}

/** Field names reserved for the row's storage identity. */
export function isDatabaseKeyField(fieldName: string | undefined): boolean {
  return fieldName === 'id' || fieldName === '_id';
}
