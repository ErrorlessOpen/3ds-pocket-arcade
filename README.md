# 3DS Arcade

A browser front end for EmulatorJS with a compact 320-pixel-wide library anchored at the upper-left on a black page, matching the Nintendo 3DS browser reference. Its five slots are labeled for Animal Crossing: Wild World, Nintendogs + Cats, both supplied Super Mario 3D Land files, and Animal Crossing: New Leaf.

## Use it

1. Open the published page in a modern desktop or mobile browser. On first visit, the page may reload once to enable the threaded 3DS core.
2. In **Game library**, choose **Import all game files** and select the five supplied files. The launcher matches each filename to its slot, including separate slots for the Mario ZIP and CIA files.
3. The selected files are kept in that browser's IndexedDB storage so you can return and press **Play** without selecting them again. Play mode hides the library and shows the two emulator screens with transparent white touch controls over the lower screen. The original Nintendo 3DS browser is not supported.

The public GitHub Pages site contains the five game slots and launcher code, but not the commercial game files. Importing stores files in the current browser on the current device; it does not upload them to GitHub or Supabase. That browser-local library does not automatically move to another device. The file you choose is passed to EmulatorJS locally. EmulatorJS's engine is loaded from its official stable CDN. Game saves stay in this browser unless you sign in and explicitly enable cloud backup.

## Encrypted Supabase save backups

Cloud backup is configured for this site. The Supabase table has row-level security so each signed-in account can access only its own save records. `cloud-config.js` contains only the project's public publishable key, which is intended for browser clients. Never put a Supabase secret or `service_role` key in this public repository.

Create or sign in to a Supabase account from the page. If email confirmation is enabled, confirm the signup link first. Then load a game, choose a save passphrase of at least 12 characters, and press **Enable encrypted auto-backup**. Saves upload only after you opt in and EmulatorJS reports a save update.

Save bytes are encrypted in the browser with AES-GCM before upload. The passphrase is never sent to Supabase or saved by the site; it must be entered again after a reload. The cloud stores encrypted save bytes and a hashed game identifier, not the selected game file. Use **Download latest save** to download and then load the `.sav` file through EmulatorJS. Losing the passphrase means the encrypted cloud backup cannot be restored.

The Supabase Auth site URL and allowed redirect URL are set to `https://errorlessopen.github.io/3ds-pocket-arcade/` so account confirmation returns to this page.

## GitHub Pages and compatibility

Publish the files in this folder from the root of a GitHub repository using **Settings → Pages → Deploy from a branch → main → /(root)**. The address will be `https://YOUR-USERNAME.github.io/REPOSITORY/`. The included `coi-serviceworker.js` adds the cross-origin isolation response headers required by the threaded 3DS core, then reloads the page once so modern browsers can use `SharedArrayBuffer` on GitHub Pages.

The viewport is set to 320 pixels to fit the 3DS browser's documented HTML width. The page may display in that browser, but the emulator itself cannot run there: Nintendo's published browser specifications do not list WebAssembly, which EmulatorJS uses. The emulator requires a modern browser.

Nintendo DS mode uses EmulatorJS's `nds` core. 3DS mode uses EmulatorJS's `azahar` core from its nightly CDN because Azahar is not present in the stable core directory. It requires `EJS_threads = true` and `SharedArrayBuffer` enabled by cross-origin isolation. Nightly cores can change, and a compatible modern browser is required for 3DS mode.

3DS emulation can also require system archives from a console. This site does not provide Nintendo system files or firmware.

## Files

- `index.html` — game loader and console-style layout
- `style.css` — responsive 3DS-inspired screen and controls
- `app.js` — EmulatorJS configuration and local file selection
- `coi-serviceworker.js` — cross-origin isolation workaround for threaded 3DS emulation on static hosts
- `cloud-save.js` and `cloud-config.js` — opt-in encrypted backup client and public project configuration
- `supabase/schema.sql` — row-level secured save table

EmulatorJS is a third-party project and is loaded from its official CDN. This site is not affiliated with Nintendo.
