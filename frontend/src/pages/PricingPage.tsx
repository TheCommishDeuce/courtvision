import { Link } from 'react-router-dom';

const ACCESS_TIERS = [
  {
    name: 'Self-serve',
    limit: '60/min · 5,000/day',
    cta: 'Create key',
    to: '/dev',
    features: ['Free REST access', 'Free MCP access', 'Usage dashboard', 'Key create/revoke controls'],
  },
  {
    name: 'Research',
    limit: '300/min · 100,000/day',
    cta: 'Manage keys',
    to: '/dev',
    features: ['Admin-granted higher limits', 'Notebook and agent workflows', 'Bulk analysis tolerance', 'Same endpoint access'],
  },
  {
    name: 'Local dev',
    limit: '3,000/min · 1,000,000/day',
    cta: 'Open portal',
    to: '/dev',
    features: ['Local testing tier', 'Load-test friendly', 'Manual admin assignment', 'Not intended for public keys'],
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-10">
      <section className="border-b border-[var(--rule)] pb-8">
        <div className="ba-kicker mb-4">CourtVision API</div>
        <h1 className="ba-display">API Access</h1>
        <p className="mt-5 max-w-2xl text-[16px] text-[var(--ink-2)] leading-relaxed">
          CourtVision is free to use with API keys, usage tracking, and rate limits to keep the service stable.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {ACCESS_TIERS.map(tier => (
          <article key={tier.name} className="ba-card flex flex-col min-h-[360px]">
            <div className="ba-kicker mb-3">{tier.limit}</div>
            <h2 className="ba-h2">{tier.name}</h2>
            <ul className="mt-6 divide-y divide-[var(--rule)]">
              {tier.features.map(feature => (
                <li key={feature} className="py-2 text-sm text-[var(--ink-2)]">{feature}</li>
              ))}
            </ul>
            <Link to={tier.to} className="ba-btn ba-btn-primary mt-auto justify-center">
              {tier.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="ba-card">
        <div className="ba-kicker mb-2">Service model</div>
        <p className="text-sm text-[var(--ink-2)] leading-relaxed">
          The public service is free. Authentication still matters because keys let users manage access, track usage, revoke compromised credentials, and limit abusive traffic.
        </p>
      </section>
    </div>
  );
}
