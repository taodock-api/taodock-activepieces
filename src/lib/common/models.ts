import { Property } from '@activepieces/pieces-framework';
import { taodockAuth } from './auth';
import { taodockRequest } from './client';
import { parseModelIds } from './payloads';

/**
 * Dynamic dropdown listing the models authorized for the connected
 * Taodock API key (GET /v1/models). Model availability is dynamic,
 * so the list is always fetched live instead of being hardcoded.
 */
export function modelDropdown(description: string) {
  return Property.Dropdown<string, true, typeof taodockAuth>({
    displayName: 'Model',
    auth: taodockAuth,
    required: true,
    description,
    refreshers: ['auth'],
    options: async ({ auth }) => {
      const secret = getSecret(auth);
      if (!secret) {
        return {
          disabled: true,
          placeholder: 'Connect your Taodock account first',
          options: [],
        };
      }
      try {
        const response = await taodockRequest<unknown>(secret, 'GET', 'models');
        const ids = parseModelIds(response.body);
        if (ids.length === 0) {
          return {
            disabled: true,
            placeholder:
              'No models are available for this API key. Check your Taodock account and model channels.',
            options: [],
          };
        }
        return {
          disabled: false,
          options: ids.map((id) => ({ label: id, value: id })),
        };
      } catch {
        return {
          disabled: true,
          placeholder: "Couldn't load models. Check your API key or try again.",
          options: [],
        };
      }
    },
  });
}

/**
 * The framework passes the SecretText auth value either as a plain
 * string or wrapped, depending on the pieces-framework version.
 */
export function getSecret(auth: unknown): string {
  if (typeof auth === 'string') {
    return auth;
  }
  if (auth !== null && typeof auth === 'object') {
    const record = auth as Record<string, unknown>;
    const secretText = record.secret_text;
    if (typeof secretText === 'string') {
      return secretText;
    }
    const innerAuth = record.auth;
    if (typeof innerAuth === 'string') {
      return innerAuth;
    }
  }
  return '';
}
