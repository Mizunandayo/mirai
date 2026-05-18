import { Reveal } from '../hooks/useScrollReveal.jsx'

const STREAMS = [
  {
    n: '01',
    tag: 'Freemium SaaS',
    title: 'Free tier + Pro subscription',
    body: 'Free browser simulation for individuals and students. Pro plan ($19/mo) unlocks unlimited exports, custom robot presets, private task library, and priority AI generation.',
    stat: '$19',
    statSub: '/ month Pro tier',
    grad: 'from-cyan-400/20',
    dot: '#22d3ee',
  },
  {
    n: '02',
    tag: 'Enterprise Licensing',
    title: 'White-label API for platforms',
    body: 'License the simulation engine and export pipeline to OEMs, robotics training companies, and university labs. Volume pricing with SLA. Integration SDK included.',
    stat: 'B2B',
    statSub: 'volume licensing',
    grad: 'from-violet-400/20',
    dot: '#c084fc',
  },
  {
    n: '03',
    tag: 'Hardware Marketplace',
    title: 'Affiliate revenue on BOM kits',
    body: 'Every exported Bill of Materials links directly to curated hardware kits. Affiliate commissions on AliExpress and Amazon purchases. One click from simulation to checkout.',
    stat: '~$300',
    statSub: 'avg kit value',
    grad: 'from-emerald-400/20',
    dot: '#4ade80',
  },
]

export default function Revenue() {
  return (
    <section id="revenue" className="relative py-32 z-10" style={{ background: '#070707' }}>
      <div className="max-w-[1100px] mx-auto px-8">

        <Reveal>
          <p className="micro-label font-bold uppercase text-zinc-300/90 mb-5">Business Model</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="font-black tracking-[-0.04em] leading-none text-white mb-5"
              style={{ fontSize: 'clamp(2.4rem,5vw,4rem)' }}>
            Three clear revenue paths.<br/>
            <span className="text-zinc-300/55">Built into the product from day one.</span>
          </h2>
        </Reveal>
        <Reveal delay={2}>
          <p className="text-zinc-100/85 text-[1.03rem] leading-relaxed max-w-3xl mb-12">
            Mirai monetises at the individual, startup, and enterprise level simultaneously —
            each tier is a natural upgrade from the one before it.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STREAMS.map((s, i) => (
            <Reveal key={s.n} delay={i + 1}>
              <div className="rounded-2xl h-full relative overflow-hidden border border-zinc-500/45 bg-zinc-900/30 p-7 flex flex-col gap-5">
                {/* glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${s.grad} via-transparent to-transparent pointer-events-none`} />

                <div className="relative z-10 flex items-start justify-between">
                  <span className="text-[2.8rem] font-black tracking-[-0.07em] text-zinc-700/80 leading-none">{s.n}</span>
                  <span
                    className="text-[0.7rem] font-bold tracking-[0.12em] uppercase px-3 py-1 rounded-full border"
                    style={{ color: s.dot, borderColor: s.dot + '55', background: s.dot + '18' }}
                  >
                    {s.tag}
                  </span>
                </div>

                <div className="relative z-10 flex-1">
                  <div className="text-[1.04rem] font-bold text-zinc-50 mb-3">{s.title}</div>
                  <div className="small-copy text-zinc-200/80 leading-relaxed">{s.body}</div>
                </div>

                <div className="relative z-10 pt-4 border-t border-zinc-500/30">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[2rem] font-black tracking-[-0.06em] text-zinc-50 leading-none">{s.stat}</span>
                    <span className="text-[0.78rem] font-medium text-zinc-300/75">{s.statSub}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  )
}
