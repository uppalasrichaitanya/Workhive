# Workhive

Workhive is a lean India-focused job search workspace for technology and startup roles. It links to the original employer or ATS application page and attributes every listing to its source. The product identity assets are documented in [docs/workhive-brand.md](docs/workhive-brand.md).

## Local setup

```bash
npm install
copy .env.example .env.local
npm run db:migrate
npm run dev
```

`DATABASE_URL` is optional for a first UI run. Without it, the API serves a small demo dataset so the search experience can be evaluated locally.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase or Neon PostgreSQL connection string |
| `APIFY_TOKEN` | Token used only when the ingestion route fetches a dataset |
| `APIFY_ACTOR_ID` | Configurable actor ID for a scheduled crawl |
| `APIFY_WEBHOOK_SECRET` | Shared secret required by `POST /api/ingest/apify` |
| `NEXT_PUBLIC_APP_URL` | Public app URL used when configuring webhooks |
| `FRESHNESS_DAYS` | Active listing window, defaults to 7 |

Supabase and Neon both provide a standard PostgreSQL URL. Use the pooled URL in production and run `npm run db:migrate` against it before deploying.

## API

- `GET /api/jobs?q=engineer&location=Bengaluru&remote=true&company=Atlas%20Labs&employmentType=Full-time&page=1&pageSize=8`
- `GET /api/jobs/:id`
- `GET /api/health`
- `POST /api/ingest/apify`

The ingestion endpoint accepts either `{ "datasetId": "..." }` or `{ "items": [...], "source": "apify" }`. It requires `APIFY_WEBHOOK_SECRET` in `x-apify-webhook-secret`, an Authorization Bearer token, or the `secret` query parameter. Never expose this secret in a browser.

## Dataset format

The normalizer accepts common field aliases:

```json
{
  "sourceJobId": "123",
  "url": "https://boards.greenhouse.io/acme/jobs/123",
  "title": "Senior Backend Engineer",
  "company": "Acme",
  "location": "Bengaluru, India",
  "description": "Build reliable APIs...",
  "employmentType": "Full-time",
  "remote": false,
  "salaryMin": 2400000,
  "salaryMax": 3600000,
  "postedAt": "2026-09-15T08:00:00Z"
}
```

`jobId`, `id`, `applyUrl`, `canonicalUrl`, `companyName`, `organization`, `jobDescription`, `description_text`, `jobType`, `employment_type`, `isRemote`, `remote_derived`, `datePosted`, `date_posted`, structured or derived location arrays, Apify AI salary fields, and a free-form salary string are also supported. The original record is stored in `rawPayload`.

## Apify

Keep the actor ID in `APIFY_ACTOR_ID`; no community actor is hardcoded. Configure the actor to return 20-50 India technology/startup listings in the format above. Create a webhook for the dataset or run completion event pointing to:

`POST https://your-app.example.com/api/ingest/apify?secret=...`

The first production check should inspect duplicate rate, stale listings, missing fields, and Apify credit usage before adding more sources. Apify is used for scheduled collection only; it is not a request-time search dependency.

### Collection check completed on 16 September 2026

Three public-ATS collection runs were imported into Supabase:

| Dataset | Items | Inserted | Existing/updated | Rejected |
| --- | ---: | ---: | ---: | ---: |
| Greenhouse | 200 | 200 | 0 | 0 |
| Lever | 200 | 199 | 1 | 0 |
| Multi-ATS (Greenhouse, Lever, Ashby) | 200 | 194 | 6 | 0 |

The combined database contains 593 active jobs and 593 unique canonical URLs. Missing descriptions, locations, and posted dates are all zero; no listing was stale at import time. Across the two added datasets, 7 of 400 items matched an existing canonical URL or content identity, a 1.75% duplicate/update rate. The final source mix is 356 Greenhouse, 208 Lever, and 29 Ashby listings.

Apify credit usage must be read from the Apify account usage page because dataset output does not expose billing totals. Record that number alongside future run-quality checks before increasing crawl volume.

## Supported public sources

Adapter definitions are included for Greenhouse public boards, Lever public postings, Ashby public boards, Adzuna India (when credentials exist), and Apify dataset output. LinkedIn, Naukri, Indeed, Internshala, and protected pages are deliberately excluded. Do not bypass login, CAPTCHA, rate limits, or robots.txt restrictions. Confirm that your use complies with each source's terms and licensing.

## Deployment

1. Push this directory to a Git provider and import it into Vercel.
2. Add the environment variables in the Vercel project settings.
3. Run `npm run db:migrate` against Supabase or Neon before the first ingestion.
4. Point the Apify webhook at the deployed URL and keep its shared secret private.

There are no accounts, resume uploads, queues, Redis, Elasticsearch, object storage, or background workers in v1. Stale jobs can be expired by calling `expireStaleJobs()` from a scheduled maintenance task when you add one outside the request path.
