import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════
   PrepPal — Obsidian Intelligence Terminal
   Deep black + electric gold + emerald accents
   Voice recording, question cards, AI feedback
   ═══════════════════════════════════════════════════════════ */

const C = {
  void:        "#050709",
  obsidian:    "#090C0F",
  obsidianMid: "#0D1117",
  obsidianLight:"#131920",
  glass:       "rgba(255,255,255,0.03)",
  glassMid:    "rgba(255,255,255,0.05)",
  glassHigh:   "rgba(255,255,255,0.09)",
  border:      "rgba(255,255,255,0.06)",
  borderMid:   "rgba(255,255,255,0.10)",
  borderHigh:  "rgba(255,255,255,0.18)",
  gold:        "#C9A84C",
  goldDim:     "#9A7A2A",
  goldBright:  "#E8C86A",
  goldGlow:    "rgba(201,168,76,0.20)",
  goldTrace:   "rgba(201,168,76,0.07)",
  goldFaint:   "rgba(201,168,76,0.04)",
  ice:         "#FFFFFF",
  iceOff:      "rgba(255,255,255,0.85)",
  iceMid:      "rgba(255,255,255,0.50)",
  iceDim:      "rgba(255,255,255,0.28)",
  iceFaint:    "rgba(255,255,255,0.10)",
  sage:        "#3D9E6A",
  sageDim:     "rgba(61,158,106,0.14)",
  sageBorder:  "rgba(61,158,106,0.28)",
  amber:       "#D4860A",
  amberDim:    "rgba(212,134,10,0.12)",
  amberBorder: "rgba(212,134,10,0.28)",
  crimson:     "#C03030",
  crimsonDim:  "rgba(192,48,48,0.12)",
  crimsonBorder:"rgba(192,48,48,0.28)",
  serif:       "'Cormorant Garamond', Georgia, serif",
  mono:        "'DM Mono', monospace",
  sans:        "'Plus Jakarta Sans', system-ui, sans-serif",
};

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

const QUESTION_TYPES = [
  { id:"behavioral",  label:"Behavioural"  },
  { id:"technical",   label:"Technical"    },
  { id:"situational", label:"Situational"  },
  { id:"culture",     label:"Culture Fit"  },
];

function scoreColor(s) { return s >= 7 ? C.sage : s >= 5 ? C.amber : C.crimson; }
function diffColor(d)  { return d === "easy" ? C.sage : d === "hard" ? C.crimson : C.amber; }
function diffBorder(d) { return d === "easy" ? C.sageBorder : d === "hard" ? C.crimsonBorder : C.amberBorder; }
function diffBg(d)     { return d === "easy" ? C.sageDim : d === "hard" ? C.crimsonDim : C.amberDim; }

/* ── Tag ── */
function Tag({ children, color, bg, border }) {
  return <span style={{ display:"inline-block", background:bg||C.glassMid, color:color||C.iceDim, border:`1px solid ${border||C.border}`, borderRadius:4, fontSize:9, padding:"3px 10px", fontFamily:C.mono, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>{children}</span>;
}

/* ── Key ── */
function Key({ children }) {
  return <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"2px 7px", background:C.glassMid, border:`1px solid ${C.borderMid}`, borderRadius:4, fontSize:9, fontFamily:C.mono, color:C.iceDim, boxShadow:`inset 0 -1px 0 ${C.border}` }}>{children}</span>;
}

