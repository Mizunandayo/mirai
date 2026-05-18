import { Reveal } from '../hooks/useScrollReveal.jsx'

const STREAMS = [
  {
    n: '01',
    tag: 'Freemium SaaS',
    color: '#22d3ee',
    border: 'rgba(34,211,238,0.3)',
    bg: 'rgba(34,211,238,0.07)',
    headerBg: 'linear-gradient(135deg,rgba(34,211,238,0.2) 0%,rgba(34,211,238,0.06) 100%)',
    title: 'Free tier + Pro subscription',
    body: 'Free browser simulation for individuals and students. Pro plan ($19/mo) unlocks unlimited exports, custom robot presets, private task library, and priority AI generation.',
    stat: '$19',
    statSub: '/ month Pro tier',
    bullets: [
      'Free — full simulation, 3 exports/month',
      'Pro $19/mo — unlimited exports + private library',
      'Students & makers capture starts immediately',
    ],
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        <path d="M12 6v6l4 2"/>
        <path d="M8 12h4"/>
      </svg>
    ),
  },
  {
    n: '02',
    tag: 'Enterprise Licensing',
    color: '#c084fc',
    border: 'rgba(192,132,252,0.3)',
    bg: 'rgba(192,132,252,0.07)',
    headerBg: 'linear-gradient(135deg,rgba(192,132,252,0.2) 0%,rgba(192,132,252,0.06) 100%)',
    title: 'White-label API for platforms',
    body: 'License the simulation engine and export pipeline to OEMs, robotics training companies, and university labs. Volume pricing with SLA. Full integration SDK included.',
    stat: 'B2B',
    statSub: 'volume licensing',
    bullets: [
      'OEMs & robotics training platform licensing',
      'University labs with full integration SDK',
      'White-label — your brand, Mirai engine',
    ],
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    n: '03',
    tag: 'Hardware Marketplace',
    color: '#fbbf24',
    border: 'rgba(251,191,36,0.3)',
    bg: 'rgba(251,191,36,0.07)',
    headerBg: 'linear-gradient(135deg,rgba(251,191,36,0.2) 0%,rgba(251,191,36,0.06) 100%)',
    title: 'Affiliate revenue on BOM kits',
    body: 'Every exported Bill of Materials links directly to curated hardware kits on AliExpress and Amazon. Affiliate commissions on every purchase. One click from simulation to checkout.',
    stat: '~$300',
    statSub: 'avg kit value',
    bullets: [
      'Every export is a purchase intent signal',
      'AliExpress + Amazon affiliate commissions',
      'Curated kits — sim to checkout in one click',
    ],
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
]

export default function Revenue() {
  return (
    <section id="revenue" className="relative py-32 z-10 overflow-hidden" style={{ background: '#070707' }}>
      {/* subtle top glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 55% 35% at 50% 0%, rgba(251,191,36,0.06) 0%, transparent 70%)' }} />

      <div className="max-w-[1100px] mx-auto px-8 relative z-10">

        <Reveal>
          <p className="micro-label font-bold uppercase text-zinc-300/90 mb-5">Business Model</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="font-black tracking-[-0.04em] leading-none text-white mb-5"
              style={{ fontSize: 'clamp(2.4rem,5vw,4rem)' }}>
            Three clear revenue streams.<br/>
            <span className="text-zinc-300/55">Built into the product from day one.</span>
          </h2>
        </Reveal>
        <Reveal delay={2}>
          <p className="text-zinc-100/85 text-[1.03rem] leading-relaxed max-w-3xl mb-14">
            Mirai monetises at the individual, startup, and enterprise level simultaneously.
            Each tier is a natural upgrade path from the one before it.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STREAMS.map((s, i) => (
            <Reveal key={s.n} delay={i + 1}>
              <div
                className="rounded-2xl h-full overflow-hidden flex flex-col"
                style={{ border: `1px solid ${s.border}`, background: '#0a0a0e' }}
              >
                {/* Colored header area */}
                <div style={{ background: s.headerBg, borderBottom: `1px solid ${s.border}`, padding: '24px 24px 20px' }}>
                  <div className="flex items-start justify-between mb-4">
                    {/* Icon */}
                    <div
                      className="rounded-xl flex items-center justify-center"
                      style={{
                        width: 52, height: 52,
                        background: `${s.color}22`,
                        border: `1px solid ${s.border}`,
                      }}
                    >
                      {s.icon}
                    </div>
                    {/* Big stat */}
                    <div className="text-right">
                      <div className="font-black leading-none" style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', letterSpacing: '-0.05em', color: s.color }}>{s.stat}</div>
                      <div className="text-[0.68rem] font-600 mt-1" style={{ color: `${s.color}99` }}>{s.statSub}</div>
                    </div>
                  </div>
                  {/* Tag + title */}
                  <div className="text-[0.62rem] font-bold tracking-[0.14em] uppercase mb-2" style={{ color: s.color }}>{s.n} — {s.tag}</div>
                  <div className="text-[1.06rem] font-bold text-zinc-50 leading-snug">{s.title}</div>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-5 flex-1">
                  <p className="text-[0.82rem] text-zinc-200/78 leading-relaxed">{s.body}</p>

                  <div className="flex flex-col gap-2.5 mt-auto">
                    {s.bullets.map((b, j) => (
                      <div key={j} className="flex items-start gap-2.5">
                        <svg className="flex-shrink-0 mt-[3px]" width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5.5" stroke={s.color} strokeWidth="1" strokeOpacity="0.5"/>
                          <path d="M3.5 6 5 7.5 8.5 4" stroke={s.color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-[0.76rem] text-zinc-200/75 leading-relaxed">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Conversion flow */}
        <Reveal delay={4}>
          <div className="mt-8 rounded-2xl p-6 border border-zinc-500/35 bg-zinc-900/30">
            <div className="text-[0.68rem] font-bold tracking-[0.12em] uppercase text-zinc-300/70 mb-4">Monetisation path — natural upgrade journey</div>
            <div className="flex items-center gap-0 overflow-auto">
              {[
                { label: 'Free user', color: '#22d3ee', sub: 'Sim + explore' },
                { label: 'Pro subscriber', color: '#c084fc', sub: '$19/mo' },
                { label: 'Hardware buyer', color: '#fbbf24', sub: 'BOM kit purchase' },
                { label: 'Enterprise contract', color: '#4ade80', sub: 'Volume licensing' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-0 min-w-0">
                  <div className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border" style={{ borderColor: `${step.color}40`, background: `${step.color}10`, minWidth: 140 }}>
                    <div className="text-[0.82rem] font-bold text-zinc-50">{step.label}</div>
                    <div className="text-[0.68rem] font-medium" style={{ color: step.color }}>{step.sub}</div>
                  </div>
                  {i < 3 && (
                    <div className="flex items-center px-2 flex-shrink-0">
                      <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
                        <path d="M0 6h17M13 1l6 5-6 5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  )
}
