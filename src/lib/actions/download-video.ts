import { createAction, Property } from '@activepieces/pieces-framework';
import { taodockAuth } from '../common/auth';
import { taodockRequest } from '../common/client';
import { getSecret } from '../common/models';
import { extractTaskId } from '../common/payloads';
import { VIDEO_DOWNLOAD_TIMEOUT_MS } from '../common/constants';

/**
 * Minimal structural type for the Activepieces files API.
 * Kept loose on purpose so the piece keeps building across
 * pieces-framework versions that return either a URL string
 * or a file descriptor from `files.write`.
 */
interface PieceFilesLike {
  write: (options: { fileName: string; data: Buffer }) => Promise<unknown>;
}

export const downloadVideo = createAction({
  name: 'download_video',
  displayName: 'Download Video',
  description: 'Download the completed video file of a Taodock video task and save it as a file.',
  auth: taodockAuth,
  props: {
    taskId: Property.ShortText({
      displayName: 'Task ID',
      description: 'The ID of the completed video task.',
      required: true,
    }),
  },
  async run({ auth, propsValue, files }) {
    const taskId = propsValue.taskId.trim();
    const model = undefined;
    return downloadVideoFile(getSecret(auth), taskId, files, model);
  },
});

export async function downloadVideoFile(
  secret: string,
  taskId: string,
  files: PieceFilesLike,
  model?: string,
): Promise<Record<string, unknown>> {
  const response = await taodockRequest<ArrayBuffer>(secret, 'GET', `videos/${encodeURIComponent(taskId)}/content`, {
    responseType: 'arraybuffer',
    timeout: VIDEO_DOWNLOAD_TIMEOUT_MS,
  });

  const contentType = responseHeader(response.headers, 'content-type');
  const mimeType = contentType?.split(';')[0] || 'video/mp4';
  const fileName = `${taskId}.mp4`;
  const url = await files.write({
    fileName,
    data: Buffer.from(response.body),
  });

  return {
    task_id: extractTaskId({ id: taskId }) || taskId,
    status: 'completed',
    ...(model ? { model } : {}),
    url: normalizeFileUrl(url),
    fileName,
    mimeType,
  };
}

function responseHeader(
  headers: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

function normalizeFileUrl(url: unknown): string {
  if (typeof url === 'string') {
    return url;
  }
  if (url !== null && typeof url === 'object') {
    const record = url as Record<string, unknown>;
    if (typeof record.url === 'string') {
      return record.url;
    }
  }
  return '';
}
