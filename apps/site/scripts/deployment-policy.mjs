import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { getSiteOrigin } from '../src/lib/metadata.ts';

/** Publishing is limited to deliberate dispatches of reviewed main commits. */
export function deploymentPolicy(input) {
  if (
    input.event !== 'workflow_dispatch' ||
    input.ref !== 'refs/heads/main' ||
    input.repository !== 'Thavarshan/comet'
  ) {
    throw new Error('Site deployment requires a trusted main-branch dispatch');
  }

  if (
    !['preview', 'production'].includes(input.target) ||
    !['deploy', 'rollback'].includes(input.operation)
  ) {
    throw new Error('Unknown deployment target or operation');
  }

  if (!/^[a-f0-9]{40}$/.test(input.sha ?? '')) {
    throw new Error('Deployment requires an exact source commit');
  }

  if (
    input.operation === 'rollback' &&
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.version ?? '')
  ) {
    throw new Error('Rollback requires an explicit Cloudflare version UUID');
  }

  const configured =
    input.target === 'production' ? input.productionUrl : input.previewUrl;
  if (!configured) {
    throw new Error('Configure the actual public site URL before deployment');
  }

  const destination = getSiteOrigin(configured);
  if (
    ['example.com', 'example.net', 'example.org'].includes(
      destination.hostname,
    ) ||
    ['.example', '.invalid', '.test'].some((suffix) =>
      destination.hostname.endsWith(suffix),
    )
  ) {
    throw new Error(
      'Deployment requires a confirmed public hostname, not a placeholder',
    );
  }

  const origin = destination.origin;
  if (
    input.productionUrl &&
    input.previewUrl &&
    getSiteOrigin(input.productionUrl).origin ===
      getSiteOrigin(input.previewUrl).origin
  ) {
    throw new Error(
      'Preview and production must have different public origins',
    );
  }

  return {
    target: input.target,
    operation: input.operation,
    siteUrl: origin,
    canonicalOrigin: input.target === 'production' ? origin : '',
    version: input.operation === 'rollback' ? input.version : '',
  };
}

/** Require the enforced security job and honor separate PR CodeQL checks. */
export function requireSuccessfulChecks(checks) {
  const names = ['required', 'verify / security / codeql'];
  // GitHub emits the separate CodeQL check for PRs, not every main push.
  if (checks.some((check) => check.name === 'CodeQL')) {
    names.push('CodeQL');
  }

  for (const name of names) {
    const check = checks.find((entry) => entry.name === name);
    if (
      !check ||
      check.status !== 'completed' ||
      check.conclusion !== 'success'
    ) {
      throw new Error(`Deployment requires a successful ${name} commit check`);
    }
  }

  if (
    checks.some((check) =>
      ['failure', 'cancelled', 'timed_out', 'action_required'].includes(
        check.conclusion,
      ),
    )
  ) {
    throw new Error('The source commit has an unsuccessful check');
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const policy = deploymentPolicy({
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    repository: process.env.GITHUB_REPOSITORY,
    sha: process.env.GITHUB_SHA,
    target: process.env.DEPLOY_TARGET,
    operation: process.env.DEPLOY_OPERATION,
    version: process.env.DEPLOY_VERSION,
    productionUrl: process.env.PRODUCTION_URL,
    previewUrl: process.env.PREVIEW_URL,
  });
  const response = await fetch(
    `https://api.github.com/repos/Thavarshan/comet/commits/${process.env.GITHUB_SHA}/check-runs?filter=latest&per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
      },
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) {
    throw new Error(`Cannot verify source commit checks: ${response.status}`);
  }

  const report = await response.json();
  if (!Array.isArray(report.check_runs) || report.total_count > 100) {
    throw new Error('Incomplete commit check inventory');
  }

  requireSuccessfulChecks(report.check_runs);
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `target=${policy.target}\nsite_url=${policy.siteUrl}\ncanonical_origin=${policy.canonicalOrigin}\nversion=${policy.version}\n`,
  );
}
