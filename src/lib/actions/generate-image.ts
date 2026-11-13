import { createAction, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { randomBytes } from 'node:crypto';
import { taodockAuth } from '../common/auth';
import { taodockRequest } from '../common/client';
import { getSecret, modelDropdown } from '../common/models';
import { buildImageRequestBody, imageFileExtension, imageMediaType } from '../common/payloads';

interface ImageResultItem {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
}

interface ImageResponse {
  data?: ImageResultItem[];
}

export const generateImage = createAction({
  name: 'generate_image',
  displayName: 'Generate Image',
  description:
    'Generate an image from a text prompt using a Taodock image model. Each generated image is saved as a file.',
  auth: taodockAuth,
  props: {
    model: modelDropdown('The Taodock image model to use (e.g. an image generation model from your account).'),
    prompt: Property.LongText({
      displayName: 'Prompt',
      description: 'Describe the image you want to generate.',
      required: true,
    }),
    imageSettings: Property.Object({
      displayName: 'Image Options',
      description: 'Optional parameters forwarded to the Taodock image endpoint.',
      required: false,
    }),
  },
  async run({ auth, propsValue, files }) {
    const settings = isRecord(propsValue.imageSettings) ? propsValue.imageSettings : {};
    const model = propsValue.model;
    const body = buildImageRequestBody(model, propsValue.prompt, settings);
    const response = await taodockRequest<ImageResponse>(getSecret(auth), 'POST', 'images/generations', {
      body,
    });

    const results = response.body.data ?? [];
    if (results.length === 0) {
      throw new Error('Taodock returned no image data.');
    }

    const format = typeof settings.outputFormat === 'string' ? settings.outputFormat : 'png';
    const images = [];
    for (let index = 0; index < results.length; index++) {
      const item = results[index];
      if (!item) {
        throw new Error(`Image ${index + 1} has no file data.`);
      }
      let buffer: Buffer | undefined;
      let mimeType = imageMediaType(format);

      if (item.b64_json) {
        buffer = Buffer.from(item.b64_json, 'base64');
      } else if (item.url) {
        const downloaded = await httpClient.sendRequest<ArrayBuffer>({
          method: HttpMethod.GET,
          url: item.url,
          responseType: 'arraybuffer',
        });
        buffer = Buffer.from(downloaded.body);
        const contentType = responseHeader(downloaded.headers, 'content-type');
        if (contentType) {
          mimeType = contentType.split(';')[0] || mimeType;
        }
      } else {
        throw new Error(`Image ${index + 1} has no file data.`);
      }

      const extension = imageFileExtension(mimeType, format);
      const fileName = `taodock-${randomBytes(4).toString('hex')}-${index + 1}.${extension}`;
      const url = await files.write({
        fileName,
        data: buffer,
      });
      images.push({
        index: index + 1,
        url,
        fileName,
        mimeType,
        revised_prompt: item.revised_prompt,
      });
    }

    return { model, count: images.length, images };
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
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
