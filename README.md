# Nithin N. - Portfolio

Static portfolio and blog, deployed on Vercel. No build step: the files in this
folder are the website.

## Structure

- `index.html` - home page
- `blog/index.html` - blog index (served at `/blog`)
- `blog/<slug>.html` - one page per article (served at `/blog/<slug>`)
- `404.html` - not-found page
- `sitemap.xml`, `robots.txt` - add each new post URL to the sitemap
- `assets/` - CSS, JS, fonts, images, video, resume PDF
- `vercel.json` - clean URLs, redirects from the old `/Blog.html` and
  `/blogs/*` paths, and cache headers

## Adding a blog post

1. Copy `blog/crater-rover.html` to `blog/<new-slug>.html` and replace the article.
2. Put its images in `assets/blog/`.
3. Add a `post-card` linking to it in `blog/index.html`.

## Preview locally

```powershell
py -3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Vercel project settings: Framework preset **Other**, no build command, output
directory `.` (repository root). Every push to `main` redeploys.
