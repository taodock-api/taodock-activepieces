import { createAction, Property } from '@activepieces/pieces-framework';
import { taodockAuth } from '../common/auth';
import { taodockRequest } from '../common/client';
import { getSecret } from '../common/models';
import { extractTaskId, extractTaskStatus } from '../common/payloads';

export const getVideoStatus = createAction({
  name: 'get_video_status',
  displayName: 'Get Video Status',
  description: 'Check the current status of a Taodock video generation task.',
  auth: taodockAuth,
  props: {
    taskId: Property.ShortText({
      displayName: 'Task ID',
      description: 'The ID of the video task returned by Create Video.',
      required: true,
    }),
  },
  async run({ auth, propsValue }) {
    const taskId = propsValue.taskId.trim();
    const response = await taodockRequest<unknown>(getSecret(auth), 'GET', `videos/${encodeURIComponent(taskId)}`);
    const task = response.body;
    return {
      ...(task !== null && typeof task === 'object' ? (task as Record<string, unknown>) : {}),
      task_id: extractTaskId(task) || taskId,
      status: extractTaskStatus(task),
    };
  },
});
