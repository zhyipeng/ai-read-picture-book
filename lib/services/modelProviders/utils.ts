import { parseExtraParamsObject } from "@/lib/settings/configs";

export function joinUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function buildBearerHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export function getExtraParams(extraParams: string | null): Record<string, unknown> {
  return parseExtraParamsObject(extraParams) ?? {};
}

export function assertObjectRecord(
  value: unknown,
  errorMessage: string
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return value as Record<string, unknown>;
}
