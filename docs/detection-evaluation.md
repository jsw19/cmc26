# Detection evaluation

Run `npm run evaluate:detection -- path/to/manifest.json` with local, orientation-normalized JPEG photos. Paths in the manifest are relative to the manifest. No photos are uploaded. Use the same resized JPEGs the app analyzes for comparable results.

```json
[
  { "file": "rust-underbody.jpg", "vehiclePart": "underbody", "expected": ["rust"], "retake": false },
  { "file": "brown-painted-panel.jpg", "vehiclePart": "front", "expected": [], "retake": false },
  { "file": "unreadable-dark.jpg", "vehiclePart": "underbody", "expected": [], "retake": true }
]
```

Collect representative rust, dirt, brown paint, shadows, reflections, clean surfaces and unreadable frames across parts and lighting conditions. Have a knowledgeable reviewer label visible indicators. Keep photos from the same vehicle together when separating tuning and held-out evaluation sets. Do not tune thresholds against the held-out set.

Output includes per-case predictions, per-type false positives and missed indicators, precision, recall and retake agreement. Undefined metrics are null, not perfect scores. A predicted retake on an assessable positive image counts as a missed indicator. Retake-labeled images only contribute to quality evaluation.

Current automated JPEG fixtures test regressions and coordinate placement; they are synthetic and do not establish real-world accuracy. No real-photo dataset was available when this workflow was added. Record baseline and candidate results against the same reviewed dataset before claiming detection improvement. The current heuristic cannot reliably distinguish visually similar paint/dirt/rust; avoid hiding that limitation with unvalidated threshold changes.
