import { PieceAuth } from '@activepieces/pieces-framework';
import { AuthenticationType, httpClient, HttpMethod } from '@activepieces/pieces-common';
import { TAODOCK_BASE_URL } from './constants';

export const taodockAuth = PieceAuth.SecretText({
  displayName: 'API Key',
  required: true,
  description:
    'Create a key in the Taodock console (https://taodock.com/keys) and paste it here. The key is stored in your Activepieces connection and is never shared with anyone else.',
  validate: async (auth) => {
    try {
      await httpClient.sendRequest({
        method: HttpMethod.GET,
        url: `${TAODOCK_BASE_URL}/models`,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
          token: auth.auth,
        },
      });
      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Invalid Taodock API key. Create a key at https://taodock.com/keys and try again.',
      };
    }
  },
});
