import { createAction } from '@activepieces/pieces-framework';
import { taodockAuth } from '../common/auth';
import { taodockRequest } from '../common/client';
import { getSecret } from '../common/models';
import { parseModelRecords } from '../common/payloads';

export const listModels = createAction({
  name: 'list_models',
  displayName: 'List Models',
  description: 'List the AI models available to your Taodock API key.',
  auth: taodockAuth,
  props: {},
  async run({ auth }) {
    const response = await taodockRequest<unknown>(getSecret(auth), 'GET', 'models');
    return {
      models: parseModelRecords(response.body),
    };
  },
});
