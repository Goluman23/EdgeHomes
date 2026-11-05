# EdgeHomes

Website for **Edgehomes Architects** — architecture, interiors and construction studio in Faridabad, Delhi NCR.

- `index.html` — the complete site as a single self-contained file (images embedded).
- Deployed on Vercel as a static site; every push to `main` redeploys.

Palette: Royal Navy `#1B2766` · Butter Cream `#F6F0DC` · Brick Red `#A93239` · Logo Gold `#C9A25A`.

## lead-api/

The WhatsApp & Instagram chatbot back end (EasySocial concierge, lead sheet, follow-ups, campaign push)
lives in [`lead-api/`](lead-api/README.md) and deploys as its own Vercel project with Root Directory
`lead-api`. The site's `vercel.json` redirects `/lead-api/*` to `/`, so none of it is served here.

## Base code — must stay on every version of the site

- **Meta Pixel** (ID `27979772781699308`) sits in `<head>` of `index.html`, directly after the viewport meta tag, exactly as supplied by Meta (base code + `PageView`, with the `<noscript>` fallback). Any redesign or rebuild of the website must keep it unchanged. A copy is kept in `website-base/meta-pixel.html`.
