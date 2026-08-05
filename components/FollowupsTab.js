import React, { useState, useEffect, useCallback } from "react";
import tokens from "../lib/designTokens";
import { crmApi, ApiError } from "../lib/crm/api";
import { Spinner, ErrorNote, UpgradeGate } from "./crm/ui";
import Followups from "./crm/Followups";
import SidePanel from "./crm/SidePanel";
import RelationshipDetail from "./crm/RelationshipDetail";

const c = tokens.colors;

/**
 * The Follow-ups tab.
 *
 * The same queue the CRM tab shows, given its own top-level tab because it is
 * the one screen a founder should be able to open, work down, and close. It
 * bootstraps stages and campaigns itself rather than taking them as props, so
 * the two entry points cannot fall out of sync.
 */
export default function FollowupsTab({ plan = "free" }) {
  const [boot, setBoot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gate, setGate] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async (quiet) => {
    if (!quiet) setLoading(true);
    setError(null);
    setGate(null);
    try {
      setBoot(await crmApi.get("/api/crm/bootstrap"));
    } catch (err) {
      // A 402 is the plan gate, not a failure — it earns an offer, not an error.
      if (err instanceof ApiError && err.status === 402) setGate(err);
      else setError(err instanceof ApiError ? err.message : "Failed to load your follow-ups");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setVersion(function (v) { return v + 1; });
    load(true);
  }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: c.text.primary,
            letterSpacing: "-0.5px",
            marginBottom: 4,
          }}
        >
          Follow-ups
        </h1>
        <p style={{ fontSize: 13, color: c.text.secondary, margin: 0 }}>
          Everyone you have pitched who has not written back, longest silence first.
        </p>
      </div>

      {loading && <Spinner label="Loading your follow-ups" />}

      {!loading && gate && (
        <UpgradeGate
          plan={gate.requiredPlan === "pro" ? "pro" : "starter"}
          title="Know who is waiting on you"
          body="The follow-up queue tracks every investor who has gone quiet, drafts the nudge, and sends it — so a raise never stalls because an email fell through the cracks."
        />
      )}

      {!loading && !gate && (error || !boot) && (
        <ErrorNote onRetry={() => load()}>{error || "Your follow-ups could not be loaded."}</ErrorNote>
      )}

      {!loading && !gate && boot && (
        <Followups
          key={version}
          stages={boot.stages}
          campaigns={boot.campaigns}
          onOpen={setOpenId}
          onChanged={refresh}
        />
      )}

      {openId && boot && (
        <SidePanel title="Investor" onClose={() => setOpenId(null)}>
          <RelationshipDetail
            id={openId}
            plan={plan}
            stages={boot.stages}
            onBack={() => setOpenId(null)}
            onChanged={refresh}
            embedded
          />
        </SidePanel>
      )}

      {/* Touch targets: the buttons are sized for a dense desktop toolbar, and
          lift to the 44px minimum wherever there is no mouse. */}
      <style jsx global>{`
        @media (hover: none) and (pointer: coarse) {
          .crm-btn {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
