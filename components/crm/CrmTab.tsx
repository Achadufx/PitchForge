import React, { useState, useEffect, useCallback } from 'react';
import tokens from '@/lib/designTokens';
import { crmApi, ApiError } from '@/lib/crm/api';
import type { PipelineStage, Campaign, CampaignStats, Plan } from '@/types/crm';
import { Spinner, ErrorNote, Button, UpgradeGate } from '@/components/crm/ui';
import Dashboard from '@/components/crm/Dashboard';
import Pipeline from '@/components/crm/Pipeline';
import Campaigns from '@/components/crm/Campaigns';
import RelationshipDetail from '@/components/crm/RelationshipDetail';

const c = tokens.colors;

interface Bootstrap {
  stages: PipelineStage[];
  campaigns: Campaign[];
  stats: CampaignStats[];
  totals: CampaignStats | null;
}

type View = 'dashboard' | 'pipeline' | 'campaigns';

const VIEWS: Array<{ key: View; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'campaigns', label: 'Campaigns' },
];

/**
 * The CRM tab.
 *
 * Bootstraps once and holds stages/campaigns for every child, because all three
 * views need the same two lists and refetching them per view would make tab
 * switches flicker. Children call `refresh` when they change something that the
 * shared lists depend on.
 */
export default function CrmTab({ plan = 'free' }: { plan?: Plan }) {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<ApiError | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [openId, setOpenId] = useState<string | null>(null);
  // Bumped to force the dashboard to refetch after a change elsewhere.
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGate(null);
    try {
      const res = await crmApi.get<Bootstrap>('/api/crm/bootstrap');
      setBoot(res);
    } catch (err) {
      // 402 is the plan gate, not a failure — it gets an offer, not an error.
      if (err instanceof ApiError && err.status === 402) setGate(err);
      else setError(err instanceof ApiError ? err.message : 'Failed to load your CRM');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
    load();
  }, [load]);

  if (loading) return <Spinner label="Loading your CRM" />;

  if (gate) {
    return (
      <UpgradeGate
        plan={(gate.requiredPlan as 'starter' | 'pro') || 'starter'}
        title="Track every investor conversation"
        body="The CRM keeps your pipeline, timeline and follow-ups in one place, so you always know who is waiting on you and who has gone quiet."
      />
    );
  }

  if (error || !boot) {
    return <ErrorNote onRetry={load}>{error || 'Your CRM could not be loaded.'}</ErrorNote>;
  }

  // The detail view replaces the whole tab rather than opening beside it: on a
  // phone there is no beside, and one layout is better than two that diverge.
  if (openId) {
    return (
      <RelationshipDetail
        id={openId}
        plan={plan}
        stages={boot.stages}
        onBack={() => setOpenId(null)}
        onChanged={refresh}
      />
    );
  }

  return (
    <div>
      <nav
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 22,
          borderBottom: `1px solid ${c.border.default}`,
          paddingBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        {VIEWS.map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={view === key ? 'primary' : 'ghost'}
            onClick={() => setView(key)}
          >
            {label}
          </Button>
        ))}
      </nav>

      {view === 'dashboard' && <Dashboard key={version} plan={plan} />}

      {view === 'pipeline' && (
        <Pipeline
          plan={plan}
          stages={boot.stages}
          campaigns={boot.campaigns}
          onOpen={setOpenId}
          onChanged={refresh}
        />
      )}

      {view === 'campaigns' && (
        <Campaigns campaigns={boot.campaigns} stats={boot.stats} onChanged={refresh} />
      )}

      {/* Touch targets. The buttons are sized for a dense desktop toolbar;
          on a touch screen every one of them lifts to the 44px minimum. */}
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
