import React, { useState } from 'react';
import tokens from '@/lib/designTokens';
import { crmApi, ApiError } from '@/lib/crm/api';
import type { Campaign, CampaignStats, CampaignStatus } from '@/types/crm';
import {
  Card,
  Button,
  Badge,
  SectionTitle,
  Field,
  TextInput,
  TextArea,
  Select,
  EmptyState,
  ErrorNote,
  Modal,
} from '@/components/crm/ui';
import { relativeTime } from '@/lib/crm/stats';

const c = tokens.colors;

const STATUS_TONE: Record<CampaignStatus, string> = {
  active: c.status.success,
  paused: c.status.warning,
  closed: c.text.muted,
};

export default function Campaigns({
  campaigns,
  stats,
  onChanged,
}: {
  campaigns: Campaign[];
  stats: CampaignStats[];
  onChanged: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statsFor = (id: string) => stats.find((s) => s.campaign_id === id) || null;

  async function setStatus(campaign: Campaign, status: CampaignStatus) {
    setError(null);
    try {
      await crmApi.patch(`/api/crm/campaigns/${campaign.id}`, { status });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update that campaign');
    }
  }

  return (
    <div>
      <SectionTitle
        action={
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            New campaign
          </Button>
        }
      >
        Campaigns
      </SectionTitle>

      {error && <ErrorNote>{error}</ErrorNote>}

      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          body="A campaign is one raise — a seed round, a bridge. Investors and their stats group under it."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Create your first campaign
            </Button>
          }
        />
      ) : (
        campaigns.map((campaign) => {
          const stat = statsFor(campaign.id);
          return (
            <Card key={campaign.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: c.text.primary }}>{campaign.name}</span>
                    <Badge color={STATUS_TONE[campaign.status]}>{campaign.status}</Badge>
                  </div>
                  {campaign.goal && (
                    <p style={{ fontSize: 13, color: c.text.secondary, margin: '6px 0 0', lineHeight: 1.5 }}>
                      {campaign.goal}
                    </p>
                  )}
                  <div style={{ fontSize: 12, color: c.text.muted, marginTop: 8 }}>
                    {campaign.target_amount != null &&
                      `Target ${formatMoney(campaign.target_amount, campaign.currency)} · `}
                    {stat?.last_activity_at
                      ? `Last activity ${relativeTime(stat.last_activity_at)}`
                      : 'No activity yet'}
                  </div>
                </div>

                <Select
                  value={campaign.status}
                  onChange={(e) => setStatus(campaign, e.target.value as CampaignStatus)}
                  aria-label={`Status for ${campaign.name}`}
                  style={{ flex: '0 1 130px', width: 'auto', minWidth: 120 }}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </Select>
              </div>

              {stat && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                    gap: 12,
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: `1px solid ${c.border.default}`,
                  }}
                >
                  <Metric label="Investors" value={stat.total_investors} />
                  <Metric label="Emailed" value={stat.investors_emailed} />
                  <Metric label="Opened" value={stat.investors_opened} pct={stat.open_rate} />
                  <Metric label="Replied" value={stat.investors_replied} pct={stat.reply_rate} />
                  <Metric label="Met" value={stat.investors_met} pct={stat.meeting_rate} />
                  <Metric label="Invested" value={stat.investments} pct={stat.investment_rate} />
                  <Metric label="Passed" value={stat.passes} />
                  <Metric
                    label="Avg. reply"
                    value={
                      stat.avg_days_to_first_reply == null
                        ? '—'
                        : `${Number(stat.avg_days_to_first_reply)}d`
                    }
                  />
                </div>
              )}
            </Card>
          );
        })
      )}

      {creating && (
        <CreateCampaign
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function Metric({ label, value, pct }: { label: string; value: number | string; pct?: number }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: c.text.muted, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: c.text.primary }}>
        {value}
        {pct != null && pct > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: c.text.muted, marginLeft: 4 }}>{pct}%</span>
        )}
      </div>
    </div>
  );
}

function CreateCampaign({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [target, setTarget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await crmApi.post('/api/crm/campaigns', {
        name: name.trim(),
        goal: goal.trim() || null,
        target_amount: target || null,
        currency,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create that campaign');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New campaign" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seed round 2026"
            autoFocus
          />
        </Field>
        <Field label="Goal" hint="Optional — what this raise is for.">
          <TextArea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="18 months of runway to reach $1M ARR"
          />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}>
            <Field label="Target">
              <TextInput
                type="number"
                min="0"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="1500000"
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Currency">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="NGN">NGN</option>
              </Select>
            </Field>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Compact money for card headers: $1.5M, $250K, $900. */
function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    // An unrecognised currency code should not blank the card.
    return `${currency} ${amount.toLocaleString()}`;
  }
}
