import { Reveal } from '../hooks/useScrollReveal.jsx'

const SEGMENTS = [
  {
    key: 'TAM',
    value: '$18B',
    title: 'Global enterprise robotics and training opportunity',
    body: 'Large organizations validating automation workflows before physical deployment.',
    grad: 'from-cyan-400/22',
  },
  {
    key: 'SAM',
    value: '$2.4B',
    title: 'Simulation-first education and prototyping segment',
    body: 'Teams needing browser-first robotics planning and validation.',
    grad: 'from-violet-400/22',
  },
  {
    key: 'SOM',
    value: '2M+',
    title: 'Immediate makers, students, and indie builders',
    body: 'Users who can adopt now because Mirai removes setup and cost barriers.',
    grad: 'from-emerald-400/22',
  },
]

const FIT = [
  {
    title: 'Students & Makers',
    copy: 'Learn and build in one flow: task design, simulation, and export without local setup.',
    grad: 'from-cyan-400/24',
  },
  {
    title: 'Robotics Startups',
    copy: 'Pressure-test feasibility and motion plans before committing to expensive hardware.',
    grad: 'from-violet-400/24',
  },
  {
    title: 'Enterprise Teams',
    copy: 'Train operators and validate high-frequency workflows before procurement.',
    grad: 'from-emerald-400/24',
  },
]

export default function Market() {
  return (
    <section id="market" className="relative py-32 z-10 overflow-hidden" style={{ background: '#050505' }}>
      <div className="max-w-[1100px] mx-auto px-8">
        <Reveal>
          <p className="micro-label font-bold uppercase text-zinc-300/90 mb-5">Target Market</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="font-black tracking-[-0.04em] leading-none text-white mb-5" style={{ fontSize: 'clamp(2.4rem,5vw,4rem)' }}>
            TAM · SAM · SOM<br />
            <span className="text-zinc-300/88">A nested market strategy with immediate capture potential.</span>
          </h2>
        </Reveal>
        <Reveal delay={2}>
          <p className="text-zinc-100/85 text-[1.03rem] leading-relaxed max-w-3xl mb-9">
            Mirai enters through high-velocity individual users, expands through startup prototyping,
            and scales into enterprise enablement and operator training.
          </p>
        </Reveal>

        <Reveal delay={3}>
          <div className="mb-10 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <div className="relative min-h-[30rem] flex items-center justify-center">
              <div
                className="absolute bottom-3 w-[28rem] h-[24rem]"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                  background:
                    'linear-gradient(180deg, rgba(34,211,238,0.2) 0%, rgba(139,92,246,0.16) 58%, rgba(16,185,129,0.2) 100%)',
                  border: '1px solid rgba(161,161,170,0.42)',
                  boxShadow: '0 22px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
              />

              <div className="absolute bottom-3 w-[22rem] h-px bg-zinc-200/45" />
              <div className="absolute bottom-[7.25rem] w-[16rem] h-px bg-zinc-200/45" />
              <div className="absolute bottom-[12rem] w-[9.25rem] h-px bg-zinc-200/45" />

              <div className="absolute bottom-[12.5rem] left-1/2 -translate-x-1/2 text-center">
                <div className="text-[0.74rem] font-bold tracking-widest uppercase text-zinc-100/92">SOM</div>
                <div className="text-[1.55rem] font-black tracking-tight text-zinc-50">2M+</div>
              </div>
              <div className="absolute bottom-[7.7rem] left-1/2 -translate-x-1/2 text-center">
                <div className="text-[0.74rem] font-bold tracking-widest uppercase text-zinc-100/92">SAM</div>
                <div className="text-[1.55rem] font-black tracking-tight text-zinc-50">$2.4B</div>
              </div>
              <div className="absolute bottom-[3rem] left-1/2 -translate-x-1/2 text-center">
                <div className="text-[0.74rem] font-bold tracking-widest uppercase text-zinc-100/92">TAM</div>
                <div className="text-[1.55rem] font-black tracking-tight text-zinc-50">$18B</div>
              </div>

              <span className="absolute top-[4.5rem] left-[48%] w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
              <span className="absolute top-[9.5rem] left-[29%] w-3 h-3 rounded-full bg-violet-300 shadow-[0_0_15px_rgba(196,181,253,0.85)]" />
              <span className="absolute top-[14rem] left-[66%] w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,0.9)]" />
            </div>

            <div className="space-y-6">
              {SEGMENTS.map((s) => (
                <div key={s.key} className="relative pl-5">
                  <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-linear-to-b from-zinc-300/75 via-zinc-300/35 to-transparent" />
                  <div className="flex items-baseline justify-between gap-4 mb-1.5">
                    <span className="text-[0.82rem] font-bold tracking-widest uppercase text-zinc-200/92">{s.key}</span>
                    <span className="text-[1.06rem] font-black tracking-tight text-zinc-50">{s.value}</span>
                  </div>
                  <div className="text-[1.03rem] font-bold text-zinc-50 mb-1.5">{s.title}</div>
                  <div className="text-[0.88rem] text-zinc-200/84 leading-relaxed">{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FIT.map((entry, i) => (
            <Reveal key={entry.title} delay={i + 1}>
              <div className="rounded-2xl p-5 h-full relative overflow-hidden border border-zinc-500/45 bg-zinc-900/30">
                <div className={`absolute inset-0 bg-linear-to-br ${entry.grad} via-transparent to-transparent pointer-events-none`} />
                <div className="relative z-10">
                  <div className="text-[1.02rem] font-bold text-zinc-50 mb-2">{entry.title}</div>
                  <div className="small-copy text-zinc-100/85">{entry.copy}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
