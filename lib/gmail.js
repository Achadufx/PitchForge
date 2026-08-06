import crypto from 'crypto';

/**
 * Gmail integration — OAuth, token custody, sending, and reply detection.
 *
 * WHY THIS EXISTS
 * Pitches go out from the founder's own Gmail rather than a shared Resend
 * domain, because an investor is far more likely to open and reply to mail that
 * arrives from a real person's address than from `pitchblast@onresend.com`.
 * Sending through Gmail also puts the thread in the founder's own mailbox, which
 * is what makes reply detection possible at all: the investor hits Reply and the
 * message lands in that same thread, never touching any third party.
 *
 * WHAT A SYNC ACTUALLY WRITES
 * One column: `sent_emails.replied_at`. Nothing else.
 *
 * That is deliberate and it is worth being explicit about, because the obvious
 * implementation — stamp the column, insert a REPLIED event, call
 * crm_advance_stage — would write the timeline twice. The `sent_emails_engagement`
 * trigger (0005) already inserts the REPLIED relationship_event on that UPDATE,
 * and `sent_emails_engagement_stage` (0007) already calls crm_advance_stage to
 * pull the investor into Engaged, including back out of No Response. Doing it
 * again from JavaScript produces two identical events and a second STAGE_CHANGED
 * row for one reply. So this file writes the timestamp and lets the database do
 * what it already does — the same contract /api/resend-webhook works under.
 *
 * TOKEN CUSTODY
 * A Google refresh token is a standing key to somebody's mailbox, and with the
 * send scope attached it is also the ability to send mail as them. Three rules
 * hold everywhere in this file and in the routes that call it:
 *
 *   1. Tokens are encrypted before they reach Postgres (AES-256-GCM under
 *      GMAIL_TOKEN_KEY) and decrypted only in server memory.
 *   2. No function here ever returns a token to a caller that serialises to
 *      HTTP. `publicConnection()` is the only shape routes are allowed to send
 *      to a browser, and it has no token fields to forget to strip.
 *   3. Reads and writes of this table go through the service role. Migration
 *      0008 revokes column-level SELECT on the token columns from
 *      `authenticated`, so even the founder's own browser session cannot pull
 *      them out — RLS scopes rows, not columns, and a token is a column
 *      problem.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Scopes for reading mailbox (reply detection) and sending pitches.
// Adding gmail.send means existing connections must re-consent before they can send.
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';

// How far back the very first sync looks. A founder connecting today wants the
// replies from the batch they sent last week to land in the pipeline; they do
// not want six years of archive walked in a 60-second function.
const FIRST_SYNC_LOOKBACK_DAYS = 30;

// Slack on the incremental window. Gmail's `after:` is coarse and a message can
// be indexed slightly after it arrives; re-checking a day of overlap is cheap
// because a second sighting of the same reply is a no-op (replied_at is only
// written when it is currently NULL).
const OVERLAP_HOURS = 24;

// Gmail's `q` is a URL parameter with a practical length ceiling, and an OR of
// 200 addresses is well past it. Batching also bounds the blast radius of one
// malformed address.
const ADDRESSES_PER_QUERY = 20;

// Bounded so one founder with a very loud mailbox cannot eat the whole cron.
const MAX_PAGES_PER_QUERY = 3;
const MAX_MESSAGES_PER_SYNC = 300;

// Refresh this far before actual expiry. A token that expires mid-sync turns
// into a 401 on message 40 of 60.
const EXPIRY_SKEW_MS = 2 * 60 * 1000;

/** Google said the grant is gone. Retrying will not fix it; the founder must reconnect. */
export class GmailAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GmailAuthError';
    this.needsReconnect = true;
  }
}

/**
 * Gmail is throttling. Separate from GmailError because the caller's response is
 * different in kind: a rate limit means "stop sending for now and tell the
 * founder how many went out", not "this pitch failed, move to the next one".
 */
export class GmailRateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GmailRateLimitError';
    this.retryable = true;
  }
}

export class GmailError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GmailError';
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function gmailConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function requireConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new GmailError('Gmail is not configured on this deployment');
  }
  return { clientId, clientSecret, redirectUri };
}

// ---------------------------------------------------------------------------
// Encryption at rest
// ---------------------------------------------------------------------------
// AES-256-GCM, key from GMAIL_TOKEN_KEY (32 bytes, hex or base64). Stored as
// `v1.<iv>.<tag>.<ciphertext>`, all base64url.
//
// Without the key we store the token as `plain.<value>` and log loudly. That is
// a deliberate choice over refusing to run: RLS plus the column revoke in 0008
// still keep the token off the wire and away from other founders, so the
// feature degrades from "encrypted at rest" to "protected by database
// permissions" rather than breaking. The tag is what makes the fallback
// detectable — decrypt() never has to guess which form it is looking at.