/* ── Section card ── */
function Card({ children, accent, style={} }) {
  return (
    <div style={{ background:C.glass, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden", position:"relative", ...style }}>
      {accent && <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg, ${accent}, transparent)` }}/>}
      {children}
    </div>
  );
}

export default function PrepPal() {
  const [jd, setJd]                     = useState("");
  const [role, setRole]                 = useState("");
  const [level, setLevel]               = useState("fresher");
  const [selectedTypes, setSelectedTypes] = useState(["behavioral","situational"]);
  const [questions, setQuestions]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [activeQ, setActiveQ]           = useState(null);
  const [userAnswer, setUserAnswer]     = useState("");
  const [feedback, setFeedback]         = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [step, setStep]                 = useState("input");
  const [practiceQ, setPracticeQ]       = useState(null);
  const [recording, setRecording]       = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mounted, setMounted]           = useState(false);

  const recognitionRef     = useRef(null);
  const shouldRecordRef    = useRef(false);
  const finalTranscriptRef = useRef("");
  const timerRef           = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);
  useEffect(() => {
    return () => {
      shouldRecordRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function toggleType(id) {
    setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  function reset() {
    stopMic();
    setStep("input"); setQuestions([]); setFeedback(null);
    setUserAnswer(""); setPracticeQ(null); setError("");
  }

  function createRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = "en-IN"; r.maxAlternatives = 1;
    r.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscriptRef.current += event.results[i][0].transcript + " ";
        else interim += event.results[i][0].transcript;
      }
      setUserAnswer(finalTranscriptRef.current + interim);
    };
    r.onend = () => {
      if (shouldRecordRef.current) {
        try { const n = createRecognition(); recognitionRef.current = n; n.start(); } catch(e) {}
      }
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" && shouldRecordRef.current) {
        try { const n = createRecognition(); recognitionRef.current = n; n.start(); } catch(e2) {}
      }
    };
    return r;
  }

  function startMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Please use Chrome."); return; }
    finalTranscriptRef.current = ""; setUserAnswer("");
    shouldRecordRef.current = true; setRecording(true); setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    const r = createRecognition(); recognitionRef.current = r; r.start();
  }

  function stopMic() {
    shouldRecordRef.current = false; setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(e) {} recognitionRef.current = null; }
    setUserAnswer(finalTranscriptRef.current.trim());
  }

  function formatTime(s) { return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`; }

  async function generateQuestions() {
    if (!jd.trim() || !role.trim()) return;
    setLoading(true); setError(""); setQuestions([]);
    const prompt = `You are an expert HR interviewer. Generate interview questions based on this job description.
ROLE: ${role}
EXPERIENCE LEVEL: ${level}
QUESTION TYPES: ${selectedTypes.join(", ")}
JOB DESCRIPTION: ${jd}
Return ONLY a raw JSON array. No markdown. No backticks. Start with [ end with ].
[{"id":1,"type":"behavioral","question":"...","what_they_want":"...","model_answer":"...","red_flags":"...","difficulty":"medium"}]
Generate 8-10 questions specific to the role. difficulty: easy, medium, or hard.`;
    try {
      const res = await fetch("/api/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key":process.env.REACT_APP_API_KEY, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
        body:JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:4000, messages:[{ role:"user", content:prompt }] }),
      });
      if (!res.ok) { setError(`Error ${res.status}`); setLoading(false); return; }
      const data = await res.json();
      const raw = data.content?.map(i => i.text||"").join("")||"";
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) { setError("Failed to parse questions. Please try again."); setLoading(false); return; }
      setQuestions(JSON.parse(match[0]));
      setStep("questions");
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  async function getFeedback(question) {
    if (!userAnswer.trim()) return;
    setFeedbackLoading(true); setFeedback(null);
    const prompt = `You are an expert interview coach. Give honest feedback.
QUESTION: ${question.question}
WHAT INTERVIEWERS WANT: ${question.what_they_want}
MODEL ANSWER: ${question.model_answer}
RED FLAGS: ${question.red_flags}
CANDIDATE'S ANSWER: ${userAnswer}
Return ONLY valid JSON: {"score":7,"verdict":"...","strengths":["..."],"improvements":["..."],"missing":["..."],"rewritten":"..."}`;
    try {
      const res = await fetch("/api/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key":process.env.REACT_APP_API_KEY, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
        body:JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:1000, messages:[{ role:"user", content:prompt }] }),
      });
      if (!res.ok) { setFeedbackLoading(false); return; }
      const data = await res.json();
      const raw = data.content?.map(i => i.text||"").join("")||"";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) { setFeedbackLoading(false); return; }
      setFeedback(JSON.parse(match[0]));
    } catch(e) { console.error(e); }
    setFeedbackLoading(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { -webkit-font-smoothing:antialiased; }
        body { background:${C.void}; }
        ::selection { background:${C.goldTrace}; color:${C.gold}; }
        ::placeholder { color:${C.iceFaint}; }
        ::-webkit-scrollbar { width:2px; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:2px; }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes ripple   { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.4);opacity:0} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes glow     { 0%,100%{box-shadow:0 0 12px ${C.goldGlow}} 50%{box-shadow:0 0 28px ${C.goldGlow}} }
        @keyframes flicker  { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.5} 95%{opacity:1} }

        .q-card:hover { border-color:${C.borderMid} !important; box-shadow:0 0 30px ${C.goldFaint} !important; }
        textarea:focus { outline:none; border-color:${C.borderMid} !important; }
        input:focus { outline:none; border-color:${C.borderMid} !important; }
        select:focus { outline:none; border-color:${C.borderMid} !important; }
        button { transition:all 160ms ease; cursor:pointer; }
        .type-btn:hover { border-color:${C.gold}50 !important; color:${C.gold} !important; }
      `}</style>

      <div style={{ minHeight:"100vh", background:C.void, fontFamily:C.sans, color:C.iceOff, position:"relative" }}>

        {/* Background atmosphere */}
        <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", top:"-15%", right:"0%", width:600, height:600, borderRadius:"50%", background:`radial-gradient(circle, ${C.goldGlow} 0%, transparent 65%)` }}/>
          <div style={{ position:"absolute", bottom:"-10%", left:"-5%", width:450, height:450, borderRadius:"50%", background:`radial-gradient(circle, rgba(20,40,60,0.5) 0%, transparent 70%)` }}/>
          <div style={{ position:"absolute", inset:0, backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`, opacity:0.5 }}/>
        </div>

        {/* Full-width gold hairline */}
        <div style={{ position:"fixed", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg, transparent 0%, ${C.gold}50 30%, ${C.gold}80 50%, ${C.gold}50 70%, transparent 100%)`, zIndex:300 }}/>

        {/* Header */}
        <header style={{ position:"sticky", top:0, zIndex:200, background:"rgba(5,7,9,0.88)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", borderBottom:`1px solid ${C.border}`, padding:"0 48px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:`linear-gradient(135deg, ${C.gold}, ${C.goldDim})`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 20px ${C.goldGlow}`, animation:"flicker 10s ease-in-out infinite", flexShrink:0 }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.void, fontFamily:C.serif, fontStyle:"italic" }}>P</span>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, fontStyle:"italic", color:C.ice, fontFamily:C.serif, lineHeight:1 }}>PrepPal</div>
              <div style={{ fontSize:8, color:C.iceFaint, letterSpacing:"0.2em", textTransform:"uppercase", fontFamily:C.mono, marginTop:2 }}>Interview Intelligence · by Divyah</div>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            {step !== "input" && (
              <div style={{ fontSize:8, color:C.gold, fontFamily:C.mono, letterSpacing:"0.18em", opacity:0.7 }}>
                {step === "questions" ? `${questions.length} QUESTIONS` : step === "practice" ? "PRACTICE MODE" : ""}
              </div>
            )}
            {step !== "input" && (
              <button onClick={reset} style={{ background:C.glass, border:`1px solid ${C.border}`, borderRadius:6, color:C.iceDim, fontSize:9, padding:"8px 18px", fontFamily:C.mono, letterSpacing:"0.14em", textTransform:"uppercase" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=C.gold; e.currentTarget.style.color=C.gold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.iceDim; }}
              >← New Session</button>
            )}
          </div>
        </header>

        {/* ══════════ INPUT STEP ══════════ */}
        {step === "input" && (
          <div style={{ position:"relative", zIndex:1 }}>
            {/* Hero */}
            <div style={{ padding:"72px 48px 56px", maxWidth:800, opacity:mounted?1:0, transform:mounted?"none":"translateY(16px)", transition:`opacity 600ms ${EASE}, transform 600ms ${EASE}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <div style={{ height:1, width:40, background:C.gold, boxShadow:`0 0 8px ${C.gold}` }}/>
                <span style={{ fontSize:8, letterSpacing:"0.26em", textTransform:"uppercase", color:C.gold, fontFamily:C.mono, fontWeight:700 }}>Interview Intelligence</span>
              </div>
              <h1 style={{ fontFamily:C.serif, fontStyle:"italic", fontWeight:700, fontSize:68, color:C.ice, margin:"0 0 4px", letterSpacing:"-3px", lineHeight:0.92 }}>Walk in prepared.</h1>
              <h1 style={{ fontFamily:C.serif, fontStyle:"italic", fontSize:68, color:C.gold, margin:"0 0 24px", letterSpacing:"-3px", lineHeight:0.92, textShadow:`0 0 60px ${C.goldGlow}` }}>Walk out hired.</h1>
              <p style={{ fontSize:14, color:C.iceDim, fontFamily:C.mono, lineHeight:1.85, maxWidth:460 }}>Paste a JD, pick your question types, speak or type your answers — get brutally honest AI feedback.</p>
            </div>

            {/* Form */}
            <div style={{ maxWidth:760, padding:"0 48px 100px", position:"relative", zIndex:1 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                {/* Role + Level */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Card accent={C.gold}>
                    <div style={{ padding:"14px 20px 12px", borderBottom:`1px solid ${C.border}` }}>
                      <label style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", color:C.iceDim, fontFamily:C.mono, fontWeight:700 }}>Role Title <span style={{ color:C.gold }}>*</span></label>
                    </div>
                    <input style={{ width:"100%", background:"transparent", border:"none", color:C.ice, fontFamily:C.mono, fontSize:"0.84rem", padding:"14px 20px", caretColor:C.gold }} placeholder="e.g. HR Executive" value={role} onChange={e => setRole(e.target.value)}/>
                  </Card>
                  <Card accent={C.goldDim}>
                    <div style={{ padding:"14px 20px 12px", borderBottom:`1px solid ${C.border}` }}>
                      <label style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", color:C.iceDim, fontFamily:C.mono, fontWeight:700 }}>Experience Level</label>
                    </div>
                    <select style={{ width:"100%", background:"transparent", border:"none", color:C.ice, fontFamily:C.mono, fontSize:"0.84rem", padding:"14px 20px", cursor:"pointer", appearance:"none", WebkitAppearance:"none" }} value={level} onChange={e => setLevel(e.target.value)}>
                      <option value="fresher" style={{ background:C.obsidian }}>Fresher / Entry Level</option>
                      <option value="mid" style={{ background:C.obsidian }}>Mid Level (2–5 years)</option>
                      <option value="senior" style={{ background:C.obsidian }}>Senior (5+ years)</option>
                      <option value="lead" style={{ background:C.obsidian }}>Lead / Manager</option>
                    </select>
                  </Card>
                </div>

                {/* Question types */}
                <Card>
                  <div style={{ padding:"14px 20px 12px", borderBottom:`1px solid ${C.border}` }}>
                    <label style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", color:C.iceDim, fontFamily:C.mono, fontWeight:700 }}>Question Types</label>
                  </div>
                  <div style={{ padding:"14px 20px", display:"flex", gap:8, flexWrap:"wrap" }}>
                    {QUESTION_TYPES.map(t => {
                      const active = selectedTypes.includes(t.id);
                      return (
                        <button key={t.id} className="type-btn" onClick={() => toggleType(t.id)}
                          style={{ padding:"8px 18px", borderRadius:8, fontSize:11, fontWeight:600, fontFamily:C.mono, letterSpacing:"0.06em", background:active?C.goldTrace:"transparent", color:active?C.gold:C.iceDim, border:`1px solid ${active?C.gold+"50":C.border}`, boxShadow:active?`0 0 12px ${C.goldFaint}`:"none" }}
                          onMouseDown={e => { e.currentTarget.style.transform="scale(0.96)"; }}
                          onMouseUp={e => { e.currentTarget.style.transform="scale(1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
                        >{t.label}</button>
                      );
                    })}
                  </div>
                </Card>

                {/* JD */}
                <Card accent={C.gold}>
                  <div style={{ padding:"14px 20px 12px", borderBottom:`1px solid ${C.border}` }}>
                    <label style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", color:C.iceDim, fontFamily:C.mono, fontWeight:700 }}>Job Description <span style={{ color:C.gold }}>*</span></label>
                  </div>
                  <textarea style={{ width:"100%", background:"transparent", border:"none", color:C.iceOff, fontFamily:C.mono, fontSize:"0.82rem", padding:"18px 20px", resize:"vertical", lineHeight:1.8, minHeight:200, caretColor:C.gold }} placeholder="Paste the full job description here..." value={jd} onChange={e => setJd(e.target.value)}/>
                </Card>

                {error && <div style={{ background:C.crimsonDim, border:`1px solid ${C.crimsonBorder}`, borderRadius:10, padding:"12px 18px", fontSize:11, color:"#ff7070", fontFamily:C.mono }}>{error}</div>}

                {/* CTA */}
                <button onClick={generateQuestions} disabled={!jd.trim()||!role.trim()||loading||selectedTypes.length===0}
                  style={{
                    background: !jd.trim()||!role.trim()||loading||selectedTypes.length===0 ? C.glassMid : `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
                    color: !jd.trim()||!role.trim()||loading||selectedTypes.length===0 ? C.iceDim : C.void,
                    border:`1px solid ${!jd.trim()||!role.trim()||loading ? C.border:"transparent"}`,
                    borderRadius:10, padding:"16px", fontSize:10,
                    letterSpacing:"0.22em", textTransform:"uppercase",
                    fontFamily:C.mono, fontWeight:700,
                    cursor: !jd.trim()||!role.trim()||loading||selectedTypes.length===0 ? "not-allowed":"pointer",
                    boxShadow: !jd.trim()||!role.trim()||loading ? "none" : `0 0 32px ${C.goldGlow}, 0 4px 16px rgba(0,0,0,0.4)`,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                  }}
                  onMouseDown={e => { if(!loading&&jd.trim()&&role.trim()) e.currentTarget.style.transform="scale(0.98)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform="scale(1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
                >
                  {loading ? (
                    <><div style={{ width:12, height:12, border:`2px solid rgba(0,0,0,0.3)`, borderTopColor:C.void, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/> Generating…</>
                  ) : "Generate Interview Questions →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ QUESTIONS STEP ══════════ */}
        {step === "questions" && (
          <div style={{ maxWidth:760, margin:"0 auto", padding:"48px 40px 100px", position:"relative", zIndex:1 }}>
            <div style={{ marginBottom:36, animation:`fadeUp 400ms ${EASE} both` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ height:1, width:32, background:C.gold }}/>
                <span style={{ fontSize:8, letterSpacing:"0.22em", textTransform:"uppercase", color:C.gold, fontFamily:C.mono }}>Your Question Set</span>
              </div>
              <h2 style={{ fontFamily:C.serif, fontStyle:"italic", fontWeight:700, fontSize:40, color:C.ice, letterSpacing:"-1.5px", margin:"0 0 8px" }}>{role}</h2>
              <p style={{ fontSize:11, color:C.iceDim, fontFamily:C.mono }}>{questions.length} questions · {level} level</p>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {questions.map((q, i) => (
                <div key={i} className="q-card"
                  style={{ border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", cursor:"pointer", transition:`all 200ms ${EASE}`, background:C.glass, backdropFilter:"blur(8px)", animation:`slideUp 400ms ${EASE} ${i*40}ms both` }}
                  onClick={() => setActiveQ(activeQ === i ? null : i)}
                >
                  {/* Card top accent */}
                  <div style={{ height:1, background:activeQ===i?`linear-gradient(90deg,${C.gold},transparent)`:`linear-gradient(90deg,${C.border},transparent)` }}/>

                  <div style={{ padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:14 }}>
                    {/* Number */}
                    <div style={{ width:28, height:28, background:activeQ===i?C.goldTrace:C.glassMid, border:`1px solid ${activeQ===i?C.gold+"40":C.border}`, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:activeQ===i?C.gold:C.iceDim, fontFamily:C.mono, flexShrink:0, transition:`all 200ms ease` }}>{String(i+1).padStart(2,"0")}</div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                        <Tag color={diffColor(q.difficulty)} bg={diffBg(q.difficulty)} border={diffBorder(q.difficulty)}>{q.difficulty}</Tag>
                        <Tag>{q.type}</Tag>
                      </div>
                      <p style={{ fontSize:"0.86rem", fontWeight:600, color:C.iceOff, lineHeight:1.55, fontFamily:C.sans }}>{q.question}</p>
                    </div>

                    <div style={{ color:C.iceDim, fontSize:10, flexShrink:0, transition:"transform 200ms ease", transform:activeQ===i?"rotate(180deg)":"none" }}>▾</div>
                  </div>

                  {/* Expanded */}
                  {activeQ === i && (
                    <div style={{ borderTop:`1px solid ${C.border}`, background:C.glassMid, padding:"20px" }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:20 }}>
                        {[
                          { label:"What they're looking for", color:C.gold, text:q.what_they_want },
                          { label:"Model answer approach", color:C.sage, text:q.model_answer },
                          { label:"Red flags to avoid", color:C.crimson, text:q.red_flags },
                        ].map((s,j) => (
                          <div key={j}>
                            <div style={{ fontSize:8, fontWeight:700, color:s.color, letterSpacing:"0.18em", textTransform:"uppercase", fontFamily:C.mono, marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ height:1, width:16, background:s.color }}/>
                              {s.label}
                            </div>
                            <p style={{ fontSize:"0.8rem", color:C.iceMid, lineHeight:1.75, fontFamily:C.mono }}>{s.text}</p>
                          </div>
                        ))}
                      </div>

                      <button onClick={e => { e.stopPropagation(); setPracticeQ(q); setUserAnswer(""); setFeedback(null); setStep("practice"); }}
                        style={{ background:`linear-gradient(135deg,${C.gold},${C.goldDim})`, color:C.void, border:"none", borderRadius:8, padding:"10px 22px", fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", fontFamily:C.mono, boxShadow:`0 0 20px ${C.goldGlow}` }}
                        onMouseDown={e => { e.currentTarget.style.transform="scale(0.97)"; }}
                        onMouseUp={e => { e.currentTarget.style.transform="scale(1)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
                      >Practice this →</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ PRACTICE STEP ══════════ */}
        {step === "practice" && practiceQ && (
          <div style={{ maxWidth:760, margin:"0 auto", padding:"48px 40px 100px", position:"relative", zIndex:1 }}>

            {/* Question card */}
            <Card accent={C.gold} style={{ marginBottom:16, animation:`fadeUp 400ms ${EASE} both` }}>
              <div style={{ padding:"20px" }}>
                <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
                  <Tag color={diffColor(practiceQ.difficulty)} bg={diffBg(practiceQ.difficulty)} border={diffBorder(practiceQ.difficulty)}>{practiceQ.difficulty}</Tag>
                  <Tag>{practiceQ.type}</Tag>
                </div>
                <p style={{ fontSize:"1.1rem", fontFamily:C.serif, fontStyle:"italic", fontWeight:600, color:C.ice, lineHeight:1.5 }}>{practiceQ.question}</p>
              </div>
            </Card>

            {/* Answer section */}
            <Card style={{ marginBottom:16, animation:`fadeUp 400ms ${EASE} 60ms both` }}>
              <div style={{ padding:"14px 20px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <label style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", color:C.iceDim, fontFamily:C.mono, fontWeight:700 }}>Your Answer</label>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  {recording && <span style={{ fontSize:10, color:C.crimson, fontFamily:C.mono, fontWeight:700, fontVariantNumeric:"tabular-nums", animation:"pulse 1s ease-in-out infinite" }}>● {formatTime(recordingTime)}</span>}
                  <div style={{ position:"relative" }}>
                    {recording && <div style={{ position:"absolute", inset:-4, borderRadius:"50%", border:`2px solid ${C.crimson}`, animation:"ripple 1.5s ease-in-out infinite" }}/>}
                    <button onClick={recording ? stopMic : startMic}
                      style={{ width:38, height:38, borderRadius:"50%", background:recording?C.crimson:C.glassMid, border:`1px solid ${recording?"transparent":C.borderMid}`, color:C.ice, fontSize:recording?"0.8rem":"1rem", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:recording?`0 0 20px rgba(192,48,48,0.4)`:"none" }}
                      onMouseDown={e => { e.currentTarget.style.transform="scale(0.92)"; }}
                      onMouseUp={e => { e.currentTarget.style.transform="scale(1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
                    >{recording ? "■" : "🎙"}</button>
                  </div>
                </div>
              </div>
              {recording && (
                <div style={{ padding:"10px 20px", background:"rgba(192,48,48,0.06)", borderBottom:`1px solid ${C.border}`, fontSize:11, color:C.crimson, fontFamily:C.mono }}>
                  ● Recording — speak clearly. Press ■ when done.
                </div>
              )}
              <textarea style={{ width:"100%", background:"transparent", border:"none", color:C.iceOff, fontFamily:C.mono, fontSize:"0.83rem", padding:"18px 20px", resize:"vertical", lineHeight:1.8, minHeight:180, caretColor:C.gold }} placeholder={recording?"Listening…":"Speak using 🎙 or type your answer here..."} value={userAnswer} onChange={e => setUserAnswer(e.target.value)}/>
              <div style={{ padding:"10px 20px", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:9, color:C.iceFaint, fontFamily:C.mono }}>Tip: Use Chrome for voice · you can edit after speaking</span>
              </div>
            </Card>

            {/* Actions */}
            <div style={{ display:"flex", gap:10, marginBottom:20, animation:`fadeUp 400ms ${EASE} 120ms both` }}>
              <button onClick={() => { setStep("questions"); setFeedback(null); setUserAnswer(""); stopMic(); }}
                style={{ background:C.glass, border:`1px solid ${C.border}`, borderRadius:9, padding:"13px 22px", fontSize:10, fontWeight:700, color:C.iceDim, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:C.mono }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=C.borderMid; e.currentTarget.style.color=C.iceOff; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.iceDim; }}
                onMouseDown={e => { e.currentTarget.style.transform="scale(0.97)"; }}
                onMouseUp={e => { e.currentTarget.style.transform="scale(1)"; }}
              >← Back</button>
              <button onClick={() => getFeedback(practiceQ)} disabled={!userAnswer.trim()||feedbackLoading}
                style={{ flex:1, background:!userAnswer.trim()||feedbackLoading?C.glassMid:`linear-gradient(135deg,${C.gold},${C.goldDim})`, color:!userAnswer.trim()||feedbackLoading?C.iceDim:C.void, border:`1px solid ${!userAnswer.trim()||feedbackLoading?C.border:"transparent"}`, borderRadius:9, padding:"13px", fontSize:10, letterSpacing:"0.2em", textTransform:"uppercase", fontFamily:C.mono, fontWeight:700, cursor:!userAnswer.trim()||feedbackLoading?"not-allowed":"pointer", boxShadow:!userAnswer.trim()||feedbackLoading?"none":`0 0 28px ${C.goldGlow}`, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}
                onMouseDown={e => { if(userAnswer.trim()&&!feedbackLoading) e.currentTarget.style.transform="scale(0.98)"; }}
                onMouseUp={e => { e.currentTarget.style.transform="scale(1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
              >
                {feedbackLoading?<><div style={{ width:11,height:11,border:`2px solid rgba(0,0,0,0.3)`,borderTopColor:C.void,borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/> Analysing…</>:"Get AI Feedback →"}
              </button>
            </div>

            {/* Feedback */}
            {feedback && (
              <div style={{ display:"flex", flexDirection:"column", gap:10, animation:`fadeUp 400ms ${EASE} both` }}>

                {/* Score */}
                <Card accent={scoreColor(feedback.score)}>
                  <div style={{ padding:"24px", display:"flex", alignItems:"center", gap:28 }}>
                    <div style={{ position:"relative", flexShrink:0 }}>
                      <svg width={100} height={100} viewBox="0 0 100 100">
                        <circle cx={50} cy={50} r={38} fill="none" stroke={C.border} strokeWidth={4}/>
                        <circle cx={50} cy={50} r={38} fill="none" stroke={scoreColor(feedback.score)} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${(feedback.score/10)*2*Math.PI*38} ${2*Math.PI*38}`} transform="rotate(-90 50 50)" style={{ filter:`drop-shadow(0 0 8px ${scoreColor(feedback.score)})` }}/>
                        <text x={50} y={46} textAnchor="middle" fill={scoreColor(feedback.score)} style={{ fontSize:28, fontWeight:700, fontFamily:C.serif }}>{feedback.score}</text>
                        <text x={50} y={62} textAnchor="middle" fill={C.iceDim} style={{ fontSize:9, fontFamily:C.mono, letterSpacing:"0.1em" }}>/ 10</text>
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", color:C.iceDim, fontFamily:C.mono, marginBottom:10 }}>AI Verdict</p>
                      <p style={{ fontSize:"1rem", fontFamily:C.serif, fontStyle:"italic", color:C.ice, lineHeight:1.55 }}>{feedback.verdict}</p>
                    </div>
                  </div>
                </Card>

                {/* Strengths / Improvements / Missing */}
                {[
                  { label:"Strengths", color:C.sage, border:C.sageBorder, bg:C.sageDim, items:feedback.strengths },
                  { label:"Improvements", color:C.amber, border:C.amberBorder, bg:C.amberDim, items:feedback.improvements },
                  { label:"Missing", color:C.crimson, border:C.crimsonBorder, bg:C.crimsonDim, items:feedback.missing },
                ].map((s,i) => s.items?.length > 0 && (
                  <div key={i} style={{ border:`1px solid ${s.border}`, borderRadius:12, overflow:"hidden", background:s.bg }}>
                    <div style={{ padding:"12px 20px", borderBottom:`1px solid ${s.border}` }}>
                      <span style={{ fontSize:9, fontWeight:700, color:s.color, letterSpacing:"0.18em", textTransform:"uppercase", fontFamily:C.mono }}>{s.label}</span>
                    </div>
                    <div style={{ padding:"14px 20px", display:"flex", flexDirection:"column", gap:8 }}>
                      {s.items.map((item,j) => (
                        <div key={j} style={{ display:"flex", gap:10 }}>
                          <span style={{ color:s.color, flexShrink:0, fontSize:8, marginTop:5 }}>◆</span>
                          <span style={{ fontSize:"0.8rem", color:C.iceOff, lineHeight:1.72, fontFamily:C.mono }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Rewritten */}
                {feedback.rewritten && (
                  <Card accent={C.gold}>
                    <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:9, fontWeight:700, color:C.gold, letterSpacing:"0.18em", textTransform:"uppercase", fontFamily:C.mono }}>◈ Suggested Better Answer</span>
                    </div>
                    <div style={{ padding:"16px 20px" }}>
                      <p style={{ fontSize:"0.81rem", color:C.iceMid, lineHeight:1.8, fontFamily:C.mono }}>{feedback.rewritten}</p>
                    </div>
                  </Card>
                )}

                {/* Keycap hints */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, paddingTop:8 }}>
                  <Key>↵</Key><span style={{ fontSize:9, color:C.iceFaint, fontFamily:C.mono }}>retry answer</span>
                  <span style={{ color:C.border, margin:"0 4px" }}>·</span>
                  <Key>←</Key><span style={{ fontSize:9, color:C.iceFaint, fontFamily:C.mono }}>back to questions</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}