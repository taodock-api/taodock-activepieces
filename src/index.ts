import { createPiece } from '@activepieces/pieces-framework';
import { taodockAuth } from './lib/common/auth';
import { listModels } from './lib/actions/list-models';
import { generateImage } from './lib/actions/generate-image';
import { createVideo } from './lib/actions/create-video';
import { getVideoStatus } from './lib/actions/get-video-status';
import { downloadVideo } from './lib/actions/download-video';
import { TAODOCK_LOGO_URL } from './lib/common/constants';

export const taodock = createPiece({
  displayName: 'Taodock',
  description:
    'Taodock provides a unified AI API for image and video generation. List your authorized models, generate images and videos, track async video tasks and download the results.',
  logoUrl: TAODOCK_LOGO_URL,
  auth: taodockAuth,
  minimumSupportedRelease: '0.36.1',
  authors: ['taodock-api', 'Taodock'],
  actions: [listModels, generateImage, createVideo, getVideoStatus, downloadVideo],
  triggers: [],
});
