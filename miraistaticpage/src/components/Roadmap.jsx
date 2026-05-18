import { Reveal } from '../hooks/useScrollReveal.jsx'

const PHASES = [
  {
    num: '1',
    phase: 'Phase 1',
    when: 'Now — Live',
    color: '#4ade80',
    border: 'rgba(74,222,128,0.32)',
    bg: 'rgba(74,222,128,0.07)',
    glow: 'rgba(74,222,128,0.7)',
    done: true,
    title: 'Browser simulator + hardware export',
    items: [
      '60fps Rapier client-side physics + MuJoCo server validation',
      'Gemini 2.5 Flash voice-to-motion in 5–15 seconds',
      '11 community tasks · 3 real robot presets (UR5, KUKA, ABB)',
      'SHA-256 signed Arduino / Python / URDF / BOM ZIP export',
      'Vercel frontend + Railway backend — live today',
    ],
  },
  {
    num: '2',
    phase: 'Phase 2',
    when: '6 months',
    color: '#60a5fa',
    border: 'rgba(96,165,250,0.32)',
    bg: 'rgba(96,165,250,0.07)',
    glow: 'rgba(96,165,250,0.65)',
    done: false,
    title: 'WebSerial live control + mobile app',
    items: [
      'Browser → USB → real servo moves on stage (WebSerial API)',
      'iOS / Android companion app for on-site teach mode',
      'Expanded preset library — 20+ robot models',
      'GIF / MP4 simulation export for social sharing',
      'Pro subscription tier launch ($19/mo)',
    ],
  },
  {
    num: '3',
    phase: 'Phase 3',
    when: '12 months',
    color: '#c084fc',
    border: 'rgba(192,132,252,0.32)',
    bg: 'rgba(192,132,252,0.07)',
    glow: 'rgba(192,132,252,0.65)',
    done: false,
    title: 'Fleet coordination + enterprise platform',
    items: [
      'Multi-arm coordination — choreograph fleets in one session',
      'Enterprise SSO, private task libraries, audit logs',
      'LMS integration for robotics curricula (Canvas, Moodle)',
      'Community marketplace for robot presets and tasks',
      'White-label SDK for OEM and university licensing',
    ],
  },
]

const IMPACT = [
  {
    label: 'Scalability',
    color: '#4ade80',
    title: 'Stateless + serverless-ready',
    body: 'Rapier runs in the browser — no server per user. Railway backend scales horizontally. Vercel CDN handles global traffic.',
  },
  {
    label: 'Impact',
    color: '#60a5fa',
    title: 'Idea to hardware in one session',
    body: 'Every simulation produces deployable code and a live-priced bill of materials. The gap from "I want to build a robot" to "I have running hardware" collapses to minutes.',
  },
  {
    label: 'Moat',
    color: '#c084fc',
    title: 'Community library data flywheel',
    body: 'Every task imported, refined, and re-shared enriches the library. Network effects increase value per user as the community grows.',
  },
]

export default function Roadmap() {
  return (
    <section id="roadmap" className="relative py-32 z-10 overflow-hidden" style={{ background: '#050505' }}>
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.025) 0%, transparent 70%)' }} />

      <div className="max-w-[1100px] mx-auto px-8 relative z-10">

        <Reveal>
          <p className="micro-label font-bold uppercase text-zinc-300/90 mb-5">Future Prospects</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="font-black tracking-[-0.04em] leading-none text-white mb-5"
              style={{ fontSize: 'clamp(2.4rem,5vw,4rem)' }}>
            Scalability &amp; impact roadmap.<br/>
            <span className="text-zinc-300/55">From demo to platform.</span>
          </h2>
        </Reveal>
        <Reveal delay={2}>
          <p className="text-zinc-100/85 text-[1.03rem] leading-relaxed max-w-3xl mb-14">
            Mirai is live on day one. The architecture is designed to scale from a single browser tab
            to a fleet-management platform serving enterprise robotics teams globally.
          </p>
        </Reveal>

        {/* Horizontal timeline + phase cards */}
        <Reveal delay={3}>
          <div className="relative mb-6">
            {/* Timeline track */}
            <div className="relative flex items-start justify-between mb-8">
              {/* Connecting gradient line */}
              <div
                className="absolute hidden md:block"
                style={{
                  top: 20, left: 'calc(16.5% + 4px)', right: 'calc(16.5% + 4px)',
                  height: 2,
                  background: 'linear-gradient(90deg, #4ade80 0%, #60a5fa 50%, #c084fc 100%)',
                  zIndex: 1,
                }}
              />

              {PHASES.map((p) => (
                <div key={p.phase} className="flex flex-col items-center gap-3" style={{ flex: 1 }}>
                  {/* Phase node */}
                  <div
                    className="relative z-10 flex items-center justify-center rounded-full font-black"
                    style={{
                      width: 40, height: 40,
                      background: p.done ? p.color : '#111',
                      border: `2px solid ${p.color}`,
                      boxShadow: `0 0 22px ${p.glow}`,
                      color: p.done ? '#050505' : p.color,
                      fontSize: '1rem',
                    }}
                  >
                    {p.done ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#050505" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3.5 9l4 4 7-7"/>
                      </svg>
                    ) : p.num}
                  </div>
                  <div className="text-center">
                    <div className="text-[0.64rem] font-bold tracking-[0.14em] uppercase" style={{ color: p.color }}>{p.phase}</div>
                    <div className="text-[0.68rem] font-medium text-zinc-300/60">{p.when}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Phase cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PHASES.map((p, i) => (
                <div
                  key={p.phase}
                  className="rounded-2xl p-6 flex flex-col gap-4"
                  style={{ border: `1px solid ${p.border}`, background: p.bg }}
                >
                  <div className="text-[1rem] font-bold text-zinc-50">{p.title}</div>
                  <ul className="flex flex-col gap-2.5">
                    {p.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <svg className="flex-shrink-0 mt-[3px]" width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <circle cx="6.5" cy="6.5" r="6" stroke={p.color} strokeWidth="1" strokeOpacity="0.5"/>
                          <path d="M4 6.5 5.5 8 9 4.5" stroke={p.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-[0.78rem] text-zinc-200/78 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Impact summary */}
        <Reveal delay={4}>
          <div className="rounded-2xl border border-zinc-500/35 bg-zinc-900/30 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-500/30">
              {IMPACT.map((item) => (
                <div key={item.label} className="p-7">
                  <div
                    className="text-[0.65rem] font-bold tracking-[0.14em] uppercase mb-3"
                    style={{ color: item.color }}
                  >
                    {item.label}
                  </div>
                  <div className="text-[0.96rem] font-bold text-zinc-50 mb-2">{item.title}</div>
                  <div className="small-copy text-zinc-200/75 leading-relaxed">{item.body}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  )
}
