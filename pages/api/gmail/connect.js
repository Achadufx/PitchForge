import { withCrmAuth, CrmError } from '../../../lib/crm/server';
import { assertCan } from '../../../lib/crm/permissions';
import { buildAuthUrl, createOAuthState, gmailConfigured } from '../../../lib/gmail';

/**
 * Starts the Gmail OAuth flow.
 *
 * WHY THIS IS A POST THAT RETURNS A URL, NOT A LINK THE BROWSER FOLLOWS
 * PitchWire keeps its Supabase session in localStorage, not a cookie. A plain
 * `<a href="/api/gmail/connect">` therefore arrives with no credentials at all
 * and the route has no idea who is connecting. So the button calls this route
 * with the founder's bearer token, we mint a signed `state` that names them,
 * and the client navigates to the returned URL.
 *
 * That signed state is the whole security story of the callback: Google's
 * redirect back to us is an anonymous browser navigation, and `state` is the
 * only thing on it that we can trust to say whose mailbox this is.
 *
 * GET behaves the same way but issues a 302 instead, which makes the flow
 * testable with curl and a token.
 */
export default withCrmAuth(['GET', 'POST'], async (ctx) => {
  // Gated on sending, not on the pipeline. Reading the mailbox fills the CRM,
  // which is a Starter feature — but pitches now leave through the founder's own
  // Gmail on every plan, so gating the connection on crm_pipeline would take
  // sending away from free accounts that have it today.
  assertCan(ctx.plan, 'email_sending');

  if (!gmailConfigured()) {
    throw new CrmError(503, 'Gmail is not configured on this deployment');
  }
  if (!process.env.GOOGLE_REDIRECT_URI) {
    throw new CrmError(503, 'GOOGLE_REDIRECT_URI is not set');
  }

  const state = createOAuthState(ctx.userId, Date.now());
  const url = buildAuthUrl(state);

  if (ctx.req.method === 'GET') {
    ctx.res.redirect(302, url);
    return undefined;
  }

  return { url };
});
