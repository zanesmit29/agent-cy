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
  const linkedinMatch = bio.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) return `linkedin:https://${linkedinMatch[0]}`;
  const discordMatch = bio.match(/discord[:\s#]+[\w#]{2,37}/i);
  if (discordMatch) return `discord:${discordMatch[0]}`;
  return null;
}

function extractGitHubHandle(hfProfile) {
  const candidates = [
    hfProfile.github ?? '',
    ...(Array.isArray(hfProfile.socialLinks) ? hfProfile.socialLinks : []),
    hfProfile.website ?? '',
    hfProfile.description ?? '',
    hfProfile.bio ?? '',
  ];
  for (const s of candidates) {
    const m = String(s).match(/github\.com\/([A-Za-z0-9_-]+)/i);
    if (m?.[1] && m[1] !== 'apps') return m[1];
  }
  return null;
}

async function collectHuggingFaceEvidence(username) {
  const NULL_RESULT = { is_org: false, contact_path: null, hf_evidence: {}, github_handle: null };

  const profileRes = await fetch(`${HF_API}/users/${username}`, {
    headers: { 'User-Agent': 'agentcy-app/1.0' },
  });
  if (!profileRes.ok) return { ...NULL_RESULT, is_org: true };

  const hfProfile = await profileRes.json();
  if (hfProfile.type === 'org') return { ...NULL_RESULT, is_org: true };

  let contactPath = null;
  if (hfProfile.email) contactPath = `email:${hfProfile.email}`;
  else if (hfProfile.website?.trim()) contactPath = `website:${hfProfile.website.trim()}`;
  else if (hfProfile.twitter) contactPath = `twitter:${hfProfile.twitter}`;
  else {
    const bioText = String(hfProfile.description ?? hfProfile.bio ?? '');
    const lm = bioText.match(/linkedin\.com\/in\/[\w-]+/i);
    if (lm) contactPath = `linkedin:https://${lm[0]}`;
  }

  const githubHandle = extractGitHubHandle(hfProfile);

  const modelsRes = await fetch(`${HF_API}/models?author=${username}&limit=100`, {
    headers: { 'User-Agent': 'agentcy-app/1.0' },
  });
  const modelList = modelsRes.ok ? (await modelsRes.json()) : [];
  const safeModels = Array.isArray(modelList) ? modelList : [];

  const modelCount = safeModels.length;
  const totalDownloads = safeModels.reduce((s, m) => s + (m.downloads ?? 0), 0);
  const modelNames = safeModels.slice(0, 5).map((m) => m.modelId ?? m.id ?? '').filter(Boolean);
  const lastPush = safeModels
    .map((m) => m.lastModified ?? m.updatedAt ?? '')
    .filter(Boolean).sort().reverse()[0] ?? null;

  const spacesRes = await fetch(`${HF_API}/spaces?author=${username}&limit=100`, {
    headers: { 'User-Agent': 'agentcy-app/1.0' },
  });
  const spaceList = spacesRes.ok ? (await spacesRes.json()) : [];
  const spacesCount = Array.isArray(spaceList) ? spaceList.length : 0;

  const hfEvidence = {
    huggingface_models: modelCount > 0
      ? `${modelCount} model${modelCount !== 1 ? 's' : ''}, ${totalDownloads.toLocaleString()} downloads`
      : '0 models',
    model_names: modelNames,
    spaces_count: spacesCount,
    last_push: lastPush,
  };

  return { is_org: false, contact_path: contactPath, hf_evidence: hfEvidence, github_handle: githubHandle };
}

const RECENT_KEYWORDS = ['llm', 'rag', 'fine-tuning', 'langchain', 'weaviate', 'embedding', 'agent'];
const INDIVIDUAL_KEYWORDS = ['personal', 'finetune', 'my-model', 'custom-llm'];

async function searchByRecent() {
  const usernames = new Set();
  for (const keyword of RECENT_KEYWORDS) {
    try {
      const url = `${HF_API}/models?search=${encodeURIComponent(keyword)}&sort=lastModified&direction=-1&limit=50`;
      const res = await fetch(url, { headers: { 'User-Agent': 'agentcy-app/1.0' } });
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
      const url = `${HF_API}/models?search=${encodeURIComponent(keyword)}&limit=50`;
      const res = await fetch(url, { headers: { 'User-Agent': 'agentcy-app/1.0' } });
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

    const [recentAuthors, relevanceAuthors] = await Promise.all([
      searchByRecent(),
      searchByRelevance(),
    ]);

    const allUsernames = new Set([...recentAuthors, ...relevanceAuthors]);

    const existingRecords = await base44.asServiceRole.entities.Candidate.list();
    const existingGitHubUrls = new Set(
      (existingRecords ?? []).map((c) => c.github_url).filter(Boolean)
    );
    const existingHFUrls = new Set(
      (existingRecords ?? []).map((c) => c.huggingface_url).filter(Boolean)
    );

    const newUsernames = [...allUsernames].filter(
      (u) => !existingHFUrls.has(`https://huggingface.co/${u}`)
    );

    let newCandidatesFound = 0, skippedNoContact = 0, skippedOrg = 0,
        skippedDuplicate = 0, skippedError = 0, githubEnriched = 0;

    for (const username of newUsernames) {
      try {
        const { is_org, contact_path, hf_evidence, github_handle } =
          await collectHuggingFaceEvidence(username);

        if (is_org) { skippedOrg++; continue; }

        let finalContactPath = contact_path;
        let githubEvidence = null;

        if (github_handle) {
          const ghUrl = `https://github.com/${github_handle}`;
          if (existingGitHubUrls.has(ghUrl)) { skippedDuplicate++; continue; }

          const ghProfileRes = await ghFetch(`/users/${github_handle}`);
          if (ghProfileRes.ok) {
            const ghProfile = await ghProfileRes.json();
            if (!finalContactPath) finalContactPath = extractGitHubContactPath(ghProfile);

            if ((ghProfile.followers ?? 0) <= 500) {
              const reposRes = await ghFetch(`/users/${github_handle}/repos?per_page=50&sort=pushed`);
              const repos = reposRes.ok ? await reposRes.json() : [];
              const ownRepos = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];
              const totalStars = ownRepos.reduce((s, r) => s + (r.stargazers_count ?? 0), 0);
              const langMap = {};
              for (const r of ownRepos) {
                if (r.language) langMap[r.language] = (langMap[r.language] ?? 0) + 1;
              }
              const languages = Object.entries(langMap)
                .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);
              githubEvidence = {
                stars: `${totalStars} stars across ${ownRepos.length} repos`,
                languages,
                public_repos: ghProfile.public_repos,
                followers: ghProfile.followers,
              };
              githubEnriched++;
            }
          }
        }

        if (!finalContactPath) { skippedNoContact++; continue; }

        const hfUrl = `https://huggingface.co/${username}`;
        const existing = await base44.asServiceRole.entities.Candidate.filter({ huggingface_url: hfUrl });
        if (existing?.length > 0) { skippedDuplicate++; continue; }

        const evidenceCard = {
          ...hf_evidence,
          ...(githubEvidence ?? {}),
          commits_90d: null,
          oss_contributions: [],
          readme_quality: null,
        };

        const gdprDeletionDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];

        await base44.asServiceRole.entities.Candidate.create({
          name: username,
          email: `${username}@huggingface-noemail.placeholder`,
          github_url: github_handle ? `https://github.com/${github_handle}` : null,
          huggingface_url: hfUrl,
          current_stage: 'Discovered',
          discovered_via: 'HuggingFace',
          contact_path: finalContactPath,
          evidence_card: JSON.stringify(evidenceCard, null, 2),
          opted_out: false,
          gdpr_deletion_due: gdprDeletionDue,
        });

        newCandidatesFound++;
      } catch (_) { skippedError++; }
    }

    const summary = {
      run_at: new Date().toISOString(),
      sources: {
        recent_keyword_authors: recentAuthors.length,
        relevance_keyword_authors: relevanceAuthors.length,
      },
      unique_usernames_found: allUsernames.size,
      already_in_system: existingHFUrls.size,
      new_usernames_to_process: newUsernames.length,
      new_candidates_found: newCandidatesFound,
      github_enriched: githubEnriched,
      skipped_org: skippedOrg,
      skipped_no_contact: skippedNoContact,
      skipped_duplicate: skippedDuplicate,
      skipped_error: skippedError,
    };

    console.log('[searchHuggingFace] Run complete:', JSON.stringify(summary));
    return Response.json(summary);

  } catch (error) {
    console.error('[searchHuggingFace] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});