function encryptionKey() {
  const raw = process.env.GMAIL_TOKEN_KEY;
  if (!raw) return null;
  const buf = /^[0-9a-f]{64}$/i.test(raw.trim())
    ? Buffer.from(raw.trim(), 'hex')
    : Buffer.from(raw.trim(), 'base64');
  if (buf.length !== 32) {
    console.error('[gmail] GMAIL_TOKEN_KEY must be 32 bytes (64 hex chars or base64) — ignoring it');
    return null;
  }
  return buf;
}

export function encryptToken(value) {
  const key = encryptionKey();
  if (!key) {
    console.warn('[gmail] GMAIL_TOKEN_KEY is not set — storing OAuth tokens unencrypted');
    return 'plain.' + Buffer.from(String(value), 'utf8').toString('base64url');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ct.toString('base64url'),
  ].join('.');
}

export function decryptToken(stored) {
  if (!stored) return null;
  const parts = String(stored).split('.');

  if (parts[0] === 'plain') {
    return Buffer.from(parts[1] || '', 'base64url').toString('utf8');
  }

  if (parts[0] === 'v1') {
    const key = encryptionKey();
    if (!key) {
      // The key was set when this row was written and is missing now. Rotating
      // it away silently would look like "Gmail stopped working" forever, so
      // say exactly what happened.
      throw new GmailError('GMAIL_TOKEN_KEY is missing but stored tokens are encrypted with it');
    }
    const [, iv, tag, ct] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ct, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  // Anything else predates the format tag. Treat it as the literal token so an
  // early row keeps working rather than locking the founder out.
  return String(stored);
}

// ---------------------------------------------------------------------------
// OAuth state
// ---------------------------------------------------------------------------
// The callback arrives as a plain browser navigation from Google. It carries no
// Authorization header, and PitchWire's Supabase session lives in localStorage
// rather than a cookie, so there is nothing on that request that identifies the
// founder — except what we put in `state` ourselves.
//
// So state is a signed claim: "this flow was started by user U at time T". The
// HMAC is what stops somebody pasting their own callback URL with another
// founder's id in it and having us attach their mailbox to that founder's
// pipeline. Ten-minute expiry bounds replay of a captured consent URL.

const STATE_TTL_MS = 10 * 60 * 1000;

function stateSecret() {
  const secret = process.env.GMAIL_STATE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new GmailError('Gmail is not configured on this deployment');
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url');
}

export function createOAuthState(userId, issuedAt) {
  const body = Buffer.from(
    JSON.stringify({ uid: userId, iat: issuedAt, n: crypto.randomBytes(8).toString('hex') })
  ).toString('base64url');
  return body + '.' + sign(body);
}

/** Returns the user id the flow was started by, or null if the state is not ours. */
export function verifyOAuthState(state, now) {
  try {
    if (typeof state !== 'string') return null;
    const dot = state.lastIndexOf('.');
    if (dot < 1) return null;

    const body = state.slice(0, dot);
    const provided = Buffer.from(state.slice(dot + 1), 'base64url');
    const expected = Buffer.from(sign(body), 'base64url');
    if (provided.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(provided, expected)) return null;

    const claim = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!claim || typeof claim.uid !== 'string' || typeof claim.iat !== 'number') return null;
    if (Math.abs(now - claim.iat) > STATE_TTL_MS) return null;

    return claim.uid;
  } catch {
    return null;
  }
}

export function buildAuthUrl(state) {
  const { clientId, redirectUri } = requireConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    // offline + consent is what produces a refresh_token. Without `consent`
    // Google omits it on every grant after the first, and the connection then
    // works for exactly one hour before dying in a way that is very hard to
    // diagnose from the outside.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return GOOGLE_AUTH_URL + '?' + params.toString();
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

async function tokenRequest(body) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const code = (payload && payload.error) || String(res.status);
    // invalid_grant is the one error that is permanent: the founder revoked
    // access, changed their password, or the refresh token aged out.
    if (code === 'invalid_grant') {
      throw new GmailAuthError('Google revoked this connection');
    }
    throw new GmailError('Google token request failed: ' + code);
  }

  return payload || {};
}

