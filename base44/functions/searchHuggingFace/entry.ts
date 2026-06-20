import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const GITHUB_PAT = Deno.env.get('GITHUB_PAT') ?? '';
const HF_API = 'https://huggingface.co/api';
const GITHUB_API = 'https://api.github.com';

const KNOWN_ORG_ACCOUNTS = new Set([
  'meta-llama', 'google', 'mistralai', 'huggingface', 'openai', 'microsoft',
  'anthropic', 'stabilityai', 'tiiuae', 'bigscience', 'eleutherai', 'allenai',
  'facebook', 'amazon', 'nvidia', 'cohere', 'ai21labs', 'mosaicml',
  'cerebras', 'together', 'togethercomputer', 'teknium', 'unsloth',
  'deepseek-ai', 'qwen', 'baichuan-inc', 'internlm', 'thudm',
  'lmsys', 'openbmb', 'salesforce', 'bigcode', 'sentence-transformers',
]);

function isKnownOrg(username) {
  return KNOWN_ORG_ACCOUNTS.has(username.toLowerCase());
}

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
  if (profile.twitter_username) return `twitter:${profile.twitter_username}`;
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
      if (h && !['huggingface', 'apps', 'features', 'pricing'].includes(h) && h.length > 1) {
        githubHandle = h;
        break;
      }
    }

    let twitterHandle = null;
    const twM = html.match(/https?:\/\/(?:twitter|x)\.com\/([A-Za-z0-9_]{1,30})/);
    if (twM?.[1] && !['huggingface', 'intent', 'share', 'home', 'i'].includes(twM[1])) {
      twitterHandle = twM[1];
    }

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

async function processUsername(username, existingGitHubUrls, existingHFUrls, base44) {
  if (isKnownOrg(username)) return { created: false, reason: 'org' };
  if (existingHFUrls.has(`https://huggingface.co/${username}`)) return { created: false, reason: 'duplicate' };

  // KEY FIX: use /overview endpoint — this correctly returns type, numModels, numSpaces
  const overviewRes = await fetch(`${HF_API}/users/${username}/overview`, {
    headers: { 'User-Agent': 'agentcy-app/1.0' },
    signal: AbortSignal.timeout(6000),
  });
  if (!overviewRes.ok) return { created: false, reason: 'fetch_failed' };
  const overview = await overviewRes.json();
  if (overview.error || overview.type === 'org') return { created: false, reason: 'org' };

  const modelCount = overview.numModels ?? 0;
  const spacesCount = overview.numSpaces ?? 0;
  if (modelCount === 0 && spacesCount === 0) return { created: false, reason: 'no_activity' };

  const { github_handle: scrapedGH, contact_path: scrapedContact } = await scrapeHFContactLinks(username);

  let finalContactPath = scrapedContact;
  let githubHandle = scrapedGH;
  let githubEvidence = null;

  if (githubHandle) {
    if (existingGitHubUrls.has(`https://github.com/${githubHandle}`)) return { created: false, reason: 'duplicate_github' };
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

  if (!finalContactPath && !githubHandle && !existingGitHubUrls.has(`https://github.com/${username}`)) {
    const ghRes = await ghFetch(`/users/${username}`);
    if (ghRes.ok) {
      const ghProfile = await ghRes.json();
      if (ghProfile.type !== 'Organization') {
        githubHandle = username;
        finalContactPath = extractGitHubContactPath(ghProfile);
        if (finalContactPath && (ghProfile.followers ?? 0) <= 2000) {
          const reposRes = await ghFetch(`/users/${username}/repos?per_page=50&sort=pushed`);
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
  }

  if (!finalContactPath) return { created: false, reason: 'no_contact' };

  const modelsRes = await fetch(`${HF_API}/models?author=${username}&limit=10`, { headers: { 'User-Agent': 'agentcy-app/1.0' } });
  const modelList = modelsRes.ok ? await modelsRes.json() : [];
  const safeModels = Array.isArray(modelList) ? modelList : [];
  const totalDownloads = safeModels.reduce((s, m) => s + (m.downloads ?? 0), 0);
  const modelNames = safeModels.slice(0, 5).map((m) => m.modelId ?? m.id ?? '').filter(Boolean);
  const lastPush = safeModels.map((m) => m.lastModified ?? m.updatedAt ?? '').filter(Boolean).sort().reverse()[0] ?? null;

  const evidenceCard = {
    huggingface_models: modelCount > 0 ? `${modelCount} model${modelCount !== 1 ? 's' : ''}, ${totalDownloads.toLocaleString()} downloads` : '0 models',
    model_names: modelNames,
    spaces_count: spacesCount,
    last_push: lastPush,
    ...(githubEvidence ?? {}),
    commits_90d: null,
    oss_contributions: [],
  };

  const gdprDeletionDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  await base44.asServiceRole.entities.Candidate.create({
    name: overview.fullname || username,
    email: `${username}@huggingface-noemail.placeholder`,
    github_url: githubHandle ? `https://github.com/${githubHandle}` : null,
    huggingface_url: `https://huggingface.co/${username}`,
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
      for (const m of models) {
        const author = m.author ?? m.modelId?.split('/')?.[0] ?? '';
        if (author && !isKnownOrg(author)) usernames.add(author);
      }
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
      for (const m of models) {
        const author = m.author ?? m.modelId?.split('/')?.[0] ?? '';
        if (author && !isKnownOrg(author)) usernames.add(author);
      }
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
    const newUsernames = [...allUsernames].filter(u => !existingHFUrls.has(`https://huggingface.co/${u}`));

    const BATCH_SIZE = 5;
    const toProcess = newUsernames.slice(0, 60);
    let newCandidatesFound = 0;
    const skipped = { org: 0, no_activity: 0, no_contact: 0, duplicate: 0, duplicate_github: 0, fetch_failed: 0, error: 0 };

    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(u => processUsername(u, existingGitHubUrls, existingHFUrls, base44)));
      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value.created) newCandidatesFound++;
          else skipped[r.value.reason] = (skipped[r.value.reason] ?? 0) + 1;
        } else {
          skipped.error++;
        }
      }
    }

    const summary = {
      run_at: new Date().toISOString(),
      unique_usernames_found: allUsernames.size,
      already_in_system: existingHFUrls.size,
      new_usernames_to_process: newUsernames.length,
      processed_this_run: toProcess.length,
      new_candidates_found: newCandidatesFound,
      skipped,
    };

    console.log('[searchHuggingFace] Run complete:', JSON.stringify(summary));
    return Response.json(summary);
  } catch (error) {
    console.error('[searchHuggingFace] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});