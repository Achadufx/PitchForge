import React, { useState, useEffect, useMemo, useCallback } from 'react';
import tokens from '@/lib/designTokens';
import { crmApi, ApiError } from '@/lib/crm/api';
import type { RelationshipCard, PipelineStage, Campaign, Plan } from '@/types/crm';
import { Spinner, ErrorNote, Button, Badge, TextInput, Select, EmptyState, hexWash } from '@/components/crm/ui';
import { relativeTime, wholeDaysSince, QUIET_AFTER_DAYS, NO_RESPONSE_AFTER_DAYS } from '@/lib/crm/stats';

const c = tokens.colors;

/**
 * The pipeline board.
 *
 * Cards drag between columns with the native HTML5 drag events — no library,
 * because a board with six columns does not need a dependency to move a div.
 * Touch gets its own path (a grip that tracks the finger via elementFromPoint),
 * since HTML5 drag-and-drop does not fire on touch screens at all.
 *
 * The per-card stage dropdown stays regardless. It is the keyboard route, the
 * screen-reader route, and the only sane way to move a card to a column that is
 * scrolled off the side of a phone — so it is not a fallback, it is the primary
 * control that dragging happens to shortcut.
 */

type ActivityFilter = 'all' | 'active_week' | 'quiet' | 'no_response';

const ACTIVITY_FILTERS: Array<{ key: ActivityFilter; label: string }> = [
  { key: 'all', label: 'All activity' },
  { key: 'active_week', label: 'Active this week' },
  { key: 'quiet', label: `Gone quiet (${QUIET_AFTER_DAYS}+ days)` },
  { key: 'no_response', label: `No response (${NO_RESPONSE_AFTER_DAYS}+ days)` },
];

