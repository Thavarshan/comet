# Static site deployment and recovery

The site exports `apps/site/out/` through the normal Turbo build graph. Wrangler
is pinned in `@honeymelon/site`; no SSR adapter, Worker script, storage binding,
server conversion endpoint or paid plan is needed. Cloudflare serves the assets
directly, including the custom 404 page. `run_worker_first` stays false.

## One-time operator setup

Use an existing Cloudflare Free account and its workers.dev subdomain. No domain
purchase is required. Create the two Workers, or use a temporary account-scoped
Workers deployment token for the initial creation. Confirm their actual URLs in
Cloudflare before setting GitHub variables; do not copy a placeholder URL.

| Target     | Wrangler environment | Worker                    | GitHub environment |
| ---------- | -------------------- | ------------------------- | ------------------ |
| Preview    | `preview`            | `honeymelon-site-preview` | `site-preview`     |
| Production | `production`         | `honeymelon-site`         | `site-production`  |

Set repository variables `HONEYMELON_SITE_PREVIEW_URL` and
`HONEYMELON_SITE_PRODUCTION_URL` to those distinct HTTPS origins, without a
path, and `CLOUDFLARE_ACCOUNT_ID` to the intended account. These are public
config, not credentials. Initially the origins are the actual workers.dev
addresses.

Create both GitHub environments **before adding their secrets**. Restrict
deployment branches in each environment to `main`; add required reviewers to
`site-production` when the repository plan supports them. Put a separate
`CLOUDFLARE_API_TOKEN` secret in each environment, never at repository scope.
Use Workers Editor/Workers Scripts Edit restricted to the intended account and,
where available, the individual target Worker. After initial creation, replace
any bootstrap token with the narrower Worker-scoped token. Do not grant
zone/DNS, KV, R2, D1 or billing permissions for this assets-only deployment.
Never paste the token into a workflow file, terminal command argument or chat.

## Deploy preview, then production

Wait for CI on the exact `main` commit, including `required` and the enforced
`verify / security / codeql` job. The separate `CodeQL` PR check must also pass
before merging. In GitHub Actions, run **Deploy static site** from `main`,
choose `preview` and `deploy`. Review the resulting environment URL, then
dispatch `production` and `deploy` for the same commit. PR and fork events
cannot trigger this workflow; non-main dispatches are rejected. Deployment
admission checks the required and security jobs, and rejects a failed or pending
independent CodeQL check when GitHub emits one for that commit.

Builds run without Cloudflare credentials. Production builds use their real
origin for canonical/social metadata and sitemap URLs. Preview builds omit that
origin, emit noindex/robots restrictions and add `X-Robots-Tag`. The artifact
includes a public `deployment.json` containing only the target, source SHA and
canonical origin. Publish uses that checked static artifact; the Cloudflare
token exists only in the final publish/rollback step.

The workflow checks every public route, custom 404, trailing-slash handling,
legacy redirects, security headers, indexing metadata, fingerprinted-asset cache
headers, ETags/304 responses and source revision on the actual URL. Review
keyboard navigation and download selections on that URL as well. Do not close
#72 until both environments and a preview rollback are verified.

For an authenticated local operator, the equivalent publish command after a
verified root Turbo build and `prepare-deployment.mjs` is:

```sh
npm exec -w @honeymelon/site -- wrangler deploy --env preview
node apps/site/scripts/verify-deployment.mjs "$HONEYMELON_SITE_PREVIEW_URL" preview
```

For production, set `HONEYMELON_SITE_URL` to the confirmed production origin
before the root build, prepare with target `production`, and use
`--env production`. The default Wrangler name is local-only with workers.dev
disabled so operators must choose an explicit environment. A custom domain is
optional: use a domain already owned, configure its Cloudflare route separately,
update the production origin variable, then rebuild and verify; no purchase is
part of this setup.

## Rollback

Record the current and previous Cloudflare version UUIDs from the Worker's
Deployments page or `wrangler deployments list --env preview`. Deploy twice to
preview, then dispatch the workflow with `rollback`, `preview` and the explicit
previous UUID. Check the old `deployment.json` revision and all live checks. Use
the same procedure with `production` for a production incident. Rollback uses a
stored Cloudflare version, not a rebuild of changed dependencies.

```sh
npm exec -w @honeymelon/site -- wrangler rollback VERSION_UUID --env preview --yes
node apps/site/scripts/verify-deployment.mjs "$HONEYMELON_SITE_PREVIEW_URL" preview
```

Cloudflare supports rollback to recent published versions; retain a known-good
version UUID. If a version is unavailable, check out a known-good source commit,
run the pinned install/build/verification steps and publish it deliberately.
These Workers have no mutable data bindings or migrations to recover.

## Cache, privacy and free-plan checks

HTML uses Cloudflare's revalidation default. Only fingerprinted `_next/static`
files receive one-year immutable browser caching; replacing HTML never freezes
old release links or metadata. No media bytes are uploaded by this site. Desktop
binaries still download directly from GitHub.

After deployment and periodically, inspect Workers & Pages and Billing in the
Cloudflare dashboard: confirm the Free plan, no paid subscriptions or storage
bindings, asset count/size below current platform limits, and no Worker-script
invocations from normal pages or missing routes. Static asset requests/storage
are free under the documented policy; adding a script, `run_worker_first`, an
SSR adapter or another platform product requires a new quota/cost review.
Hosting access logs may still be processed as described by the site's privacy
page. No analytics product is enabled by this configuration.

Official references:

- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- https://developers.cloudflare.com/workers/static-assets/headers/
- https://developers.cloudflare.com/workers/static-assets/redirects/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
