const { withFinalizedMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Keep the existing store artwork intact. Its shield occupies roughly 75% of
// the image height; a 12% inset places it within Android's central safe area,
// while the adaptive background fills the launcher's icon shape.
module.exports = function withLauncherIconPadding(config) {
  return withFinalizedMod(config, ['android', async (mod) => {
    const resources = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res');
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/iconBackground" />
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground"
            android:insetLeft="12%" android:insetTop="12%"
            android:insetRight="12%" android:insetBottom="12%" />
    </foreground>
</adaptive-icon>
`;
    for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      // Expo creates these resources before finalized mods run.
      await fs.writeFile(path.join(resources, 'mipmap-anydpi-v26', name), xml);
    }
    return mod;
  }]);
};
