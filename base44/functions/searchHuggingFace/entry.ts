import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const GITHUB_PAT = Deno.env.get('GITHUB_PAT') ?? '';
const HF_API = 'https://huggingface.co/api';
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

function extractGitHubContactPath(profile) {
  if (profile.email) return `email:${profile.email}`;
  if (profile.blog?.trim()) return `website:${profile.blog.trim()}`;
  if (profile.twitter_username) return `twitter:https://twitter.com/${profile.twitter_username}`;
  const bio = profile.bio ?? '';
  const lm = bio.match(/linkedin\.com\/in\/[\w-]+/i);
  if (lm) return `linkedin:https://${lm[0]}`;
  const dm = bio.match(/discord[:\s#]+[\w#]{2,37}/i);
  if (dm) return `discord:${dm[0]}`;
  return null;
}

async function scrapeHFContactLinks(username) {
  try {
    const res = await fetch(`https://huggingface.co/${username}`, {
      headers: { 'User-Agent': 'agentcy-app/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { github_handle: null, contact_path: null };
    const html = await res.text();

    let githubHandle = null;
    for (const m of html.matchAll(/https?:\/\/github\.com\/([A-Za-z0-9_-]+)/g)) {
      const h = m[1];
      if (h && h !== 'huggingface' && h !== 'apps' && h.length > 1) { githubHandle = h; break; }
    }

    let twitterHandle = null;
    const twM = html.match(/https?:\/\/(?:twitter|x)\.com\/([A-Za-z0-9_]{1,30})/);
    if (twM?.[1] && !['huggingface', 'intent', 'share', 'home'].includes(twM[1])) twitterHandle = twM[1];

    let linkedinUrl = null;
    const liM = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/([\w-]+)/);
    if (liM) linkedinUrl = `https://linkedin.com/in/${liM[1]}`;

    let contactPath = null;
    if (githubHandle) contactPath = `github:https://github.com/${githubHandle}`;
    else if (twitterHandle) contactPath = `twitter:https://twitter.com/${twitterHandle}`;
    else if (linkedinUrl) contactPath = `linkedin:${linkedinUrl}`;

    return { github_handle: githubHandle, contact_path: contactPath };
  } catch (_) {
    return { github_handle: null, contact_path: null };
  }
}

async function tryGitHubSameHandle(username) {
  try {
    const res = await ghFetch(`/users/${username}`);
    if (!res.ok) return { found: false, contact_path: null, github_evidence: null };
    const profile = await res.json();
    if (profile.type === 'Organization') return { found: false, contact_path: null, github_evidence: null };
    const contactPath = extractGitHubContactPath(profile);
    if ((profile.followers ?? 0) > 2000) return { found: true, contact_path: contactPath, github_evidence: null };
    const reposRes = await ghFetch(`/users/${username}/repos?per_page=50&sort=pushed`);
    const repos = reposRes.ok ? await reposRes.json() : [];
    const ownRepos = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];
    const totalStars = ownRepos.reduce((s, r) => s + (r.stargazers_count ?? 0), 0);
    const langMap = {};
    for (const r of ownRepos) { if (r.language) langMap[r.language] = (langMap[r.language] ?? 0) + 1; }
    const languages = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);
    return { found: true, contact_path: contactPath, github_evidence: { stars: `${totalStars} stars across ${ownRepos.length} repos`, languages, public_repos: profile.public_repos, followers: profile.followers } };
  } catch (_) {
    return { found: false, contact_path: null, github_evidence: null };
  }
}

async function processUsername(username, existingGitHubUrls, existingHFUrls, base44) {
  const profileRes = await fetch(`${HF_API}/users/${username}/overview`, {
    headers: { 'User-Agent': 'agentcy-app/1.0' },
    signal: AbortSignal.timeout(6000),
  });
  if (!profileRes.ok) return { created: false, reason: 'fetch_failed' };
  const hfProfile = await profileRes.json();
  if (hfProfile.error || hfProfile.type === 'org') return { created: false, reason: 'org' };
  const hasActivity = (hfProfile.numModels ?? 0) > 0 || (hfProfile.numSpaces ?? 0) > 0;
  if (!hasActivity) return { created: false, reason: 'no_activity' };
  const hfUrl = `https://huggingface.co/${username}`;
  if (existingHFUrls.has(hfUrl)) return { created: false, reason: 'duplicate' };

  const { github_handle: hfGithubHandle, contact_path: scrapedContact } = await scrapeHFContactLinks(username);
  let finalContactPath = scrapedContact;
  let githubHandle = hfGithubHandle;
  let githubEvidence = null;

  if (githubHandle) {
    const ghUrl = `https://github.com/${githubHandle}`;
    if (existingGitHubUrls.has(ghUrl)) return { created: false, reason: 'duplicate_github' };
    const ghRes = await ghFetch(`/users/${githubHandle}`);
    if (ghRes.ok) {
      const ghProfile = await ghRes.json();
      const ghContact = extractGitHubContactPath(ghProfile);
      if (ghContact && (!finalContactPath || finalContactPath.startsWith('github:'))) finalContactPath = ghContact;
      if ((ghProfile.followers ?? 0) <= 2000) {
        const reposRes = await ghFetch(`/users/${githubHandle}/repos?per_page=50&sort=pushed`);
        const repos = reposRes.ok ? await reposRes.json() : [];
        const ownRepos = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];
        const totalStars = ownRepos.reduce((s, r) => s + (r.stargazers_count ?? 0), 0);
        const langMap = {};
        for (const r of ownRepos) { if (r.language) langMap[r.language] = (langMap[r.language] ?? 0) + 1; }
        const languages = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);
        githubEvidence = { stars: `${totalStars} stars across ${ownRepos.length} repos`, languages, public_repos: ghProfile.public_repos, followers: ghProfile.followers };
      }
    }
  }

  if (!finalContactPath && !githubHandle) {
    if (!existingGitHubUrls.has(`https://github.com/${username}`)) {
      const fallback = await tryGitHubSameHandle(username);
      if (fallback.found) { githubHandle = username; finalContactPath = fallback.contact_path; githubEvidence = fallback.github_evidence; }
    }
  }

  if (!finalContactPath) return { created: false, reason: 'no_contact' };

  const modelsRes = await fetch(`${HF_API}/models?author=${username}&limit=10`, { headers: { 'User-Agent': 'agentcy-app/1.0' } });
  const modelList = modelsRes.ok ? await modelsRes.json() : [];
  const safeModels = Array.isArray(modelList) ? modelList : [];
  const totalDownloads = safeModels.reduce((s, m) => s + (m.downloads ?? 0), 0);
  const modelNames = safeModels.slice(0, 5).map((m) => m.modelId ?? m.id ?? '').filter(Boolean);
  const lastPush = safeModels.map((m) => m.lastModified ?? m.updatedAt ?? '').filter(Boolean).sort().reverse()[0] ?? null;

  const evidenceCard = {
    huggingface_models: (hfProfile.numModels ?? 0) > 0 ? `${hfProfile.numModels} model${hfProfile.numModels !== 1 ? 's' : ''}, ${totalDownloads.toLocaleString()} downloads` : '0 models',
    model_names: modelNames, spaces_count: hfProfile.numSpaces ?? 0, last_push: lastPush,
    ...(githubEvidence ?? {}), commits_90d: null, oss_contributions: [],
  };

  const gdprDeletionDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  await base44.asServiceRole.entities.Candidate.create({
    name: hfProfile.fullname || username,
    github_url: githubHandle ? `https://github.com/${githubHandle}` : null,
    huggingface_url: hfUrl,
    current_stage: 'Discovered',
    discovered_via: 'HuggingFace',
    contact_path: finalContactPath,
    evidence_card: JSON.stringify(evidenceCard, null, 2),
    opted_out: false,
    gdpr_deletion_due: gdprDeletionDue,
  });

  return { created: true, reason: 'ok' };
}

