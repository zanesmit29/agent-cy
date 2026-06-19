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
  if (profile.blog?.trim()) return `website:${profile.blog.trim()}`;
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
    .slice(0, 5);
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
  const targetOrgs = ['langchain-ai', 'pytorch', 'weaviate', 'huggingface', 'openai', 'microsoft', 'meta-llama', 'mistralai', 'qdrant', 'chroma-core'];
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

async function collectGitHubEvidence(username, base44) {
  const profileRes = await ghFetch(`/users/${username}`);
  if (!profileRes.ok) return { created: false, reason: 'profile_error' };
  const profile = await profileRes.json();

  if ((profile.followers ?? 0) > 500) return { created: false, reason: 'too_prominent' };

  const contactPath = extractContactPath(profile);
  if (!contactPath) return { created: false, reason: 'no_contact' };

  const existing = await base44.asServiceRole.entities.Candidate.filter({ github_url: `https://github.com/${username}` });
  if (existing?.length > 0) return { created: false, reason: 'duplicate' };

  const reposRes = await ghFetch(`/users/${username}/repos?per_page=100&sort=pushed`);
  const repos = reposRes.ok ? await reposRes.json() : [];
  const ownRepos = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];

  const totalStars = ownRepos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);
  const topStarred = ownRepos.filter((r) => r.stargazers_count > 0).map((r) => `${r.name}: ${r.stargazers_count}★`).slice(0, 5);

  const langMap = {};
  for (const r of ownRepos) { if (r.language) langMap[r.language] = (langMap[r.language] ?? 0) + 1; }
  const languages = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([lang]) => lang);

  const reposWithDesc = ownRepos.filter((r) => r.description?.length > 50).length;
  const commits90d = await countRecentCommits(username, repos);
  const ossContributions = await detectOSSContributions(username);

  const evidenceCard = {
    commits_90d: `${commits90d} commits`,
    stars: `${totalStars} stars across ${ownRepos.length} repos${topStarred.length ? ' (' + topStarred.join(', ') + ')' : ''}`,
    oss_contributions: ossContributions,
    languages,
    readme_quality: `${reposWithDesc} repos with description >50 chars`,
    public_repos: profile.public_repos,
    followers: profile.followers,
    huggingface_models: null,
  };

  const gdprDeletionDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const candidate = await base44.asServiceRole.entities.Candidate.create({
    name: profile.name ?? profile.login,
    email: profile.email ?? `${username}@github-noemail.placeholder`,
    github_url: `https://github.com/${username}`,
    current_stage: 'Discovered',
    discovered_via: 'GitHub',
    contact_path: contactPath,
    evidence_card: JSON.stringify(evidenceCard, null, 2),
    opted_out: false,
    gdpr_deletion_due: gdprDeletionDue,
  });

  return { created: true, candidate_id: candidate.id, contact_path: contactPath, evidence_card: evidenceCard };
}

const ALL_REPO_TOPICS = ['rag', 'langchain', 'weaviate', 'llm', 'transformers', 'vector-database'];
const ALL_COMMIT_KEYWORDS = ['langchain', 'weaviate', 'RAG retrieval', 'vector embeddings', 'llm pipeline'];

async function discoverViaRepoContributors(topicSlice) {
  const usernames = new Set();
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  for (const topic of topicSlice) {
    const q = encodeURIComponent(`topic:${topic} pushed:>${since} stars:<200`);
    const res = await ghFetch(`/search/repositories?q=${q}&sort=updated&per_page=3`);
    if (!res.ok) continue;
    const data = await res.json();
    const repos = data.items ?? [];
    for (const repo of repos) {
      if (repo.owner?.type === 'Organization') continue;
      const contribRes = await ghFetch(`/repos/${repo.full_name}/contributors?per_page=10`);
      if (!contribRes.ok) continue;
      const contributors = await contribRes.json();
      for (const c of contributors) {
        if (c.type !== 'User' || c.login.includes('[bot]')) continue;
        usernames.add(c.login);
      }
    }
  }
  return [...usernames];
}

async function discoverViaRecentCommits(keywordSlice) {
  const usernames = new Set();
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  for (const keyword of keywordSlice) {
    const q = encodeURIComponent(`"${keyword}" author-date:>${since}`);
    const res = await fetch(`${GITHUB_API}/search/commits?q=${q}&per_page=15`, {
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: 'application/vnd.github.cloak-preview+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'agentcy-app/1.0',
      },
    });
    if (!res.ok) continue;
    const data = await res.json();
    const items = data.items ?? [];
    for (const item of items) {
      const login = item.author?.login;
      if (login && !login.includes('[bot]')) usernames.add(login);
    }
  }
  return [...usernames];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const hourSlot = Math.floor(new Date().getUTCHours() / 6);
    const topicOffset = (hourSlot * 3) % ALL_REPO_TOPICS.length;
    const keywordOffset = (hourSlot * 3) % ALL_COMMIT_KEYWORDS.length;

    const topicSlice = [
      ALL_REPO_TOPICS[topicOffset % ALL_REPO_TOPICS.length],
      ALL_REPO_TOPICS[(topicOffset + 1) % ALL_REPO_TOPICS.length],
      ALL_REPO_TOPICS[(topicOffset + 2) % ALL_REPO_TOPICS.length],
    ];
    const keywordSlice = [
      ALL_COMMIT_KEYWORDS[keywordOffset % ALL_COMMIT_KEYWORDS.length],
      ALL_COMMIT_KEYWORDS[(keywordOffset + 1) % ALL_COMMIT_KEYWORDS.length],
      ALL_COMMIT_KEYWORDS[(keywordOffset + 2) % ALL_COMMIT_KEYWORDS.length],
    ];

    const [repoContributors, commitAuthors] = await Promise.all([
      discoverViaRepoContributors(topicSlice),
      discoverViaRecentCommits(keywordSlice),
    ]);

    const allUsernames = new Set([...repoContributors, ...commitAuthors]);

    const existingRecords = await base44.asServiceRole.entities.Candidate.list();
    const existingUrls = new Set((existingRecords ?? []).map((c) => c.github_url).filter(Boolean));
    const newUsernames = [...allUsernames].filter((u) => !existingUrls.has(`https://github.com/${u}`));

    let newCandidatesFound = 0, skippedNoContact = 0, skippedTooProminent = 0, skippedDuplicate = 0, skippedError = 0;

    for (const username of newUsernames) {
      try {
        const result = await collectGitHubEvidence(username, base44);
        if (result.created) newCandidatesFound++;
        else if (result.reason === 'no_contact') skippedNoContact++;
        else if (result.reason === 'too_prominent') skippedTooProminent++;
        else if (result.reason === 'duplicate') skippedDuplicate++;
        else skippedError++;
      } catch (_) { skippedError++; }
    }

    const summary = {
      run_at: new Date().toISOString(),
      hour_slot: hourSlot,
      topics_this_run: topicSlice,
      keywords_this_run: keywordSlice,
      sources: { repo_contributors: repoContributors.length, commit_authors: commitAuthors.length },
      unique_usernames_found: allUsernames.size,
      already_in_system: existingUrls.size,
      new_usernames_to_process: newUsernames.length,
      new_candidates_found: newCandidatesFound,
      skipped_too_prominent: skippedTooProminent,
      skipped_no_contact: skippedNoContact,
      skipped_duplicate: skippedDuplicate,
      skipped_error: skippedError,
    };

    console.log('[searchGitHub] Run complete:', JSON.stringify(summary));
    return Response.json(summary);
  } catch (error) {
    console.error('[searchGitHub] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});