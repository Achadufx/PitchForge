import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import {
  verifyOAuthState,
  exchangeCodeForTokens,
  fetchGmailProfile,
  encryptToken,
  gmailConfigured,
  GmailAuthError,
} from '../../../lib/gmail';

/**
 * OAuth callback — Google redirects the founder's browser here.
 *
 * This is the one route in the integration with no bearer token on it. It is a
 * top-level navigation from accounts.google.com, so there is no Authorization
 * header and no cookie (the Supabase session lives in localStorage). The only
 * thing tying this request to a founder is the `state` parameter we signed in
 * /api/gmail/connect, and verifying that HMAC is what stops someone crafting a
 * callback that attaches their mailbox to another founder's pipeline.
 *
 * Every exit is a redirect back to /app#account with a short status code in the
 * query string, because the person on the other end is looking at a browser
 * window and a JSON error body would be a dead end. Nothing about the failure
 * beyond a code is put in the URL — an OAuth error string can carry detail that
 * has no business in a browser history or a referrer header.
 */

const RETURN_HASH = '#account';

function back(res, status) {
  // The hash has to come last or the browser reads `#account` as part of the
  // query value and pages/app.js never sees the tab.
  return res.redirect(302, '/app?gmail=' + encodeURIComponent(status) + RETURN_HASH);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!gmailConfigured()) {
    console.error('gmail/callback: Google OAuth env vars are not set');
    return back(res, 'not_configured');
  }

  const { code, state, error: googleError } = req.query || {};

  // The founder pressed Cancel on the consent screen. Not an error worth a
  // scary message.
  if (googleError) {
    console.log('gmail/callback: Google returned ' + googleError);
    return back(res, googleError === 'access_denied' ? 'cancelled' : 'error');
  }

  if (typeof code !== 'string' || !code) return back(res, 'error');

  const userId = verifyOAuthState(state, Date.now());
  if (!userId) {
    // Either forged, or the founder left the consent screen open past the
    // ten-minute window. Same response either way; we cannot tell them apart
    // and neither one should attach a mailbox.
    console.error('gmail/callback: rejected — state failed verification');
    return back(res, 'expired');
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Without a refresh token the connection dies in an hour and every sync
    // after that fails in a way that looks like a bug. Better to send them back
    // through consent now.
    if (!tokens.refreshToken) {
      console.error('gmail/callback: Google returned no refresh token for ' + userId);
      return back(res, 'no_refresh_token');
    }

    // Which mailbox we were actually granted. Taken from Google rather than
    // from anything the client told us, so the address shown in the UI is the
    // address we will really be reading.
    const profile = await fetchGmailProfile(tokens.accessToken);
    if (!profile.email) {
      console.error('gmail/callback: Gmail profile returned no address');
      return back(res, 'error');
    }

    const db = supabaseAdmin();

    // Service role, not the founder's session: 0008 revokes SELECT on the token
    // columns from `authenticated` on purpose, and there is no session here to
    // use anyway. owner_id comes from the verified state, never from the
    // request body — the same rule /api/resend-webhook follows.
    //
    // Upsert on owner_id so reconnecting replaces the grant instead of hitting
    // the unique constraint, and clears any previous sync_error.
    const { error } = await db
      .from('gmail_connections')
      .upsert(
        {
          owner_id: userId,
          email: profile.email,
          access_token: encryptToken(tokens.accessToken),
          refresh_token: encryptToken(tokens.refreshToken),
          token_expiry: tokens.expiresAt,
          sync_error: null,
        },
        { onConflict: 'owner_id' }
      );

    if (error) {
      console.error('gmail/callback: could not store connection: ' + error.message);
      return back(res, 'error');
    }

    console.log('gmail/callback: connected ' + profile.email + ' for ' + userId);
    return back(res, 'connected');
  } catch (err) {
    if (err instanceof GmailAuthError) {
      console.error('gmail/callback: grant rejected: ' + err.message);
      return back(res, 'denied');
    }
    console.error('gmail/callback: unhandled error: ' +
      (err && err.message ? err.message : String(err)));
    return back(res, 'error');
  }
}
