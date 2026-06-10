export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 20;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor<T>(cursor: T): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

export function decodeCursor<T>(
  cursor: string,
  validator: (decoded: any) => boolean
): T | null {
  try {
    const jsonString = Buffer.from(cursor, "base64").toString("utf8");
    const decoded = JSON.parse(jsonString);
    if (validator(decoded)) {
      return decoded as T;
    }
    return null;
  } catch {
    return null;
  }
}
