# Circle Day

Offline-first time planning app built with React, Vite, Tailwind, and Capacitor.

## What changed

- Removed runtime CDN dependencies so the UI can run without internet access.
- Added local persistence for routines, tasks, and visual mode using `localStorage`.
- Reworked desktop-only interactions into tap-first mobile actions.
- Added Capacitor configuration and iOS scripts for packaging into an iPhone app.
- Added a visual mode layer so the circular clock can evolve into a more media-art direction.

## Development

```bash
npm install
npm run dev
```

## Build for offline web bundle

```bash
npm run build
```

The generated bundle lands in `dist/` and does not depend on external CDNs.

## Prepare iPhone app shell

1. Build and sync web assets:

```bash
npm run ios:sync
```

2. Open the iOS project in Xcode:

```bash
npm run ios:open
```

3. In Xcode, choose a simulator or connected iPhone and run the app.

## Notes

- Data is stored locally on-device.
- Routine edits affect newly opened dates; existing saved dates keep their own task data.
- The visual layer is intentionally separate from scheduling logic so it can be extended later with richer SVG, Canvas, or shader-based treatments.
