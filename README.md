# Nithin N. - Portfolio

Static portfolio and blog for GitHub Pages.

## Publish locally

The published files are already in this repository root. To preview them locally, open
[`index.html`](./index.html) or [`Blog.html`](./Blog.html) in a browser.

## GitHub Pages

This repository is configured for a root-branch GitHub Pages deployment:

1. Open **Settings > Pages** on GitHub.
2. Select **Deploy from a branch**.
3. Choose the `main` branch and the `/ (root)` folder.
4. Save and wait for the Pages deployment to finish.

The `.nojekyll` file keeps GitHub Pages from rewriting the static asset paths.

## Updating the blog

The source article lives in `../blog/blog.html` in the parent project folder. From
the parent project, regenerate the published page with:

```powershell
py -3 make_blog.py
```

Then copy the generated changes into this repository, review them, and push:

```powershell
git add .
git commit -m "Update portfolio blog"
git push origin main
```
