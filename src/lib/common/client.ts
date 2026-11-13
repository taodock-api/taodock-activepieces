import type { PieceAuth } from '@activepieces/pieces-framework';
import type { HttpMethod } from '@activepieces/pieces-common';
import { AuthenticationType, httpClient } from '@activepieces/pieces-common';
import { TAODOCK_BASE_URL } from './constants';

/**
 * Shared HTTP client for the Taodock OpenAI-compatible API.
 * Every request is authenticated with the user's own API key,
 * which is never logged or persisted outside Activepieces connections.
 */
export async function taodockRequest<T>(
  auth: string,
  method: 'GET' | 'POST',
  path: string,
  options: {
    body?: Record<string, unknown>;
    responseType?: 'json' | 'arraybuffer' | 'text';
    timeout?: number;
  } = {},
): Promise<{ status: number; body: T; headers?: Record<string, unknown> }> {
  const response = await httpClient.sendRequest<T>({
    method: method as HttpMethod,
    url: `${TAODOCK_BASE_URL}/${path.replace(/^\/+/, '')}`,
    headers: {
      'X-TaoDock-Client': 'taodock-activepieces/0.1.0',
    },
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token: auth,
    },
    ...(options.body !== undefined ? { body: options.body } : {}),
    ...(options.responseType !== undefined ? { responseType: options.responseType } : {}),
    ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
  });

  if (response.status >= 400) {
    throw new Error(taodockErrorMessage(response.status, response.body));
  }

  return response;
}

function taodockErrorMessage(status: number, body: unknown): string {
  const detail = extractErrorMessage(body);
  if (detail) {
    return `Taodock API error (HTTP ${status}): ${detail}`;
  }
  return `Taodock API error (HTTP ${status})`;
}

function extractErrorMessage(body: unknown): string | undefined {
  if (body === null || body === undefined) {
    return undefined;
  }
  if (typeof body === 'string') {
    const trimmed = body.trim();
    return trimmed ? trimmed.slice(0, 500) : undefined;
  }
  if (typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const error = record.error;
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object') {
      const message = (error as Record<string, unknown>).message;
      if (typeof message === 'string' && message) {
        return message;
      }
    }
    const message = record.message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }
  return undefined;
}

export type { PieceAuth };
