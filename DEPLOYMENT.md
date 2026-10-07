# Publish BANTAY

This folder is the complete static website. No build is needed for publishing it.

## GitHub Pages

1. Create or choose a GitHub repository.
2. Upload the contents of this folder to the repository root. Keep `index.html`, `app.js`, `styles.css`, `.nojekyll`, and the `assets` folder together. Upload the extracted files, not the ZIP itself.
3. Open repository **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select **main** and **/ (root)**, then save.
6. Open the website address shown by GitHub after deployment completes.

For the free GitHub Pages option, use a public repository. The uploaded website files and model are then publicly accessible.

All website asset paths are relative, so the viewer also works under a repository subdirectory such as `/bantay-website/`.

## Vercel alternative

Import the repository into Vercel. Choose **Other** as the framework, leave the build command empty, and use the repository root as the output directory. The website does not need environment variables or a backend.

## What is included

- Full-window 3D viewer with scroll-controlled assembly and disassembly.
- Rotation, zoom, and component selection.
- Optional clickable component labels controlled by the Show labels checkbox.
- The exported Blender GLB, readable viewer source, and third-party license notice.

The editable `.blend` file is a separate deliverable and is not needed to run this website.
