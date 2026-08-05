import React, { useState, useEffect, useMemo, useCallback } from 'react';
import tokens from '@/lib/designTokens';
import { crmApi, ApiError } from '@/lib/crm/api';
import type { RelationshipCard, PipelineStage, Campaign, Plan } from '@/types/crm';
import { Spinner, ErrorNote, Button, Badge, TextInput, Select, EmptyState, hexWash } from '@/components/crm/ui';
import { relativeTime } from '@/lib/crm/stats';

const c = tokens.colors;

/**
 * The pipeline board.
 *
 * Stage moves use a dropdown on each card rather than drag-and-drop. Dragging is
 * the obvious gesture on a desktop board and unusable on the phone a founder
 * actually checks between meetings — and it needs a keyboard fallback anyway,
 * which is the dropdown. So the dropdown is the only implementation.
 */
export default function Pipeline({
  plan,
  stages,
  campaigns,
  onOpen,
  onChanged,
}: {
  plan: Plan;
  stages: PipelineStage[];
  campaigns: Campaign[];
  onOpen: (id: string) => void;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<RelationshipCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [moving, setMoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (campaignId) params.set('campaign_id', campaignId);
      const suffix = params.toString() ? `?${params}` : '';
      const res = await crmApi.get<{ relationships: RelationshipCard[] }>(`/api/crm/relationships${suffix}`);
      setRows(res.relationships);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  // Filtering is client-side because the board already holds every row it can
  // show. Round-tripping each keystroke would add latency to the one
  // interaction that has to feel immediate.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.investor_firm, row.investor_contact, row.investor_email]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(term))
    );
  }, [rows, search]);

  const byStage = useMemo(() => {
    const map = new Map<string, RelationshipCard[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const row of filtered) {
      const bucket = map.get(row.stage_id);
      if (bucket) bucket.push(row);
      else map.set(row.stage_id, [row]);
    }
    return map;
  }, [filtered, stages]);

  async function move(row: RelationshipCard, stageId: string) {
    if (stageId === row.stage_id) return;

    // Optimistic: the card jumps columns immediately and rolls back if the
    // write fails. A stage move that waits on the network feels broken even
    // when it succeeds.
    const previous = rows;
    setRows((current) =>
      current.map((r) =>
        r.id === row.id
          ? { ...r, stage_id: stageId, stage: stages.find((s) => s.id === stageId) || r.stage }
          : r
      )
    );
    setMoving(row.id);
    try {
      await crmApi.patch(`/api/crm/relationships/${row.id}`, { stage_id: stageId });
      onChanged?.();
    } catch (err) {
      setRows(previous);
      setError(err instanceof ApiError ? err.message : 'Could not move that investor');
    } finally {
      setMoving(null);
    }
  }

  if (loading) return <Spinner label="Loading pipeline" />;

  return (
    <div>
      {error && <ErrorNote onRetry={load}>{error}</ErrorNote>}

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextInput
          placeholder="Search investors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '2 1 200px', width: 'auto' }}
          aria-label="Search investors"
        />
        <Select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          style={{ flex: '1 1 160px', width: 'auto' }}
          aria-label="Filter by campaign"
        >
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matches' : 'No investors yet'}
          body={
            search
              ? 'Nothing in your pipeline matches that search.'
              : 'Add investors to a campaign and they will appear here, grouped by stage.'
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${stages.length}, minmax(240px, 1fr))`,
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {stages.map((stage) => {
            const cards = byStage.get(stage.id) || [];
            return (
              <div key={stage.id} style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 2px 10px',
                    borderBottom: `2px solid ${stage.color}`,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: c.text.primary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {stage.name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: c.text.muted,
                      background: hexWash(stage.color, 0.12),
                      borderRadius: tokens.radius.full,
                      padding: '1px 8px',
                      marginLeft: 'auto',
                    }}
                  >
                    {cards.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cards.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        background: c.bg.card,
                        border: `1px solid ${c.border.default}`,
                        borderRadius: tokens.radius.lg,
                        padding: 14,
                        opacity: moving === row.id ? 0.55 : 1,
                        transition: `opacity ${tokens.transitions.fast}`,
                      }}
                    >
                      <button
                        onClick={() => onOpen(row.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          font: 'inherit',
                          color: c.text.primary,
                          fontSize: 14,
                          fontWeight: 700,
                          width: '100%',
                        }}
                      >
                        {row.investor_firm}
                      </button>

                      {row.investor_contact && (
                        <div style={{ fontSize: 12, color: c.text.secondary, marginTop: 3 }}>
                          {row.investor_contact}
                        </div>
                      )}

                      {row.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                          {row.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      )}

                      <div style={{ fontSize: 11, color: c.text.muted, marginTop: 8 }}>
                        {row.last_interaction_at
                          ? `Last contact ${relativeTime(row.last_interaction_at)}`
                          : 'Not contacted yet'}
                      </div>

                      <Select
                        value={row.stage_id}
                        disabled={moving === row.id}
                        onChange={(e) => move(row, e.target.value)}
                        aria-label={`Stage for ${row.investor_firm}`}
                        style={{ marginTop: 10, fontSize: 13, padding: '6px 8px' }}
                      >
                        {stages.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))}

                  {cards.length === 0 && (
                    <div
                      style={{
                        border: `1px dashed ${c.border.default}`,
                        borderRadius: tokens.radius.lg,
                        padding: '18px 12px',
                        textAlign: 'center',
                        fontSize: 12,
                        color: c.text.muted,
                      }}
                    >
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
