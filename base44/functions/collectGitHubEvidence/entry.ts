import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const GITHUB_PAT = Deno.env.get('GITHUB_PAT') ?? '';
const GITHUB_API = 'https://api.github.com';

const ghFetch = (path) =>
  fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'agentcy-app/1.0',
    },
  });

function extractContactPath(profile) {
  if (profile.email) return `email:${profile.email}`;
  if (profile.blog && profile.blog.trim()) return `website:${profile.blog.trim()}`;
  if (profile.twitter_username) return `twitter:${profile.twitter_username}`;
  const bio = profile.bio ?? '';
  const linkedinMatch = bio.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) return `linkedin:https://${linkedinMatch[0]}`;
  const discordMatch = bio.match(/discord[:\s#]+[\w#]{2,37}/i);
  if (discordMatch) return `discord:${discordMatch[0]}`;
  return null;
}

async function countRecentCommits(username, repos) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  let total = 0;
  const topRepos = repos
    .filter((r) => !r.fork)
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, 10);
  for (const repo of topRepos) {
    try {
      const res = await ghFetch(`/repos/${username}/${repo.name}/commits?author=${username}&since=${since}&per_page=100`);
      if (res.ok) {
        const commits = await res.json();
        if (Array.isArray(commits)) total += commits.length;
      }
    } catch (_) {}
  }
  return total;
}

async function detectOSSContributions(username) {
  const targetOrgs = ['langchain-ai', 'weaviate', 'huggingface', 'openai', 'microsoft', 'google', 'meta-llama', 'mistralai', 'qdrant', 'chroma-core'];
  const res = await ghFetch(`/users/${username}/repos?type=all&per_page=100`);
  if (!res.ok) return [];
  const repos = await res.json();
  const contributions = [];
  for (const repo of repos) {
    if (repo.fork && repo.full_name) {
      const orgName = repo.full_name.split('/')[0].toLowerCase();
      if (targetOrgs.includes(orgName)) contributions.push(repo.full_name);
    }
  }
  return [...new Set(contributions)];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    if (body.debug) {
      const pat = Deno.env.get('GITHUB_PAT') ?? '';
      return Response.json({ pat_prefix: pat.slice(0, 6), pat_length: pat.length });
    }

    if (body.debug_api) {
      const pat = Deno.env.get('GITHUB_PAT') ?? '';
      const r = await fetch('https://api.github.com/users/torvalds', {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'agentcy-app/1.0',
        },
      });
      const text = await r.text();
      const hdrs = {};
      r.headers.forEach((v, k) => { hdrs[k] = v; });
      return Response.json({ status: r.status, headers: hdrs, body: text.slice(0, 500) });
    }

    const { username } = body;
    if (!username) return Response.json({ error: 'username is required' }, { status: 400 });

    const profileRes = await ghFetch(`/users/${username}`);
    if (!profileRes.ok) return Response.json({ error: `GitHub user not found: ${username}` }, { status: 404 });
    const profile = await profileRes.json();

    const contactPath = extractContactPath(profile);
    if (!contactPath) {
      return Response.json({ candidate_created: false, reason: 'No contact path found on this profile. Candidate not added.', username });
    }

    const existing = await base44.asServiceRole.entities.Candidate.filter({ github_url: `https://github.com/${username}` });
    if (existing && existing.length > 0) {
      return Response.json({ candidate_created: false, reason: `Candidate already exists: ${username}`, candidate_id: existing[0].id, username });
    }

    const reposRes = await ghFetch(`/users/${username}/repos?per_page=100&sort=pushed`);
    const repos = reposRes.ok ? await reposRes.json() : [];
    const ownRepos = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];

    const totalStars = ownRepos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);
    const starsPerRepo = ownRepos.filter((r) => r.stargazers_count > 0).map((r) => `${r.name}: ${r.stargazers_count}★`).slice(0, 5);

    const langMap = {};
    for (const r of ownRepos) {
      if (r.language) langMap[r.language] = (langMap[r.language] ?? 0) + 1;
    }
    const languages = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([lang]) => lang);

    const reposWithReadme = ownRepos.filter((r) => r.description && r.description.length > 50).length;
    const commits90d = await countRecentCommits(username, repos);
    const ossContributions = await detectOSSContributions(username);

    const evidenceCard = {
      commits_90d: `${commits90d} commits`,
      stars: `${totalStars} stars across ${ownRepos.length} repos${starsPerRepo.length ? ' (' + starsPerRepo.join(', ') + ')' : ''}`,
      oss_contributions: ossContributions,
      languages,
      readme_quality: `${reposWithReadme} repos with description >50 chars`,
      public_repos: profile.public_repos,
      followers: profile.followers,
      huggingface_models: null,
    };

    const gdprDeletionDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const candidate = await base44.asServiceRole.entities.Candidate.create({
      name: profile.name ?? profile.login,
      github_url: `https://github.com/${username}`,
      current_stage: 'Discovered',
      discovered_via: 'GitHub',
      contact_path: contactPath,
      evidence_card: JSON.stringify(evidenceCard, null, 2),
      opted_out: false,
      gdpr_deletion_due: gdprDeletionDue,
    });

    return Response.json({ candidate_created: true, candidate_id: candidate.id, username, contact_path: contactPath, evidence_card: evidenceCard });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});