export default function Pipeline({
  stages,
  campaigns,
  onOpen,
  onChanged,
}: {
  plan?: Plan;
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
  const [activity, setActivity] = useState<ActivityFilter>('all');
  const [moving, setMoving] = useState<string | null>(null);

  // Drag state. `dragId` fades the card being carried; `dropStageId` lights up
  // the column under the cursor so the drop target is never a guess.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropStageId, setDropStageId] = useState<string | null>(null);

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
    const now = Date.now();

    return rows.filter((row) => {
      if (term) {
        const match = [row.investor_firm, row.investor_contact, row.investor_email]
          .filter(Boolean)
          .some((field) => (field as string).toLowerCase().includes(term));
        if (!match) return false;
      }

      if (activity === 'all') return true;

      // Never contacted counts as silent, not as active: an investor with no
      // interaction at all is exactly who these filters exist to surface.
      const days = wholeDaysSince(row.last_interaction_at, now);
      if (activity === 'active_week') return days != null && days < QUIET_AFTER_DAYS;
      if (activity === 'quiet') return days == null || days >= QUIET_AFTER_DAYS;
      return days == null || days >= NO_RESPONSE_AFTER_DAYS;
    });
  }, [rows, search, activity]);

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

  const filtersActive = Boolean(search || campaignId || activity !== 'all');

  const move = useCallback(
    async (rowId: string, stageId: string) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row || stageId === row.stage_id) return;

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
    },
    [rows, stages, onChanged]
  );

  function endDrag() {
    setDragId(null);
    setDropStageId(null);
  }

  // --- Touch dragging -------------------------------------------------------
  // HTML5 drag events never fire on touch, so the grip tracks the finger and
  // asks the document what is underneath it. The grip carries touch-action:
  // none, which is what stops the page scrolling out from under the drag —
  // React's touchmove listener is passive, so preventDefault() would not.

  function onGripTouchStart(rowId: string) {
    setDragId(rowId);
    setDropStageId(null);
  }

  function onGripTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    const under = document.elementFromPoint(touch.clientX, touch.clientY);
    const column = under && (under as HTMLElement).closest('[data-stage-id]');
    setDropStageId(column ? column.getAttribute('data-stage-id') : null);
  }

  function onGripTouchEnd() {
    if (dragId && dropStageId) move(dragId, dropStageId);
    endDrag();
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
          placeholder="Search name, firm or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '2 1 200px', width: 'auto' }}
          aria-label="Search investors"
        />
        <Select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          style={{ flex: '1 1 150px', width: 'auto' }}
          aria-label="Filter by campaign"
        >
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>
        <Select
          value={activity}
          onChange={(e) => setActivity(e.target.value as ActivityFilter)}
          style={{ flex: '1 1 170px', width: 'auto' }}
          aria-label="Filter by activity"
        >
          {ACTIVITY_FILTERS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </Select>

        {filtersActive && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch('');
              setCampaignId('');
              setActivity('all');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {filtersActive && (
        <div style={{ fontSize: 12, color: c.text.muted, marginTop: -10, marginBottom: 14 }}>
          Showing {filtered.length} of {rows.length} investor{rows.length === 1 ? '' : 's'}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={filtersActive ? 'No matches' : 'No investors yet'}
          body={
            filtersActive
              ? 'Nothing in your pipeline matches those filters.'
              : 'Add investors to a campaign and they will appear here, grouped by stage.'
          }
          action={
            filtersActive ? (
              <Button
                onClick={() => {
                  setSearch('');
                  setCampaignId('');
                  setActivity('all');
                }}
              >
                Clear filters
              </Button>
            ) : undefined
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
            const isTarget = dropStageId === stage.id && dragId !== null;

            return (
              <div
                key={stage.id}
                data-stage-id={stage.id}
                onDragOver={(e) => {
                  // Without preventDefault the browser refuses the drop.
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dropStageId !== stage.id) setDropStageId(stage.id);
                }}
                onDragLeave={(e) => {
                  // Only clear when the pointer has actually left the column,
                  // not when it crosses onto a card inside it.
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropStageId((current) => (current === stage.id ? null : current));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain') || dragId;
                  if (id) move(id, stage.id);
                  endDrag();
                }}
                style={{
                  minWidth: 0,
                  borderRadius: tokens.radius.lg,
                  padding: 6,
                  margin: -6,
                  background: isTarget ? hexWash(stage.color, 0.1) : 'transparent',
                  outline: isTarget ? `2px dashed ${hexWash(stage.color, 0.45)}` : '2px dashed transparent',
                  transition: `background ${tokens.transitions.fast}`,
                }}
              >
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 60 }}>
                  {cards.map((row) => (
                    <div
                      key={row.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', row.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDragId(row.id);
                      }}
                      onDragEnd={endDrag}
                      style={{
                        background: c.bg.card,
                        border: `1px solid ${dragId === row.id ? stage.color : c.border.default}`,
                        borderRadius: tokens.radius.lg,
                        padding: 14,
                        cursor: 'grab',
                        // Transparency while carried, so the column underneath
                        // stays readable and the card reads as "in flight".
                        opacity: moving === row.id ? 0.55 : dragId === row.id ? 0.4 : 1,
                        transition: `opacity ${tokens.transitions.fast}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
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
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {row.investor_firm}
                        </button>

                        {/* The touch grip. `crm-grip` lifts it to 44px on
                            coarse pointers — it stays small on desktop, where
                            the whole card is already draggable and a 44px
                            handle would just be clutter. touch-action: none is
                            what stops dragging it from scrolling the board. */}
                        <span
                          role="button"
                          tabIndex={-1}
                          aria-hidden
                          className="crm-grip"
                          onTouchStart={() => onGripTouchStart(row.id)}
                          onTouchMove={onGripTouchMove}
                          onTouchEnd={onGripTouchEnd}
                          onTouchCancel={endDrag}
                          style={{
                            touchAction: 'none',
                            cursor: 'grab',
                            color: c.text.muted,
                            fontSize: 14,
                            lineHeight: 1,
                            padding: '4px 2px',
                            minWidth: 22,
                            minHeight: 22,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            userSelect: 'none',
                          }}
                        >
                          ⠿
                        </span>
                      </div>

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
                        onChange={(e) => move(row.id, e.target.value)}
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
                      {isTarget ? 'Drop here' : 'Empty'}
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
