import { Reveal } from '../hooks/useScrollReveal.jsx'

const MODELS = [
  {
    badge:'Primary',  name:'gemini-2.5-flash', color:'#4285F4', tone:'from-cyan-500/20 via-blue-500/10 to-transparent',
    use:'Real-time planning · Voice · 5–15s',
    points:['25× faster than Vertex AI proxy', 'Native multimodal voice input', 'Free tier — no cloud credits needed'],
  },
  {
    badge:'Reasoning', name:'gemini-2.0-pro',   color:'#8E75B2', tone:'from-violet-500/20 via-indigo-500/10 to-transparent',
    use:'ReAct loop · Complex planning · NL arm',
    points:['Deep spatial constraint analysis', 'Think → Act → Observe streams live', '"1.2m reach, 500g" → full arm config'],
  },
  {
    badge:'Fallback',  name:'Auto chain',        color:'rgba(255,255,255,0.35)', tone:'from-amber-500/15 via-zinc-400/10 to-transparent',
    use:'Zero downtime during deprecations',
    chain:['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
  },
]

const USES = [
  { tone:'text-cyan-200 border-cyan-300/35 bg-cyan-400/16', icon:<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 10h14M10 3l7 7-7 7"/></svg>, title:'Motion generation', desc:'NL → TaskSpec via grounded prompt. Gemini never touches joint angles.' },
  { tone:'text-violet-200 border-violet-300/35 bg-violet-400/16', icon:<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="10" r="7"/><path d="M10 7v3l2 2"/></svg>, title:'ReAct loop (visible)', desc:'Think → Act → Observe streams live in the panel. Not a black box.' },
  { tone:'text-emerald-200 border-emerald-300/35 bg-emerald-400/16', icon:<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="7" y="2" width="6" height="10" rx="3"/><path d="M10 16v-3M5 11a5 5 0 0 0 10 0"/></svg>, title:'Voice input', desc:'Press mic → speak → arm moves in 15s. No keyboard required on stage.' },
  { tone:'text-amber-200 border-amber-300/35 bg-amber-400/16', icon:<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 6h14M3 10h10M3 14h7"/></svg>, title:'NL arm designer', desc:'"Arm reaching 1.2m, lifts 500g" → auto-configures segments + gripper.' },
]

export default function Gemini() {
  return (
    <section id="gemini" className="relative py-32 z-10 overflow-hidden" style={{ background:'#050505' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background:'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(66,133,244,0.06) 0%, transparent 70%)' }} />

      <div className="max-w-[1100px] mx-auto px-8 relative z-10">

        {/* Header */}
        <div className="flex flex-col items-center gap-8 mb-16">
          <Reveal>
            <img
              src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/google-gemini.svg"
              alt="Gemini Logo"
              style={{ width: '110px', height: '110px', display: 'block', margin: '0 auto', background: 'none', borderRadius: '0', boxShadow: 'none' }}
              draggable="false"
            />
          </Reveal>
          <Reveal><p className="micro-label font-bold uppercase text-zinc-300/90 mb-3 text-center">LLM Integration</p></Reveal>
          <Reveal delay={1}>
            <h2 className="font-black tracking-[-0.04em] leading-none text-white mb-3 text-center"
                style={{ fontSize:'clamp(2.4rem,5vw,4rem)' }}>
              Gemini is the<br/>
              <span style={{ color:'rgba(228,228,231,0.5)' }}>intelligence layer.</span>
            </h2>
          </Reveal>

        </div>
        <Reveal delay={2}>
          <p className="text-zinc-100/85 text-[1.03rem] leading-relaxed max-w-xl mx-auto text-center">
            Every motion plan flows through Gemini — intent, reasoning, voice, and confidence scoring.
            The deterministic verifier handles safety.
          </p>
        </Reveal>

        {/* Model cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {MODELS.map((m, i) => (
            <Reveal key={m.name} delay={i + 1}>
              <div className="glass-panel rounded-2xl p-0 h-full hover:border-zinc-300/45 transition-colors duration-300 overflow-hidden">
                <div className={`bg-gradient-to-br ${m.tone} p-4 border-b border-zinc-500/35`}>
                  <div className="text-[0.78rem] font-bold tracking-[0.1em] uppercase text-zinc-200/90 mb-2">{m.badge}</div>
                  <div className="flex items-center gap-2.5">
                    <img
                      src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/google-gemini.svg"
                      alt="Gemini"
                      style={{ width: 22, height: 22, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}
                      draggable="false"
                    />
                    <div className="text-[1.04rem] font-bold text-white tracking-tight">{m.name}</div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-[0.86rem] font-medium text-zinc-100/85 mb-4 leading-relaxed">{m.use}</div>

                  {m.points && (
                    <div className="flex flex-col gap-2">
                      {m.points.map(p => (
                        <div key={p} className="flex items-start gap-2 text-[0.84rem] text-zinc-100/82 leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-200/70 shrink-0 mt-2" />
                          {p}
                        </div>
                      ))}
                    </div>
                  )}

                  {m.chain && (
                    <div className="border border-zinc-400/35 rounded-xl p-3.5"
                         style={{ background:'rgba(39,39,42,0.45)' }}>
                      <div className="text-[0.76rem] font-bold tracking-[0.09em] uppercase text-zinc-300/75 mb-3">Priority order</div>
                      {m.chain.map((n, idx) => (
                        <div key={n}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${idx === 0 ? 'bg-green-400' : 'bg-white/22'}`} />
                            <span className={`font-mono text-[0.84rem] font-semibold ${idx === 0 ? 'text-zinc-100/95' : idx === 1 ? 'text-zinc-200/85' : 'text-zinc-300/80'}`}>{n}</span>
                          </div>
                          {idx < m.chain.length - 1 && <div className="text-[0.76rem] text-zinc-300/70 pl-4 mb-1.5">↓ on fallback</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* 4 use cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
          {USES.map((u, i) => (
            <Reveal key={u.title} delay={(i % 2) + 1}>
              <div className="glass-panel rounded-2xl p-5 flex items-start gap-4 hover:border-zinc-300/45 transition-colors duration-300">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${u.tone}`}>
                  {u.icon}
                </div>
                <div>
                  <div className="text-[0.96rem] font-bold text-zinc-50 mb-1">{u.title}</div>
                  <div className="small-copy text-zinc-100/85">{u.desc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* AI Results screenshot */}
        <Reveal delay={3}>
          <img
            src="/screenshots/airesults.png"
            alt="Mirai — AI Results panel: Gemini ReAct trace, Confidence %, Physics tab, Gate Debug"
            style={{
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              borderRadius: '0.75rem',
              border: '1px solid rgba(163,163,163,0.15)'
            }}
          />
        </Reveal>

      </div>
    </section>
  )
}