export async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = requireConfig();
  const data = await tokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  if (!data.access_token) throw new GmailError('Google returned no access token');

  return {
    accessToken: data.access_token,
    // Absent when the founder had already granted access and Google decided not
    // to reissue. prompt=consent should prevent it; the caller still has to
    // handle it, because a connection without one cannot survive an hour.
    refreshToken: data.refresh_token || null,
    expiresAt: expiryFrom(data.expires_in),
  };
}

export async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = requireConfig();
  const data = await tokenRequest({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });

  if (!data.access_token) throw new GmailError('Google returned no access token on refresh');

  return {
    accessToken: data.access_token,
    expiresAt: expiryFrom(data.expires_in),
  };
}

function expiryFrom(expiresIn) {
  const seconds = Number(expiresIn);
  const ms = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 3600 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

// ---------------------------------------------------------------------------
// Gmail API
// ---------------------------------------------------------------------------

async function gmailGet(path, accessToken) {
  const res = await fetch(GMAIL_API + path, {
    headers: { Authorization: 'Bearer ' + accessToken },
  });

  if (res.status === 401) throw new GmailAuthError('Gmail rejected the access token');
  if (res.status === 403) {
    const body = await res.text().catch(() => '');
    // 403 covers both "you never granted this scope" and "slow down". Only the
    // first is worth telling the founder to reconnect over.
    if (body.includes('insufficient') || body.includes('ACCESS_TOKEN_SCOPE')) {
      throw new GmailAuthError('The Gmail grant is missing the required scope');
    }
    throw new GmailRateLimitError('Gmail rate limited this request');
  }
  if (res.status === 429) {
    throw new GmailRateLimitError('Gmail rate limit exceeded');
  }
  if (!res.ok) {
    throw new GmailError('Gmail request failed (' + res.status + ')');
  }

  return res.json();
}

async function gmailPost(path, accessToken, body) {
  const res = await fetch(GMAIL_API + path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) throw new GmailAuthError('Gmail rejected the access token');
  if (res.status === 403) {
    const body = await res.text().catch(() => '');
    if (body.includes('insufficient') || body.includes('ACCESS_TOKEN_SCOPE')) {
      throw new GmailAuthError('The Gmail grant is missing the send scope');
    }
    throw new GmailRateLimitError('Gmail rate limited this request');
  }
  if (res.status === 429) {
    throw new GmailRateLimitError('Gmail rate limit exceeded');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new GmailError('Gmail send failed (' + res.status + '): ' + text);
  }

  return res.json();
}

export async function fetchGmailProfile(accessToken) {
  const profile = await gmailGet('/profile', accessToken);
  return {
    email: profile.emailAddress || null,
    historyId: profile.historyId || null,
  };
}

/** Normalises `"Jane Doe" <jane@fund.com>` down to `jane@fund.com`. */
export function extractAddress(header) {
  if (!header) return null;
  const angled = /<([^>]+)>/.exec(header);
  const raw = angled ? angled[1] : header;
  const trimmed = String(raw).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

function buildQuery(addresses, afterSeconds) {
  const from = addresses.map((a) => 'from:' + a).join(' OR ');
  // -in:sent excludes the founder's own outbound copies, which otherwise match
  // their own thread. -in:chats keeps Hangouts history out.
  return '(' + from + ') -in:sent -in:chats after:' + afterSeconds;
}

// ---------------------------------------------------------------------------
// Access tokens
// ---------------------------------------------------------------------------

/**
 * Returns a usable access token for a connection, refreshing and persisting it
 * first if it is at or near expiry.
 *
 * Shared by sync and send so there is one place where the skew is decided. A
 * send loop that refreshed reactively on 401 would have already put half a
 * campaign into the investor's inbox before discovering the problem.
 */
export async function ensureAccessToken(db, connection) {
  const expiresAt = connection.token_expiry ? Date.parse(connection.token_expiry) : 0;
  if (expiresAt && expiresAt - EXPIRY_SKEW_MS > Date.now()) {
    return decryptToken(connection.access_token);
  }

  const refreshToken = decryptToken(connection.refresh_token);
  if (!refreshToken) throw new GmailAuthError('This connection has no refresh token');

  const refreshed = await refreshAccessToken(refreshToken);
  await db
    .from('gmail_connections')
    .update({
      access_token: encryptToken(refreshed.accessToken),
      token_expiry: refreshed.expiresAt,
    })
    .eq('id', connection.id);

  return refreshed.accessToken;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/**
 * RFC 2822 header encoding for anything that might not be ASCII.
 *
 * A subject line with a smart quote or an accented founder name is not
 * theoretical — it arrives as mojibake in the investor's client if the header
 * goes out raw, because headers are ASCII by specification. RFC 2047 'B'
 * encoding is the standard escape hatch.
 */
function encodeHeader(value) {
  const str = String(value == null ? '' : value);
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]*$/.test(str)) return str;
  return '=?UTF-8?B?' + Buffer.from(str, 'utf8').toString('base64') + '?=';
}

/** Quotes a display name only when it contains characters that need it. */
function formatAddress(name, email) {
  if (!name) return email;
  const encoded = encodeHeader(name);
  const needsQuotes = /[",;:<>@()\[\]\\]/.test(encoded);
  const display = needsQuotes ? '"' + encoded.replace(/(["\\])/g, '\\$1') + '"' : encoded;
  return display + ' <' + email + '>';
}

/**
 * Strips CR/LF from a header value.
 *
 * Subject and recipient come from generated pitch content, which means they are
 * attacker-influenceable in the sense that matters here: a newline inside a
 * header value ends that header and starts a new one, so an unfiltered subject
 * could inject Bcc: and quietly fan a pitch out to addresses the founder never
 * saw. Removing the characters entirely is the only safe normalisation.
 */
function sanitizeHeader(value) {
  return String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Builds an RFC 2822 message and base64url-encodes it for the Gmail API.
 *
 * Body goes out as text/plain; UTF-8 with base64 transfer encoding sidesteps the
 * 998-octet line limit that trips long generated paragraphs.
 */
export function buildRawMessage({ fromName, fromEmail, to, subject, body }) {
  const headers = [
    'From: ' + formatAddress(fromName, fromEmail),
    'To: ' + sanitizeHeader(to),
    'Subject: ' + encodeHeader(sanitizeHeader(subject)),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ];

  const encodedBody = Buffer.from(String(body), 'utf8')
    .toString('base64')
    .replace(/(.{76})/g, '$1\r\n');

  return Buffer.from(headers.join('\r\n') + '\r\n\r\n' + encodedBody, 'utf8')
    .toString('base64url');
}

/**
 * Sends one pitch and returns the identifiers reply detection needs.
 *
 * THE ID THAT MATTERS
 * `messages.send` returns Gmail's internal id (`18f2c...`), which is a handle
 * for the API and nothing else. The `In-Reply-To` and `References` headers on
 * the investor's reply quote the RFC 2822 Message-ID (`<CAF...@mail.gmail.com>`)
 * — a completely different value that Gmail assigns at send time and does not
 * return. Storing the internal id and matching it against In-Reply-To would
 * compare two unrelated namespaces and never produce a single match.
 *
 * So this reads the header back immediately after sending. That is one extra
 * API call per pitch, and it is the call that makes threaded reply detection
 * work at all.
 */
export async function sendGmailMessage(accessToken, message) {
  const raw = buildRawMessage(message);
  const sent = await gmailPost('/messages/send', accessToken, { raw });

  if (!sent || !sent.id) {
    throw new GmailError('Gmail accepted the send but returned no message id');
  }

  let messageId = null;
  try {
    const meta = await gmailGet(
      '/messages/' + encodeURIComponent(sent.id) + '?format=metadata&metadataHeaders=Message-ID',
      accessToken
    );
    const headers = (meta.payload && meta.payload.headers) || [];
    const header = headers.find((h) => h.name && h.name.toLowerCase() === 'message-id');
    messageId = normalizeMessageId(header && header.value);
  } catch (err) {
    // The mail is already gone. Losing the header only costs us thread-based
    // matching on this one send — the threadId and address fallbacks still
    // work — so it must not surface as a failed send.
    console.error('[gmail] could not read Message-ID for ' + sent.id + ': ' + err.message);
  }

  return {
    gmailId: sent.id,
    threadId: sent.threadId || null,
    messageId,
  };
}

/** Normalises `<abc@mail.gmail.com>` and `abc@mail.gmail.com` to the same string. */
export function normalizeMessageId(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  const inner = /^<(.+)>$/.exec(trimmed);
  const id = (inner ? inner[1] : trimmed).trim().toLowerCase();
  return id.length ? id : null;
}

/** Every Message-ID referenced by a reply, from both In-Reply-To and References. */
export function parseReferencedIds(headers) {
  const wanted = new Set(['in-reply-to', 'references']);
  const ids = new Set();
  for (const header of headers || []) {
    if (!header.name || !wanted.has(header.name.toLowerCase())) continue;
    // References is a whitespace-separated chain of the whole thread ancestry.
    for (const token of String(header.value || '').split(/[\s,]+/)) {
      const id = normalizeMessageId(token);
      if (id) ids.add(id);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Checks one founder's mailbox for investor replies and stamps them.
 *
 * `db` must be a service-role client: the token columns are unreadable to
 * `authenticated` by design, and the routes have already established that the
 * caller owns this connection before getting here.
 *
 * Returns a summary safe to serialise — counts and addresses the founder
 * already knows about, never a token.
 */
export async function syncConnection(db, connection, options) {
  const opts = options || {};
  const startedAt = Date.now();

  let accessToken = await ensureAccessToken(db, connection);

  // Every investor this founder has emailed who has not yet been marked as
  // having replied. Rows that already have replied_at are excluded here rather
  // than filtered later, so a founder deep into a raise searches for the
  // handful of open threads instead of every address they have ever touched.
  const { data: pending, error: pendingError } = await db
    .from('sent_emails')
    .select('id, to_email, sent_at, replied_at, relationship_id, provider_message_id, provider_thread_id')
    .eq('owner_id', connection.owner_id)
    .is('replied_at', null)
    .order('sent_at', { ascending: false })
    .limit(2000);

  if (pendingError) {
    throw new GmailError('Could not load sent emails: ' + pendingError.message);
  }

  const rows = pending || [];
  if (!rows.length) {
    await markSynced(db, connection.id, null);
    return { checked: 0, matched: 0, updated: 0, replies: [], truncated: false, ms: Date.now() - startedAt };
  }

  // Three indexes, because a reply can be recognised three ways and they are not
  // equally trustworthy. See the matching block below for the precedence.
  //
  // address -> sends to that address, newest first. A reply is attributed to the
  // most recent send that predates it, which is what "they replied to my
  // follow-up" means in practice.
  const byAddress = new Map();
  const byMessageId = new Map();
  const byThreadId = new Map();

  for (const row of rows) {
    const addr = (row.to_email || '').trim().toLowerCase();
    if (addr) {
      if (!byAddress.has(addr)) byAddress.set(addr, []);
      byAddress.get(addr).push(row);
    }

    // Only Gmail sends have these. Rows written by the old Resend path carry a
    // Resend id in provider_message_id, which will never appear in an
    // In-Reply-To header — a stale value cannot produce a false match, it just
    // never matches, and those rows fall through to the address path.
    const mid = normalizeMessageId(row.provider_message_id);
    if (mid) byMessageId.set(mid, row);

    if (row.provider_thread_id) {
      const tid = String(row.provider_thread_id);
      if (!byThreadId.has(tid)) byThreadId.set(tid, []);
      byThreadId.get(tid).push(row);
    }
  }

  for (const list of byAddress.values()) {
    list.sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1));
  }
  for (const list of byThreadId.values()) {
    list.sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1));
  }

  const addresses = Array.from(byAddress.keys());

  // Incremental window. First sync reaches back a month; later syncs re-cover a
  // day of overlap so a message indexed just after the previous run is not
  // skipped forever.
  const lastSynced = connection.last_synced_at ? Date.parse(connection.last_synced_at) : 0;
  const floor = Date.now() - FIRST_SYNC_LOOKBACK_DAYS * 24 * 3600 * 1000;
  const since = opts.full || !lastSynced
    ? floor
    : Math.max(floor, lastSynced - OVERLAP_HOURS * 3600 * 1000);
  const afterSeconds = Math.floor(since / 1000);

  const messageIds = [];
  let truncated = false;

  for (let i = 0; i < addresses.length; i += ADDRESSES_PER_QUERY) {
    if (messageIds.length >= MAX_MESSAGES_PER_SYNC) {
      truncated = true;
      break;
    }

    const batch = addresses.slice(i, i + ADDRESSES_PER_QUERY);
    const q = encodeURIComponent(buildQuery(batch, afterSeconds));
    let pageToken = null;

    for (let page = 0; page < MAX_PAGES_PER_QUERY; page += 1) {
      const url = '/messages?maxResults=100&q=' + q + (pageToken ? '&pageToken=' + pageToken : '');
      const result = await gmailGet(url, accessToken);
      for (const m of result.messages || []) messageIds.push(m.id);

      pageToken = result.nextPageToken || null;
      if (!pageToken) break;
      if (page === MAX_PAGES_PER_QUERY - 1) truncated = true;
    }
  }

  const unique = Array.from(new Set(messageIds)).slice(0, MAX_MESSAGES_PER_SYNC);
  if (unique.length < messageIds.length) truncated = true;

  let matched = 0;
  let updated = 0;
  const replies = [];
  const stamped = new Set();

  for (const id of unique) {
    // Metadata format returns headers and internalDate without the body. We
    // have no business reading the contents of an investor's reply, and not
    // requesting it is the cheapest way to guarantee we never do.
    const message = await gmailGet(
      '/messages/' + encodeURIComponent(id) + '?format=metadata&metadataHeaders=From&metadataHeaders=In-Reply-To&metadataHeaders=References',
      accessToken
    );

    const headers = (message.payload && message.payload.headers) || [];
    const fromHeader = headers.find((h) => h.name && h.name.toLowerCase() === 'from');
    const address = extractAddress(fromHeader && fromHeader.value);
    if (!address) continue;

    const receivedMs = Number(message.internalDate);
    if (!Number.isFinite(receivedMs)) continue;
    const receivedAt = new Date(receivedMs).toISOString();

    // Three matching strategies, most trustworthy first:
    // 1. Message-ID in In-Reply-To/References (only works for Gmail sends)
    // 2. Gmail threadId (works for all Gmail sends)
    // 3. Address + timestamp (fallback for Resend sends and missing headers)

    let target = null;

    // Strategy 1: RFC 2822 threading headers
    const referencedIds = parseReferencedIds(headers);
    if (referencedIds.size) {
      for (const id of referencedIds) {
        const candidate = byMessageId.get(id);
        if (candidate && candidate.sent_at <= receivedAt && !stamped.has(candidate.id)) {
          target = candidate;
          break;
        }
      }
    }

    // Strategy 2: Gmail threadId
    if (!target && message.threadId) {
      const candidates = byThreadId.get(message.threadId);
      if (candidates) {
        target = candidates.find((row) => row.sent_at <= receivedAt && !stamped.has(row.id));
      }
    }

    // Strategy 3: Address + timestamp fallback
    if (!target) {
      const candidates = byAddress.get(address);
      if (candidates) {
        // The newest send that predates the reply. A message that arrived before we
        // ever wrote to them is not a reply to us — it is prior correspondence, and
        // stamping it would invent a response rate.
        target = candidates.find((row) => row.sent_at <= receivedAt && !stamped.has(row.id));
      }
    }

    if (!target) continue;

    matched += 1;

    // replied_at only, and only when it is still NULL. The 0005 trigger turns
    // this UPDATE into the REPLIED event and the 0007 trigger moves the
    // investor to Engaged, so writing either of those here would double them.
    // The .is() guard also makes a re-run idempotent under a race with the cron.
    const { data: patched, error: patchError } = await db
      .from('sent_emails')
      .update({ replied_at: receivedAt })
      .eq('id', target.id)
      .is('replied_at', null)
      .select('id');

    if (patchError) {
      console.error('[gmail] could not stamp reply on ' + target.id + ': ' + patchError.message);
      continue;
    }

    if (patched && patched.length) {
      updated += 1;
      stamped.add(target.id);
      replies.push({ email: address, repliedAt: receivedAt });
    }
  }

  await markSynced(db, connection.id, null);

  return {
    checked: unique.length,
    matched,
    updated,
    replies,
    truncated,
    ms: Date.now() - startedAt,
  };
}

async function markSynced(db, id, syncError) {
  const { error } = await db
    .from('gmail_connections')
    .update({ last_synced_at: new Date().toISOString(), sync_error: syncError })
    .eq('id', id);
  if (error) console.error('[gmail] could not update last_synced_at: ' + error.message);
}

/** Records a permanent auth failure so the UI can prompt a reconnect. */
export async function markNeedsReconnect(db, id, message) {
  const { error } = await db
    .from('gmail_connections')
    .update({ sync_error: message, last_synced_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('[gmail] could not record sync error: ' + error.message);
}

/**
 * The only shape of a connection that is allowed to leave the server.
 *
 * Built by picking fields rather than deleting them: a `delete row.access_token`
 * approach breaks silently the day someone adds a second token column, and this
 * one cannot.
 */
export function publicConnection(row) {
  if (!row) return null;
  return {
    connected: true,
    email: row.email,
    lastSyncedAt: row.last_synced_at || null,
    connectedAt: row.created_at || null,
    needsReconnect: Boolean(row.sync_error),
    syncError: row.sync_error || null,
  };
}
