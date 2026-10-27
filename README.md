# 3DS Arcade

A browser front end for EmulatorJS with a red dual-screen handheld layout and touch controls. In a modern browser, it can run Nintendo DS and Nintendo 3DS games selected from the user's device. It does not contain game ROMs.

## Use it

1. Open the published page in a modern desktop or mobile browser. On first visit, the page may reload once to enable the threaded 3DS core.
2. Choose **Nintendo DS** for `.nds` files, including Animal Crossing: Wild World. Choose **Nintendo 3DS** for `.3ds`, `.cia`, or zipped 3DS game files.
3. Press **Choose game file** and select the file from the device. The original Nintendo 3DS browser is not supported.

The browser passes the selected local `File` object directly to EmulatorJS. This page has no ROM upload endpoint and does not put selected files in the GitHub repository. EmulatorJS's engine is loaded from its official stable CDN. Game saves stay in this browser unless you sign in and explicitly enable cloud backup.

## Encrypted Supabase save backups

Cloud backup is configured for this site. The Supabase table has row-level security so each signed-in account can access only its own save records. `cloud-config.js` contains only the project's public publishable key, which is intended for browser clients. Never put a Supabase secret or `service_role` key in this public repository.

Create or sign in to a Supabase account from the page. If email confirmation is enabled, confirm the signup link first. Then load a game, choose a save passphrase of at least 12 characters, and press **Enable encrypted auto-backup**. Saves upload only after you opt in and EmulatorJS reports a save update.

Save bytes are encrypted in the browser with AES-GCM before upload. The passphrase is never sent to Supabase or saved by the site; it must be entered again after a reload. The cloud stores encrypted save bytes and a hashed game identifier, not the selected game file. Use **Download latest save** to download and then load the `.sav` file through EmulatorJS. Losing the passphrase means the encrypted cloud backup cannot be restored.

The Supabase Auth site URL and allowed redirect URL are set to `https://errorlessopen.github.io/3ds-pocket-arcade/` so account confirmation returns to this page.

## GitHub Pages and compatibility

Publish the files in this folder from the root of a GitHub repository using **Settings → Pages → Deploy from a branch → main → /(root)**. The address will be `https://YOUR-USERNAME.github.io/REPOSITORY/`. The included `coi-serviceworker.js` adds the cross-origin isolation response headers required by the threaded 3DS core, then reloads the page once so modern browsers can use `SharedArrayBuffer` on GitHub Pages.

The viewport is set to 320 pixels to fit the 3DS browser's documented HTML width. The page may display in that browser, but the emulator itself cannot run there: Nintendo's published browser specifications do not list WebAssembly, which EmulatorJS uses. The emulator requires a modern browser.

Nintendo DS mode uses EmulatorJS's `nds` core. EmulatorJS's 3DS core is Azahar and requires `EJS_threads = true`; EmulatorJS says that requires `SharedArrayBuffer` enabled by cross-origin isolation. The included service worker supplies the needed isolation policy on GitHub Pages. A compatible modern browser is required for 3DS mode.

3DS emulation can also require system archives from a console. This site does not provide Nintendo system files or firmware.

## Files

- `index.html` — game loader and console-style layout
- `style.css` — responsive 3DS-inspired screen and controls
- `app.js` — EmulatorJS configuration and local file selection
- `coi-serviceworker.js` — cross-origin isolation workaround for threaded 3DS emulation on static hosts
- `cloud-save.js` and `cloud-config.js` — opt-in encrypted backup client and public project configuration
- `supabase/schema.sql` — row-level secured save table

EmulatorJS is a third-party project and is loaded from its official CDN. This site is not affiliated with Nintendo.
