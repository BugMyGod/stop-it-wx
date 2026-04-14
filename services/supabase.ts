import { request } from "./request";

type QueryParams = Record<string, string | number | boolean | undefined>;

function tablePath(table: string): string {
  return `/rest/v1/${table}`;
}

const RETURN_REPRESENTATION = "return=representation";

export function selectRows<T>(
  table: string,
  query: QueryParams,
  accessToken?: string
): Promise<T[]> {
  return request<T[]>({
    path: tablePath(table),
    method: "GET",
    query,
    accessToken,
  });
}

export function insertRows<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  accessToken?: string
): Promise<T[]> {
  return request<T[]>({
    path: tablePath(table),
    method: "POST",
    data: rows,
    accessToken,
    headers: {
      Prefer: RETURN_REPRESENTATION,
    },
  });
}

export function upsertRows<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
  accessToken?: string
): Promise<T[]> {
  return request<T[]>({
    path: tablePath(table),
    method: "POST",
    query: {
      on_conflict: onConflict,
    },
    data: rows,
    accessToken,
    headers: {
      Prefer: `${RETURN_REPRESENTATION},resolution=merge-duplicates`,
    },
  });
}

export function updateRows<T extends Record<string, unknown>>(
  table: string,
  data: Partial<T>,
  filters: QueryParams,
  accessToken?: string
): Promise<T[]> {
  return request<T[]>({
    path: tablePath(table),
    method: "PATCH",
    query: filters,
    data: data as Record<string, unknown>,
    accessToken,
    headers: {
      Prefer: RETURN_REPRESENTATION,
    },
  });
}

export function deleteRows<T extends Record<string, unknown>>(
  table: string,
  filters: QueryParams,
  accessToken?: string
): Promise<T[]> {
  return request<T[]>({
    path: tablePath(table),
    method: "DELETE",
    query: filters,
    accessToken,
    headers: {
      Prefer: RETURN_REPRESENTATION,
    },
  });
}
