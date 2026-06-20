import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN') ?? '';
const DISCORD_API = 'https://discord.com/api/v10';
const GITHUB_PAT = Deno.env.get('GITHUB_PAT') ?? '';
const GITHUB_API = 'https://api.github.com';

const TARGET_CHANNELS = [
  { id: '879548962464493619',  label: 'HuggingFace #general' },
  { id: '1417920887549857874', label: 'HuggingFace #science' },
  { id: '861966823054639134',  label: 'DevPost' },
  { id: '1101210829807956100', label: 'Kaggle' },
  { id: '1303811506080841758', label: 'Base44' },
];

const discordFetch = (path) =>
  fetch(`${DISCORD_API}${path}`, {
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'User-Agent': 'agentcy-app/1.0 (https://agentcy.io)',
    },
  });

const ghFetch = (path) =>
  fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'agentcy-app/1.0',
    },
  });

function extractGitHubUrl(text) {
  const match = text?.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
  if (!match) return null;
  const username = match[1];
  if (['features', 'pricing', 'about', 'contact', 'sponsors', 'explore'].includes(username.toLowerCase())) return null;
  return `https://github.com/${username}`;
}

function extractLinkedInUrl(text) {
  const match = text?.match(/linkedin\.com\/in\/[\w-]+/i);
  return match ? `https://${match[0]}` : null;
}

function extractContactFromText(text) {
  const github = extractGitHubUrl(text);
  if (github) return { type: 'github', value: github };
  const linkedin = extractLinkedInUrl(text);
  if (linkedin) return { type: 'linkedin', value: linkedin };
  return null;
}

async function fetchDiscordUserBio(userId) {
  try {
    const res = await discordFetch(`/users/${userId}`);
    if (!res.ok) return '';
    const user = await res.json();
    return user.bio ?? '';
  } catch (_) { return ''; }
}

async function collectGitHubEvidence(username) {
  const profileRes = await ghFetch(`/users/${username}`);
  if (!profileRes.ok) return { contact_path: null, evidence_card: null, name: null, email: null, too_prominent: false };
  const profile = await profileRes.json();
  if ((profile.followers ?? 0) > 500) return { contact_path: null, evidence_card: null, name: null, email: null, too_prominent: true };

  let contactPath = null;
  if (profile.email) contactPath = `email:${profile.email}`;
  else if (profile.blog?.trim()) contactPath = `website:${profile.blog.trim()}`;
  else if (profile.twitter_username) contactPath = `twitter:${profile.twitter_username}`;
  else {
    const bio = profile.bio ?? '';
    const li = bio.match(/linkedin\.com\/in\/[\w-]+/i);
    if (li) contactPath = `linkedin:https://${li[0]}`;
  }

  const reposRes = await ghFetch(`/users/${username}/repos?per_page=50&sort=pushed`);
  const repos = reposRes.ok ? await reposRes.json() : [];
  const ownRepos = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];
  const totalStars = ownRepos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);
  const langMap = {};
  for (const r of ownRepos) {
    if (r.language) langMap[r.language] = (langMap[r.language] ?? 0) + 1;
  }
  const languages = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);

  return {
    contact_path: contactPath,
    evidence_card: {
      commits_90d: 'not fetched (Discord discovery)',
      stars: `${totalStars} stars across ${ownRepos.length} repos`,
      languages,
      public_repos: profile.public_repos,
      followers: profile.followers,
      oss_contributions: [],
      huggingface_models: null,
      discord_discovered: true,
    },
    name: profile.name ?? profile.login,
    email: profile.email ?? null,
    too_prominent: false,
  };
}

const SIGNAL_KEYWORDS = [
  'looking for work', 'open to work', 'open to opportunities', 'available for hire',
  'seeking role', 'job hunting', 'freelance', 'github.com/', 'linkedin.com/in/',
  'built a', 'just shipped', 'just released', 'i made', 'my project', 'my model',
  'open source', 'llm', 'rag', 'fine-tune', 'embeddings', 'vector', 'langchain',
];

function hasSignalKeyword(text) {
  return SIGNAL_KEYWORDS.some(kw => text.toLowerCase().includes(kw));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const gdprDeletionDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const summary = {
      run_at: new Date().toISOString(),
      channels_polled: 0,
      messages_read: 0,
      signals_found: 0,
      new_candidates_found: 0,
      skipped_no_contact: 0,
      skipped_duplicate: 0,
      skipped_too_prominent: 0,
      skipped_channel_error: 0,
      channel_results: [],
    };

    for (const channel of TARGET_CHANNELS) {
      const res = await discordFetch(`/channels/${channel.id}/messages?limit=50`);
      if (!res.ok) {
        const errText = await res.text();
        summary.skipped_channel_error++;
        summary.channel_results.push({ channel: channel.label, status: res.status, error: errText.slice(0, 200) });
        continue;
      }

      summary.channels_polled++;
      const messages = await res.json();
      if (!Array.isArray(messages)) continue;
      summary.messages_read += messages.length;

      const processedUsers = new Set();

      for (const msg of messages) {
        const authorId = msg.author?.id;
        const authorName = msg.author?.username ?? '';
        if (!authorId || msg.author?.bot) continue;
        if (processedUsers.has(authorId)) continue;
        processedUsers.add(authorId);

        const messageText = msg.content ?? '';
        if (!hasSignalKeyword(messageText)) continue;
        summary.signals_found++;

        const contactFromMessage = extractContactFromText(messageText);
        const bio = await fetchDiscordUserBio(authorId);
        const contactFromBio = extractContactFromText(bio);
        const contact = contactFromMessage ?? contactFromBio;

        if (!contact) { summary.skipped_no_contact++; continue; }

        if (contact.type === 'github') {
          const githubUsername = contact.value.replace('https://github.com/', '');
          const existing = await base44.asServiceRole.entities.Candidate.filter({ github_url: contact.value });
          if (existing?.length > 0) { summary.skipped_duplicate++; continue; }

          const evidence = await collectGitHubEvidence(githubUsername);
          if (evidence.too_prominent) { summary.skipped_too_prominent++; continue; }

          await base44.asServiceRole.entities.Candidate.create({
            name: evidence.name ?? authorName,
            email: evidence.email ?? '',
            github_url: contact.value,
            current_stage: 'Discovered',
            discovered_via: 'Discord',
            contact_path: evidence.contact_path ?? `github:${contact.value}`,
            evidence_card: JSON.stringify({ ...evidence.evidence_card, discord_channel: channel.label, discord_user_id: authorId }, null, 2),
            opted_out: false,
            gdpr_deletion_due: gdprDeletionDue,
          });
          summary.new_candidates_found++;

        } else if (contact.type === 'linkedin') {
          const existing = await base44.asServiceRole.entities.Candidate.filter({ contact_path: `linkedin:${contact.value}` });
          if (existing?.length > 0) { summary.skipped_duplicate++; continue; }

          await base44.asServiceRole.entities.Candidate.create({
            name: authorName,
            email: '',
            github_url: '',
            current_stage: 'Discovered',
            discovered_via: 'Discord',
            contact_path: `linkedin:${contact.value}`,
            evidence_card: JSON.stringify({ discord_channel: channel.label, discord_user_id: authorId, linkedin_url: contact.value, note: 'Discovered via Discord. No GitHub profile found.' }, null, 2),
            opted_out: false,
            gdpr_deletion_due: gdprDeletionDue,
          });
          summary.new_candidates_found++;
        }
      }
      summary.channel_results.push({ channel: channel.label, messages: messages.length });
    }

    return Response.json(summary);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
});