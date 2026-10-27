# 3DS Arcade

A browser front end for EmulatorJS with a 3DS-inspired screen and touch-control layout. It can run a Nintendo DS game selected from your device in a modern browser. It does not contain game ROMs.

## Use it

1. Open the published page in a modern desktop or mobile browser.
2. Choose Nintendo DS for .nds files, including the Animal Crossing: Wild World .nds file. Choose Nintendo 3DS for .3ds, .cia, or zipped 3DS game files.
3. Press Choose game file and select the file from the device.

The browser passes the selected local File object directly to EmulatorJS. This page has no ROM upload endpoint and does not put selected files in the GitHub repository. EmulatorJS's engine is loaded from its official stable CDN.

## GitHub Pages and compatibility

Publish the files in this folder from the root of a GitHub repository using Settings → Pages → Deploy from a branch → main → /(root). The address will be https://YOUR-USERNAME.github.io/REPOSITORY/.

This is a modern-browser emulator page, not an emulator that runs inside the Nintendo 3DS Internet Browser. Nintendo documents that browser's limited HTML/CSS/ECMAScript support but not WebAssembly. EmulatorJS documents that its emulator cores use WebAssembly and target modern browsers.

Nintendo DS mode uses EmulatorJS's nds core. EmulatorJS's 3DS core is Azahar and requires EJS_threads = true; EmulatorJS says that requires SharedArrayBuffer exposed through the Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp response headers. Standard GitHub Pages does not allow per-site custom response headers, so its published page cannot enable 3DS mode. The page checks for cross-origin isolation and reports this instead of trying to start a 3DS game on an incompatible host.

3DS emulation can also require system archives from a console. This site does not provide Nintendo system files or firmware.

## Files

- index.html — game loader and console-style layout
- style.css — responsive 3DS-inspired screen and controls
- app.js — EmulatorJS configuration and local file selection

EmulatorJS is a third-party project and is loaded from its official CDN. This site is not affiliated with Nintendo.
