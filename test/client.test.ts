import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@activepieces/pieces-common', () => ({
  httpClient: { sendRequest: vi.fn() },
  HttpMethod: { GET: 'GET', POST: 'POST' },
  AuthenticationType: { BEARER_TOKEN: 'bearer' },
}));

import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { taodockRequest } from '../src/lib/common/client';

const sendRequest = vi.mocked(httpClient.sendRequest);

beforeEach(() => {
  sendRequest.mockReset();
});

describe('taodockRequest', () => {
  it('joins the base URL, sends the client header and Bearer token', async () => {
    sendRequest.mockResolvedValueOnce({ status: 200, body: { ok: true } } as never);

    const response = await taodockRequest<{ ok: boolean }>('sk-test', 'GET', 'models');

    expect(response.body).toEqual({ ok: true });
    expect(sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: HttpMethod.GET,
        url: 'https://taodock.com/v1/models',
        headers: { 'X-TaoDock-Client': 'taodock-activepieces/0.1.0' },
        authentication: { type: 'bearer', token: 'sk-test' },
      }),
    );
  });

  it('strips leading slashes from the path', async () => {
    sendRequest.mockResolvedValueOnce({ status: 200, body: {} } as never);
    await taodockRequest('sk', 'GET', '/videos/1');
    expect(sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://taodock.com/v1/videos/1' }),
    );
  });

  it('forwards the JSON body', async () => {
    sendRequest.mockResolvedValueOnce({ status: 200, body: {} } as never);
    await taodockRequest('sk', 'POST', 'images/generations', { body: { model: 'm' } });
    expect(sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({ body: { model: 'm' } }),
    );
  });

  it('forwards responseType and timeout', async () => {
    sendRequest.mockResolvedValueOnce({ status: 200, body: new ArrayBuffer(0) } as never);
    await taodockRequest('sk', 'GET', 'videos/1/content', {
      responseType: 'arraybuffer',
      timeout: 6000,
    });
    expect(sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({ responseType: 'arraybuffer', timeout: 6000 }),
    );
  });

  it('throws a readable error for structured API errors', async () => {
    sendRequest.mockResolvedValueOnce({
      status: 503,
      body: { error: { message: 'model_not_found' } },
    } as never);

    await expect(taodockRequest('sk', 'GET', 'models')).rejects.toThrow(
      'Taodock API error (HTTP 503): model_not_found',
    );
  });

  it('throws a readable error for plain text bodies', async () => {
    sendRequest.mockResolvedValueOnce({ status: 401, body: 'Unauthorized' } as never);
    await expect(taodockRequest('sk', 'GET', 'models')).rejects.toThrow(
      'Taodock API error (HTTP 401): Unauthorized',
    );
  });

  it('falls back to the status code when there is no body', async () => {
    sendRequest.mockResolvedValueOnce({ status: 500, body: undefined } as never);
    await expect(taodockRequest('sk', 'GET', 'models')).rejects.toThrow(
      'Taodock API error (HTTP 500)',
    );
  });
});
