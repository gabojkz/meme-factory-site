# MemeFactory website

Landing page for [MemeFactory](https://github.com/gabojkz/meme-factory), served with GitHub Pages.

Plain HTML, CSS and JavaScript: no build step, no dependencies.

## Downloads stay up to date by themselves

There's nothing to change here when a new version of the app is released:

- **Download buttons** point to `https://github.com/gabojkz/meme-factory/releases/latest/download/<file>`. GitHub sends that to the newest **published** release (drafts and pre-releases are skipped), using the fixed file names the app's release workflow uploads (`MemeFactory-macos-arm64.dmg`, `MemeFactory-windows-x64.msi`, …).
- **Version, date and file sizes** are read from the GitHub API (`releases/latest`) when the page loads, and cached in the visitor's browser for 10 minutes.
- If a build is missing from the newest release, its button says so and links to the release page instead of a broken download.
- The hero button picks the visitor's system (Windows, macOS Apple Silicon or Intel, Linux). Phones get pointed to the desktop downloads.
- If GitHub can't be reached, the buttons still work; only the version label is missing.

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Publish with GitHub Pages

1. Create a repository on GitHub (e.g. `meme-factory-site`) and push this folder to it.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site appears at `https://gabojkz.github.io/meme-factory-site/` a minute later.

If the repository gets a different name or a custom domain, update the `og:image` URL in `index.html` (used for link previews).

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `styles.css` | Styles, matching the app (same colours, fonts, ink outlines) |
| `app.js` | Latest release, platform detection, the self-typing search demo |
| `assets/` | App icon, social preview, and stickers from the app's original starter kit |
