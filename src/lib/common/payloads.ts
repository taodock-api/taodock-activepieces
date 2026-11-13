/**
 * Pure request/response helpers for the Taodock API.
 * Kept free of framework imports so they are trivially testable.
 */

export type JsonRecord = Record<string, unknown>;

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function buildImageRequestBody(
  model: string,
  prompt: string,
  settings: JsonRecord,
): JsonRecord {
  const body: JsonRecord = { model, prompt, response_format: 'b64_json' };
  const size = nonEmptyString(settings.size);
  const quality = nonEmptyString(settings.quality);
  const outputFormat = nonEmptyString(settings.outputFormat);
  const aspectRatio = nonEmptyString(settings.aspectRatio);
  const negativePrompt = nonEmptyString(settings.negativePrompt);
  const referenceImageUrl = nonEmptyString(settings.referenceImageUrl);
  const count = finiteNumber(settings.count);
  const seed = finiteNumber(settings.seed);
  if (size) body.size = size;
  if (quality) body.quality = quality;
  if (outputFormat) body.output_format = outputFormat;
  if (aspectRatio) body.aspect_ratio = aspectRatio;
  if (negativePrompt) body.negative_prompt = negativePrompt;
  if (referenceImageUrl) body.image_url = referenceImageUrl;
  if (count !== undefined) body.n = count;
  if (seed !== undefined && seed > 0) body.seed = seed;
  return body;
}

export function buildVideoRequestBody(
  model: string,
  prompt: string,
  settings: JsonRecord,
): JsonRecord {
  const body: JsonRecord = { model, prompt };
  const duration = finiteNumber(settings.duration);
  const resolution = nonEmptyString(settings.resolution);
  const aspectRatio = nonEmptyString(settings.aspectRatio);
  const mode = nonEmptyString(settings.mode);
  const imageUrl = nonEmptyString(settings.imageUrl);
  const lastFrameUrl = nonEmptyString(settings.lastFrameUrl);
  const inputVideoUrl = nonEmptyString(settings.inputVideoUrl);
  const negativePrompt = nonEmptyString(settings.negativePrompt);
  const seed = finiteNumber(settings.seed);
  if (duration !== undefined && duration > 0) body.duration = duration;
  if (resolution) body.resolution = resolution;
  if (aspectRatio) body.aspect_ratio = aspectRatio;
  if (mode) body.mode = mode;
  if (imageUrl) body.image_url = imageUrl;
  if (lastFrameUrl) body.last_frame_url = lastFrameUrl;
  if (inputVideoUrl) body.input_video_url = inputVideoUrl;
  if (negativePrompt) body.negative_prompt = negativePrompt;
  if (typeof settings.audio === 'boolean') body.audio = settings.audio;
  if (seed !== undefined && seed > 0) body.seed = seed;
  return body;
}

/** Taodock returns the video task id as `id` or `task_id`. */
export function extractTaskId(task: unknown): string {
  if (task === null || typeof task !== 'object') {
    return '';
  }
  const record = task as JsonRecord;
  const value = record.id ?? record.task_id;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/** Normalizes a video task status to a lowercase string. */
export function extractTaskStatus(task: unknown): string {
  if (task === null || typeof task !== 'object') {
    return 'unknown';
  }
  const value = (task as JsonRecord).status;
  return typeof value === 'string' && value ? value.toLowerCase() : 'unknown';
}

export function extractTaskError(task: unknown): string | undefined {
  if (task === null || typeof task !== 'object') {
    return undefined;
  }
  const error = (task as JsonRecord).error;
  if (error && typeof error === 'object') {
    const message = (error as JsonRecord).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return undefined;
}

export function isTerminalVideoStatus(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'succeeded';
}

export function isFailedVideoStatus(status: string): boolean {
  return status === 'failed';
}

export function imageMediaType(format: string | undefined): string {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

export function imageFileExtension(mimeType: string | undefined, fallbackFormat: string): string {
  if (mimeType === 'image/jpeg') return 'jpeg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/png') return 'png';
  return fallbackFormat || 'png';
}

export function parseModelIds(response: unknown): string[] {
  const list: unknown[] = Array.isArray(response)
    ? response
    : response && typeof response === 'object' && Array.isArray((response as JsonRecord).data)
      ? ((response as JsonRecord).data as unknown[])
      : [];
  const ids: string[] = [];
  for (const entry of list) {
    if (typeof entry === 'string') {
      ids.push(entry);
    } else if (entry && typeof entry === 'object') {
      const id = (entry as JsonRecord).id;
      if (typeof id === 'string' && id) {
        ids.push(id);
      }
    }
  }
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

export function parseModelRecords(response: unknown): JsonRecord[] {
  const list: unknown[] = Array.isArray(response)
    ? response
    : response && typeof response === 'object' && Array.isArray((response as JsonRecord).data)
      ? ((response as JsonRecord).data as unknown[])
      : [];
  return list.filter((entry): entry is JsonRecord => entry !== null && typeof entry === 'object');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