const RECENT_KEYWORDS = ['llm', 'rag', 'fine-tuning', 'langchain', 'weaviate', 'embedding', 'agent'];
const INDIVIDUAL_KEYWORDS = ['personal', 'finetune', 'my-model', 'custom-llm'];

async function searchByRecent() {
  const usernames = new Set();
  for (const keyword of RECENT_KEYWORDS) {
    try {
      const res = await fetch(`${HF_API}/models?search=${encodeURIComponent(keyword)}&sort=lastModified&direction=-1&limit=50`, { headers: { 'User-Agent': 'agentcy-app/1.0' } });
      if (!res.ok) continue;
      const models = await res.json();
      if (!Array.isArray(models)) continue;
      for (const m of models) { const a = m.author ?? m.modelId?.split('/')?.[0] ?? ''; if (a) usernames.add(a); }
    } catch (_) {}
  }
  return [...usernames];
}

async function searchByRelevance() {
  const usernames = new Set();
  for (const keyword of INDIVIDUAL_KEYWORDS) {
    try {
      const res = await fetch(`${HF_API}/models?search=${encodeURIComponent(keyword)}&limit=50`, { headers: { 'User-Agent': 'agentcy-app/1.0' } });
      if (!res.ok) continue;
      const models = await res.json();
      if (!Array.isArray(models)) continue;
      for (const m of models) { const a = m.author ?? m.modelId?.split('/')?.[0] ?? ''; if (a) usernames.add(a); }
    } catch (_) {}
  }
  return [...usernames];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [recentAuthors, relevanceAuthors] = await Promise.all([searchByRecent(), searchByRelevance()]);
    const allUsernames = new Set([...recentAuthors, ...relevanceAuthors]);

    const existingRecords = await base44.asServiceRole.entities.Candidate.list();
    const existingGitHubUrls = new Set((existingRecords ?? []).map((c) => c.github_url).filter(Boolean));
    const existingHFUrls = new Set((existingRecords ?? []).map((c) => c.huggingface_url).filter(Boolean));
    const newUsernames = [...allUsernames].filter((u) => !existingHFUrls.has(`https://huggingface.co/${u}`));

    const MAX_TO_PROCESS = 40;
    const toProcess = newUsernames.slice(0, MAX_TO_PROCESS);

    let newCandidatesFound = 0;
    const skipped = { fetch_failed: 0, org: 0, no_activity: 0, no_contact: 0, duplicate: 0, duplicate_github: 0, error: 0 };

    for (const username of toProcess) {
      try {
        const result = await processUsername(username, existingGitHubUrls, existingHFUrls, base44);
        if (result.created) newCandidatesFound++;
        else skipped[result.reason] = (skipped[result.reason] ?? 0) + 1;
      } catch (e) {
        skipped.error++;
        console.error('[searchHuggingFace] error for', username, e?.message);
      }
    }

    const summary = { run_at: new Date().toISOString(), sources: { recent_keyword_authors: recentAuthors.length, relevance_keyword_authors: relevanceAuthors.length }, unique_usernames_found: allUsernames.size, already_in_system: existingHFUrls.size, new_usernames_to_process: newUsernames.length, processed_this_run: toProcess.length, new_candidates_found: newCandidatesFound, skipped };
    console.log('[searchHuggingFace] Run complete:', JSON.stringify(summary));
    return Response.json(summary);
  } catch (error) {
    console.error('[searchHuggingFace] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});