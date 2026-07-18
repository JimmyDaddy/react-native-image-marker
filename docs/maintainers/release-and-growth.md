# Release and growth checks

This is a maintainer checklist, not end-user documentation.

## Before a maintenance release

1. Use Node from `.nvmrc` and run `npm ci`.
2. Run type checks, lint, Jest with coverage, the three-browser Web smoke test, and both native compatibility lines.
3. Run `npm audit --omit=dev`. Production vulnerabilities are a release blocker; development-tooling findings are reviewed separately instead of being fixed with `--force`.
4. Run `npm run release -- patch --dry-run --ci` with GitHub authentication available.
5. Confirm the release commit and GitHub release trigger `.github/workflows/npm-publish.yml`.
6. Confirm the published version shows an npm provenance attestation. The publishing workflow also fails if registry provenance metadata does not appear.

## Monthly adoption review

Record the date and compare against the previous month:

- npm downloads: `curl -s https://api.npmjs.org/downloads/point/last-month/react-native-image-marker`
- GitHub stars, forks, open issues, and recurring support themes
- Google Search Console: indexed pages, clicks, impressions, click-through rate, and queries leading to `/playground/`
- Bing Webmaster Tools: indexed pages and search keywords for the same period
- Live checks for `/`, `/playground/`, `/robots.txt`, `/sitemap-index.xml`, and both language sections

The site does not add user-tracking scripts by default. Search Console and Bing provide search-discovery data; add product analytics only after choosing a privacy policy and data processor deliberately.

## Feedback triage

- Ask for a minimal reproduction, exact versions, architecture, source format, dimensions, and output format.
- For Web reports, also ask for browser version, CORS headers, and whether the source is a URL, data URL, `Blob`, or `File`.
- Close requests that cannot be reproduced or clarified after a reasonable follow-up, and link to the new issue form when more information is needed.
