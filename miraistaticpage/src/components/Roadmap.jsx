import { Reveal } from '../hooks/useScrollReveal.jsx'

const PHASES = [
  {
    phase: 'Phase 1',
    when: 'Now — Live',
    color: '#4ade80',
    border: 'rgba(74,222,128,0.3)',
    bg: 'rgba(74,222,128,0.06)',
    title: 'Browser simulator + hardware export',
    items: [
      'Full 6-step pipeline live on Vercel',
      '60fps Rapier physics + MuJoCo server validation',
      'Gemini voice-to-motion in 5–15 seconds',
      '11 community tasks · 3 real robot presets (UR5, KUKA, ABB)',
      'SHA-256 signed Arduino / Python / URDF / BOM export',
    ],
  },
  {
    phase: 'Phase 2',
    when: '6 months',
    color: '#60a5fa',
    border: 'rgba(96,165,250,0.3)',
    bg: 'rgba(96,165,250,0.06)',
    title: 'WebSerial live control + mobile',
    items: [
      'Browser → USB → real servo moves on stage (WebSerial API)',
      'iOS / Android companion app for on-site teach mode',
      'Expanded preset library — 20+ robot models',
      'GIF / MP4 simulation export for sharing',
      'Pro subscription tier launch',
    ],
  },
  {
    phase: 'Phase 3',
    when: '12 months',
    color: '#c084fc',
    border: 'rgba(192,132,252,0.3)',
    bg: 'rgba(192,132,252,0.06)',
    title: 'Fleet coordination + enterprise',
    items: [
      'Multi-arm coordination — choreograph fleets in one session',
      'Enterprise SSO, private task libraries, audit logs',
      'LMS integration for robotics curricula (Canvas, Moodle)',
      'Marketplace for community-built robot presets and tasks',
      'White-label SDK for OEM and university licensing',
    ],
  },
]

export default function Roadmap() {
  return (
    <section id="roadmap" className="relative py-32 z-10 overflow-hidden" style={{ background: '#050505' }}>

      {/* subtle radial */}
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
          <p className="text-zinc-100/85 text-[1.03rem] leading-relaxed max-w-3xl mb-12">
            Mirai is live on day one. The architecture is designed to scale from a single browser tab
            to a fleet-management platform for enterprise robotics teams.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">

          {/* connecting line behind cards */}
          <div className="hidden md:block absolute top-[44px] left-[calc(16.67%+8px)] right-[calc(16.67%+8px)] h-px"
               style={{ background: 'linear-gradient(90deg, rgba(74,222,128,0.4) 0%, rgba(96,165,250,0.4) 50%, rgba(192,132,252,0.4) 100%)' }} />

          {PHASES.map((p, i) => (
            <Reveal key={p.phase} delay={i + 1}>
              <div className="rounded-2xl h-full border p-7 flex flex-col gap-5 relative"
                   style={{ borderColor: p.border, background: p.bg }}>

                {/* phase dot + connector */}
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 relative z-10"
                       style={{ background: p.color, borderColor: p.color, boxShadow: `0 0 12px ${p.color}88` }} />
                  <div>
                    <div className="text-[0.7rem] font-bold tracking-[0.12em] uppercase"
                         style={{ color: p.color }}>{p.phase}</div>
                    <div className="text-[0.72rem] font-medium text-zinc-300/70">{p.when}</div>
                  </div>
                </div>

                <div>
                  <div className="text-[1.04rem] font-bold text-zinc-50 mb-4">{p.title}</div>
                  <ul className="flex flex-col gap-2.5">
                    {p.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <svg className="flex-shrink-0 mt-[3px]" width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5.5" stroke={p.color} strokeWidth="1" strokeOpacity="0.5"/>
                          <path d="M3.5 6 5 7.5 8.5 4" stroke={p.color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-[0.78rem] text-zinc-200/80 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* impact summary */}
        <Reveal delay={4}>
          <div className="mt-10 rounded-2xl p-7 border border-zinc-500/35 bg-zinc-900/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-[0.7rem] font-bold tracking-[0.12em] uppercase text-zinc-300/70 mb-2">Scalability</div>
                <div className="text-[0.92rem] font-bold text-zinc-50 mb-1">Stateless + serverless-ready</div>
                <div className="small-copy text-zinc-200/75">Rapier runs in the browser — no server per user. Railway backend scales horizontally. Vercel CDN handles global traffic.</div>
              </div>
              <div>
                <div className="text-[0.7rem] font-bold tracking-[0.12em] uppercase text-zinc-300/70 mb-2">Impact</div>
                <div className="text-[0.92rem] font-bold text-zinc-50 mb-1">From idea to real hardware in one session</div>
                <div className="small-copy text-zinc-200/75">Every simulation produces deployable code. The gap between "I want to build a robot" and "I have running hardware" collapses to minutes.</div>
              </div>
              <div>
                <div className="text-[0.7rem] font-bold tracking-[0.12em] uppercase text-zinc-300/70 mb-2">Moat</div>
                <div className="text-[0.92rem] font-bold text-zinc-50 mb-1">Data flywheel via community library</div>
                <div className="small-copy text-zinc-200/75">Every task imported, refined, and re-shared trains a richer library. Network effects increase value per user as the community grows.</div>
              </div>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  )
}
