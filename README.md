# Taodock piece for Activepieces

Use the [Taodock](https://taodock.com) unified AI API inside [Activepieces](https://www.activepieces.com) flows: discover the models authorized for your API key, generate images and videos, track async video generation tasks and download the finished files.

- **npm package:** `@taodock-ai/piece-taodock`
- **Source:** <https://github.com/taodock-api/taodock-activepieces>
- **Taodock docs:** <https://docs.taodock.com>
- **Model catalog:** <https://taodock.com/models>
- **License:** MIT

## Installation

1. In Activepieces, open **Settings → My Pieces → Install Piece**.
2. Type the package name: `@taodock-ai/piece-taodock`.
3. Confirm the install, then add the piece to any flow.

The piece works on Activepieces Cloud and on self-hosted deployments (minimum supported release 0.36.1).

## Connect your account

1. Create an API key in the Taodock console: <https://taodock.com/keys>.
2. In the flow builder, add a Taodock action and paste the key when prompted.

The key is stored in your Activepieces connection. It is never included in the piece source, logs or published package.

## Actions

| Action | Description |
|---|---|
| **List Models** | Lists the AI models available to your API key (`GET /v1/models`). Useful for discovering which image and video model IDs you can use. |
| **Generate Image** | Generates one or more images from a prompt (`POST /v1/images/generations`). Each result is saved as a flow file with its URL. |
| **Create Video** | Starts an async video generation task (`POST /v1/videos`). Optionally waits up to a configured number of seconds and downloads the finished video. |
| **Get Video Status** | Checks the current status of a video task (`GET /v1/videos/{id}`). |
| **Download Video** | Downloads the finished video file of a completed task (`GET /v1/videos/{id}/content`). |

Image and video model IDs are loaded dynamically from your account, so the dropdown always reflects what your key can actually use. Model availability, pricing and grouping are dynamic — check the [model catalog](https://taodock.com/models) for current details.

### Optional image parameters

`size`, `aspect_ratio`, `quality`, `output_format` (`png` / `jpeg` / `webp`), `negative_prompt`, `referenceImageUrl` (image to reference), `count` (number of images), `seed`.

### Optional video parameters

`duration`, `resolution`, `aspect_ratio`, `mode`, `imageUrl` (first frame), `lastFrameUrl` (last frame), `inputVideoUrl` (video to extend), `negative_prompt`, `audio`, `seed`.

## Typical flows

- **Prompt → image → publish:** Generate an image with Taodock, then post the file URL to Slack, Notion or WordPress.
- **Prompt → video → wait → publish:** Create a video task, wait for completion, then attach the downloaded file to an email or upload it to cloud storage.
- **Model inventory report:** Run *List Models* on a schedule and log the available models to a sheet, so you notice channel changes early.

## Compatibility and limits

- The piece talks to the OpenAI-compatible endpoint `https://taodock.com/v1` with Bearer authentication.
- Video generation is asynchronous: *Create Video* returns a task immediately unless you enable waiting. Long generations should be handled with *Get Video Status* and *Download Video* in a scheduled or web-hook driven flow.
- Image generation requires an image-capable model and video generation requires a video-capable model; selecting a chat-only model will fail server-side.
- Usage is billed to your Taodock account wallet per the model pricing shown in the Taodock console.

## Development

```bash
npm install
npm run verify       # typecheck + lint + tests + bundle build + bundle smoke test
npm run pack:check   # preview the published tarball
```

The publishable artifact is a single self-contained CommonJS bundle (`dist/src/index.js`) generated with esbuild, mirroring how Activepieces itself bundles community pieces. Publishing happens from `dist/` via the tag-driven GitHub Actions workflow.

## Privacy

The piece only sends the data you explicitly configure in action fields (prompts, model IDs, task IDs and image/video URLs) to `https://taodock.com/v1`. No telemetry is collected by this piece. See the Taodock privacy documentation for the API side.
