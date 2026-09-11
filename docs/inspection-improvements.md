# Inspection improvements — September 11, 2026

## 1. Photo highlights

New local scans persist decoded image dimensions and the strongest supporting 6×6 grid cell for each finding. The results screen displays the full uncropped photo with numbered, selectable zones, a show/hide control, and finding explanations. Overlapping zones can be selected through the finding buttons. Zones are explicitly labeled as supporting evidence rather than exact defect boundaries. Legacy scans without coordinates retain their photo and findings; retake results never show boxes.

## 2. Accuracy evaluation (real-photo tuning pending)

Added `npm run evaluate:detection -- path/to/manifest.json` and synthetic regression fixtures for location, neutral metal, blue paint, black frames and glare. See [detection-evaluation.md](detection-evaluation.md) for dataset labeling and metrics. No real-world accuracy improvement is claimed: representative reviewed photos are still needed before tuning detector thresholds.

## 3. Multi-photo vehicle inspections

Home → Inspect a whole vehicle, or History → Vehicle inspections and combined reports.

Create a named vehicle with optional make, model and year, or reuse an existing vehicle. Add multiple photos across seven areas. Sessions and photos save locally; drafts can be resumed after restart. Each result links back to its vehicle inspection. Completing a partial inspection requires acknowledging missing areas; unreadable photos must be removed or retaken. Completed sessions can be reopened. Reports include all saved views and disclose unassessed areas, retakes and missing photo files. Deleting a session removes its scans and photos while preserving unrelated scans. Vehicle profiles are retained through their sessions, not in a separate account or cloud store.

Storage mutations are serialized to avoid lost updates from concurrent saves. Existing standalone inspection history remains supported. The mobile TypeScript configuration excludes the independent privacy-site project.

## Validation

- Mobile TypeScript check passed.
- 53 SDK tests passed, including coordinates, session coverage, report isolation/escaping, persistence across store reopening, concurrent writes and failure recovery.
- Android development JavaScript bundle compiled through Metro.
- Evaluation CLI smoke check passed using a synthetic clean JPEG.
- Native camera capture, touch alignment on a physical device, and native PDF share/print rendering remain to be checked. Browser preview was unavailable because this project does not have react-dom/react-native-web installed.

## Device checks before release

1. Scan a portrait and landscape photo; tap every finding and toggle highlights. Reopen each result from history.
2. Create a vehicle inspection, capture two different areas and a second view of one area, terminate/relaunch the app, then resume it.
3. Try an unreadable photo; verify retake and coverage counts. Remove it, then complete a partial inspection and reopen it.
4. Export a combined PDF on Android/iOS; check all pages, photos, missing-area disclosure and share sheet.
5. Delete one photo and then one vehicle session; verify unrelated inspection history remains.

The logo concept remains saved under docs/branding; app icons have not been changed.
