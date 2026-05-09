import type { HttpModelRequest } from "@/lib/services/modelProviders/types";

export async function executeHttpModelRequest(
  request: HttpModelRequest
): Promise<unknown> {
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "未知错误");
    throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
  }

  return response.json();
}
