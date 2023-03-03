# replay-chrome-extension
Sauce chrome extension for puppeteer replay.

You can run replay test on Sauce Labs using this chrome extension. Currently it's only available in Chrome Canary.

**This plugin is still in the experimental stage 🧪. No official support currently. Please use it with caution.**

## Development
### Chrome Extension Setup

Build this extension by

```bash
$ npm install
$ npm run build
```

The generated files are in `build` folder.

### Load the Extension

1. Open Chrome Canary and type `chrome://extension`.
2. Enable Developer Mode by clicking the toggle switch next to Developer mode.
3. Click the Load unpacked button and select `build` directory.
4. Open a new tab and open devtools -> Recorder tab.
5. Choose any recording or create a new one. There should be a `Sauce Labs` button appended to the `replay` button group.
6. Click the extension button and there will be a UI to interact with Sauce Labs.
