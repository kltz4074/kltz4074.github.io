# LAB media

Put images and videos for `content/experiments.json` in this folder.

Example:

```text
media/experiments/floating-objects.mp4
```

Then set:

```json
"mediaUrl": "media/experiments/floating-objects.mp4",
"mediaType": "video"
```

Use repository-relative paths without a leading slash. The admin panel does
this automatically and names uploaded files from the experiment `id`.
