import { createAction, Property } from '@activepieces/pieces-framework';
import { taodockAuth } from '../common/auth';
import { taodockRequest } from '../common/client';
import { getSecret, modelDropdown } from '../common/models';
import {
  buildVideoRequestBody,
  extractTaskError,
  extractTaskId,
  extractTaskStatus,
  isFailedVideoStatus,
  isTerminalVideoStatus,
  sleep,
} from '../common/payloads';
import { DEFAULT_VIDEO_POLL_INTERVAL_MS } from '../common/constants';
import { downloadVideoFile } from './download-video';

export const createVideo = createAction({
  name: 'create_video',
  displayName: 'Create Video',
  description:
    'Start a Taodock video generation task from a text prompt. Optionally wait for completion and download the video file.',
  auth: taodockAuth,
  props: {
    model: modelDropdown('The Taodock video model to use.'),
    prompt: Property.LongText({
      displayName: 'Prompt',
      description: 'Describe the video you want to generate.',
      required: true,
    }),
    videoSettings: Property.Object({
      displayName: 'Video Options',
      description:
        'Optional parameters such as duration, resolution, aspect_ratio, image_url (first frame), last_frame_url, input_video_url, negative_prompt, audio and seed.',
      required: false,
    }),
    waitForCompletionSeconds: Property.Number({
      displayName: 'Wait for Completion (seconds)',
      description:
        'Maximum seconds to wait for the video task to finish. Zero (default) returns the task immediately without waiting.',
      required: false,
    }),
  },
  async run({ auth, propsValue, files }) {
    const settings = isRecord(propsValue.videoSettings) ? propsValue.videoSettings : {};
    const secret = getSecret(auth);
    const model = propsValue.model;

    const created = await taodockRequest<unknown>(secret, 'POST', 'videos', {
      body: buildVideoRequestBody(model, propsValue.prompt, settings),
    });
    let task: unknown = created.body;
    const taskId = extractTaskId(task);
    if (!taskId) {
      throw new Error('The Taodock video task response did not include an ID.');
    }

    const waitSeconds = Number(propsValue.waitForCompletionSeconds ?? 0);
    if (waitSeconds > 0) {
      const deadline = Date.now() + waitSeconds * 1000;
      let status = extractTaskStatus(task);
      while (!isTerminalVideoStatus(status) && Date.now() < deadline) {
        await sleep(DEFAULT_VIDEO_POLL_INTERVAL_MS);
        const polled = await taodockRequest<unknown>(secret, 'GET', `videos/${encodeURIComponent(taskId)}`);
        task = polled.body;
        status = extractTaskStatus(task);
      }

      if (isFailedVideoStatus(status)) {
        throw new Error(extractTaskError(task) ?? 'Taodock video generation failed.');
      }

      if (status === 'completed' || status === 'succeeded') {
        return downloadVideoFile(secret, taskId, files, model);
      }
    }

    const taskRecord = isRecord(task) ? task : {};
    return { ...taskRecord, task_id: taskId, status: extractTaskStatus(task) };
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
