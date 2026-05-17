import { Reveal } from '../hooks/useScrollReveal.jsx'

const KPIS = [
  {
    n: '$2,500+',
    u: '/ year',
    t: 'Access cost is too high for beginners',
    d: 'Most robotics tooling assumes enterprise budgets, not student or maker constraints.',
    glow: 'from-cyan-400/25 to-transparent',
  },
  {
    n: '30',
    u: 'min+',
    t: 'Setup overhead delays experimentation',
    d: 'Install chains and environment issues slow progress before testing a single task.',
    glow: 'from-violet-400/25 to-transparent',
  },
  {
    n: '0',
    u: '',
    t: 'No smooth sim-to-hardware bridge',
    d: 'Most simulators cannot ship deterministic code and parts lists for immediate builds.',
    glow: 'from-emerald-400/25 to-transparent',
  },
]

export default function Problem() {
  return (
    <section id="problem" className="relative py-32 z-10" style={{ background: '#070707' }}>
      <div className="max-w-[1100px] mx-auto px-8">
        <Reveal>
          <p className="micro-label font-bold uppercase text-zinc-300/90 mb-6 text-center">Problem Statement</p>
        </Reveal>


        <Reveal delay={1}>
          <div className="problem-quote-mirai text-center mb-10">
            <span className="problem-quote-mark-mirai">“</span>
            <h2
              className="font-black tracking-[-0.035em] leading-[1.08] text-zinc-50 mx-auto"
              style={{
                fontSize: 'clamp(1.35rem,3.2vw,2.25rem)',
                maxWidth: '38rem',
                letterSpacing: '-0.01em',
                marginBottom: '0.7em',
              }}
            >
              Robotics adoption is not failing because of ideas.
              <br />
              <span className="text-zinc-300/88">It is failing because access is expensive, complex, and slow.</span>
            </h2>
            <p className="small-copy text-zinc-100/82 mx-auto mt-4" style={{ maxWidth: '30rem', fontSize: 'clamp(0.92rem,1.1vw,1.08rem)' }}>
              Teams that want automation still hit steep tooling prices, setup friction, and weak pathways from simulation results to deployable robot behavior.
            </p>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div className="mb-5">
            <div className="text-[0.78rem] font-bold tracking-widest uppercase text-zinc-300/85 mb-2">Core Friction</div>
            <div className="text-[1.06rem] font-bold text-zinc-50 mb-2">The entry barrier is structural, not motivational.</div>
            <p className="small-copy text-zinc-100/82 max-w-4xl">
              The ecosystem makes it difficult for first-time builders to move from idea to validated motion workflow.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-5 border-t border-zinc-600/45">
          {KPIS.map((k, i) => (
            <Reveal key={k.t} delay={i + 3}>
              <div className="relative py-1">
                <div className="absolute top-0 left-0 h-[2px] w-16 bg-zinc-300/70" />
                <div className="pt-4">
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-[clamp(2rem,4.2vw,3rem)] font-black tracking-tight text-zinc-50">{k.n}</span>
                    {k.u ? <span className="text-zinc-300/85 text-[0.95rem] font-bold mb-1.5">{k.u}</span> : null}
                  </div>
                  <div className="text-[0.98rem] font-bold text-zinc-50 mb-2">{k.t}</div>
                  <div className="small-copy text-zinc-200/80">{k.d}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
