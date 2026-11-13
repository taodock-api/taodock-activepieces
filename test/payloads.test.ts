import { describe, expect, it } from 'vitest';
import {
  buildImageRequestBody,
  buildVideoRequestBody,
  extractTaskError,
  extractTaskId,
  extractTaskStatus,
  imageFileExtension,
  imageMediaType,
  isFailedVideoStatus,
  isTerminalVideoStatus,
  parseModelIds,
  parseModelRecords,
} from '../src/lib/common/payloads';

describe('buildImageRequestBody', () => {
  it('includes the minimal required fields', () => {
    expect(buildImageRequestBody('img-model', 'a fox', {})).toEqual({
      model: 'img-model',
      prompt: 'a fox',
      response_format: 'b64_json',
    });
  });

  it('maps optional settings to API field names', () => {
    const body = buildImageRequestBody('m', 'p', {
      size: '1024x1024',
      outputFormat: 'webp',
      aspectRatio: '16:9',
      negativePrompt: 'blur',
      referenceImageUrl: 'https://example.com/a.png',
      count: 2,
      seed: 42,
      quality: 'high',
    });
    expect(body).toMatchObject({
      size: '1024x1024',
      output_format: 'webp',
      aspect_ratio: '16:9',
      negative_prompt: 'blur',
      image_url: 'https://example.com/a.png',
      n: 2,
      seed: 42,
      quality: 'high',
    });
  });

  it('ignores empty strings and non-finite numbers', () => {
    const body = buildImageRequestBody('m', 'p', {
      size: '   ',
      count: Number.NaN,
      seed: 0,
    });
    expect(body).not.toHaveProperty('size');
    expect(body).not.toHaveProperty('n');
    expect(body).not.toHaveProperty('seed');
  });
});

describe('buildVideoRequestBody', () => {
  it('includes the minimal required fields', () => {
    expect(buildVideoRequestBody('vid-model', 'a wave', {})).toEqual({
      model: 'vid-model',
      prompt: 'a wave',
    });
  });

  it('maps optional settings to API field names', () => {
    const body = buildVideoRequestBody('m', 'p', {
      duration: 5,
      resolution: '1080p',
      aspectRatio: '16:9',
      mode: 'standard',
      imageUrl: 'https://example.com/first.png',
      lastFrameUrl: 'https://example.com/last.png',
      inputVideoUrl: 'https://example.com/in.mp4',
      negativePrompt: 'noise',
      audio: true,
      seed: 7,
    });
    expect(body).toMatchObject({
      duration: 5,
      resolution: '1080p',
      aspect_ratio: '16:9',
      mode: 'standard',
      image_url: 'https://example.com/first.png',
      last_frame_url: 'https://example.com/last.png',
      input_video_url: 'https://example.com/in.mp4',
      negative_prompt: 'noise',
      audio: true,
      seed: 7,
    });
  });
});

describe('video task helpers', () => {
  it('extracts the task id from id or task_id', () => {
    expect(extractTaskId({ id: 'abc' })).toBe('abc');
    expect(extractTaskId({ task_id: 123 })).toBe('123');
    expect(extractTaskId({ status: 'queued' })).toBe('');
    expect(extractTaskId(null)).toBe('');
  });

  it('normalizes status to lowercase', () => {
    expect(extractTaskStatus({ status: 'Completed' })).toBe('completed');
    expect(extractTaskStatus({})).toBe('unknown');
  });

  it('classifies terminal and failed statuses', () => {
    expect(isTerminalVideoStatus('completed')).toBe(true);
    expect(isTerminalVideoStatus('succeeded')).toBe(true);
    expect(isTerminalVideoStatus('queued')).toBe(false);
    expect(isFailedVideoStatus('failed')).toBe(true);
    expect(isFailedVideoStatus('completed')).toBe(false);
  });

  it('extracts error messages', () => {
    expect(extractTaskError({ error: { message: 'boom' } })).toBe('boom');
    expect(extractTaskError({ error: 'boom' })).toBe('boom');
    expect(extractTaskError({})).toBeUndefined();
  });
});

describe('media type helpers', () => {
  it('maps formats to mime types', () => {
    expect(imageMediaType('jpeg')).toBe('image/jpeg');
    expect(imageMediaType('webp')).toBe('image/webp');
    expect(imageMediaType(undefined)).toBe('image/png');
  });

  it('maps mime types back to extensions', () => {
    expect(imageFileExtension('image/webp', 'png')).toBe('webp');
    expect(imageFileExtension(undefined, 'jpeg')).toBe('jpeg');
    expect(imageFileExtension('application/octet-stream', '')).toBe('png');
  });
});

describe('parseModelIds', () => {
  it('reads the OpenAI-style data array', () => {
    expect(
      parseModelIds({ data: [{ id: 'b-model' }, { id: 'a-model' }, { id: 'b-model' }] }),
    ).toEqual(['a-model', 'b-model']);
  });

  it('reads a plain array of objects or strings', () => {
    expect(parseModelIds([{ id: 'x' }, 'y'])).toEqual(['x', 'y']);
  });

  it('handles unexpected payloads', () => {
    expect(parseModelIds(null)).toEqual([]);
    expect(parseModelIds({ data: 'nope' })).toEqual([]);
  });
});

describe('parseModelRecords', () => {
  it('returns model objects from the data array', () => {
    const models = parseModelRecords({ data: [{ id: 'a', object: 'model' }] });
    expect(models).toEqual([{ id: 'a', object: 'model' }]);
  });
});
