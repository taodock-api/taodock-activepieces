import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@activepieces/pieces-common', () => ({
  httpClient: { sendRequest: vi.fn() },
  HttpMethod: { GET: 'GET', POST: 'POST' },
  AuthenticationType: { BEARER_TOKEN: 'bearer' },
}));

import { httpClient } from '@activepieces/pieces-common';
import { getSecret } from '../src/lib/common/models';
import { generateImage } from '../src/lib/actions/generate-image';
import { createVideo } from '../src/lib/actions/create-video';
import { getVideoStatus } from '../src/lib/actions/get-video-status';
import { downloadVideoFile } from '../src/lib/actions/download-video';

const sendRequest = vi.mocked(httpClient.sendRequest);

interface FakeFile {
  fileName: string;
  data: Buffer;
}

const writtenFiles: FakeFile[] = [];

function fakeFiles() {
  return {
    write: async ({ fileName, data }: { fileName: string; data: Buffer }) => {
      const url = `file://activepieces/${fileName}`;
      writtenFiles.push({ fileName, data });
      return url;
    },
  };
}

beforeEach(() => {
  sendRequest.mockReset();
  writtenFiles.length = 0;
});

describe('getSecret', () => {
  it('unwraps both auth shapes across framework versions', () => {
    expect(getSecret('sk-plain')).toBe('sk-plain');
    expect(getSecret({ secret_text: 'sk-wrapped' })).toBe('sk-wrapped');
    expect(getSecret({ auth: 'sk-inner' })).toBe('sk-inner');
    expect(getSecret(null)).toBe('');
  });
});

describe('generateImage run', () => {
  it('saves b64_json images as files and reports metadata', async () => {
    sendRequest.mockResolvedValueOnce({
      status: 200,
      body: { data: [{ b64_json: Buffer.from('image-bytes').toString('base64') }] },
    } as never);

    const result = await runAction(generateImage as { run?: unknown }, {
      model: 'image-model',
      prompt: 'a fox',
      imageSettings: { outputFormat: 'png' },
    });

    expect(sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://taodock.com/v1/images/generations',
        body: expect.objectContaining({
          model: 'image-model',
          prompt: 'a fox',
          response_format: 'b64_json',
        }),
      }),
    );
    expect(result.model).toBe('image-model');
    expect(result.count).toBe(1);
    const images = result.images as Array<{ mimeType: string; url: string }>;
    expect(images[0]?.mimeType).toBe('image/png');
    expect(images[0]?.url).toMatch(/^file:\/\//);
    expect(writtenFiles).toHaveLength(1);
    expect(writtenFiles[0]?.data.toString()).toBe('image-bytes');
  });

  it('downloads url-based results before saving them', async () => {
    sendRequest
      .mockResolvedValueOnce({ status: 200, body: { data: [{ url: 'https://cdn.example.com/a.webp' }] } } as never)
      .mockResolvedValueOnce({
        status: 200,
        body: new TextEncoder().encode('webp-bytes').buffer,
        headers: { 'content-type': 'image/webp' },
      } as never);

    const result = await runAction(generateImage as { run?: unknown }, {
      model: 'image-model',
      prompt: 'a fox',
      imageSettings: { outputFormat: 'png' },
    });

    const images = result.images as Array<{ mimeType: string; fileName: string }>;
    expect(images[0]?.mimeType).toBe('image/webp');
    expect(images[0]?.fileName).toMatch(/\.webp$/);
    expect(writtenFiles[0]?.data.toString()).toBe('webp-bytes');
  });

  it('throws when the API returns no image data', async () => {
    sendRequest.mockResolvedValueOnce({ status: 200, body: { data: [] } } as never);
    await expect(
      runAction(generateImage as { run?: unknown }, { model: 'm', prompt: 'p' }),
    ).rejects.toThrow('Taodock returned no image data.');
  });
});

describe('createVideo run', () => {
  it('creates a task and returns it immediately without waiting', async () => {
    sendRequest.mockResolvedValueOnce({
      status: 200,
      body: { id: 'task-1', status: 'queued' },
    } as never);

    const result = await runAction(createVideo as { run?: unknown }, {
      model: 'video-model',
      prompt: 'a wave',
      videoSettings: { duration: 5, audio: true },
    });

    expect(sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://taodock.com/v1/videos',
        body: { model: 'video-model', prompt: 'a wave', duration: 5, audio: true },
      }),
    );
    expect(result.task_id).toBe('task-1');
    expect(result.status).toBe('queued');
  });

  it('throws when the task response has no id', async () => {
    sendRequest.mockResolvedValueOnce({ status: 200, body: { status: 'queued' } } as never);
    await expect(
      runAction(createVideo as { run?: unknown }, { model: 'm', prompt: 'p' }),
    ).rejects.toThrow('did not include an ID');
  });
});

describe('getVideoStatus run', () => {
  it('returns the task with normalized id and status', async () => {
    sendRequest.mockResolvedValueOnce({
      status: 200,
      body: { id: 'task-9', status: 'Completed', progress: 100 },
    } as never);

    const result = await runAction(getVideoStatus as { run?: unknown }, { taskId: 'task-9' });

    expect(result.task_id).toBe('task-9');
    expect(result.status).toBe('completed');
    expect(result.progress).toBe(100);
  });
});

describe('downloadVideoFile', () => {
  it('downloads the video content and writes the file', async () => {
    sendRequest.mockResolvedValueOnce({
      status: 200,
      body: new TextEncoder().encode('mp4-bytes').buffer,
      headers: { 'content-type': 'video/mp4' },
    } as never);

    const result = await downloadVideoFile('sk', 'task-2', fakeFiles(), 'video-model');

    expect(sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://taodock.com/v1/videos/task-2/content',
        responseType: 'arraybuffer',
      }),
    );
    expect(result).toMatchObject({
      task_id: 'task-2',
      status: 'completed',
      model: 'video-model',
      url: 'file://activepieces/task-2.mp4',
      fileName: 'task-2.mp4',
      mimeType: 'video/mp4',
    });
    expect(writtenFiles[0]?.data.toString()).toBe('mp4-bytes');
  });
});

async function runAction(
  action: { run?: unknown },
  propsValue: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const run = action.run as (context: unknown) => Promise<Record<string, unknown>>;
  if (typeof run !== 'function') {
    throw new Error('action has no run function');
  }
  return run({ auth: 'sk-test', propsValue, files: fakeFiles() });
}
