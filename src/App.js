import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   PREPPAL — Gold & Black Terminal
   
   World: A targeting computer acquiring interview questions
   as hostile objectives. Your answer is the shot.
   The feedback is the hit analysis.
   
   Palette:
   - #050709  void — kept
   - #0D1117  obsidian surface
   - #131920  raised panel
   - #C9A84C  gold — primary accent
   - #90A4AE  steel blue-grey — data/secondary
   - #E8EAF6  cool white — ink
   - Existing sage/amber/crimson for feedback scores
   
   Signature elements (one per screen, earned):
   1. INPUT: Targeting reticle canvas — visible, 35% opacity,
      outer ring rotates CW slowly, inner crosshair CCW faster.
      The system is always scanning.
   2. QUESTIONS: Scan-lock on expand — thin red line sweeps
      top→bottom when a card opens. Target acquired.
   3. PRACTICE: Radar sweep on mic button when recording —
      rotating arc (not a pulse). The system is listening.
   
   Motion (all Framer Motion springs, no CSS keyframes):
   - GPU only: transform + opacity
   - Entrances: scale(0.95) + opacity:0 → scale(1) + opacity:1
   - Press states: scale(0.97) spring back
   - Stagger only on question list — communicates structure
   - No stagger spam elsewhere
   - prefers-reduced-motion: canvas hidden, all transitions off
═══════════════════════════════════════════════════════════ */

const C = {
  void:         "#080808",
  obsidian:     "#101010",
  obsidianMid:  "#141414",
  obsidianLight:"#1C1C1C",
  glass:        "rgba(255,255,255,0.03)",
  glassMid:     "rgba(255,255,255,0.05)",
  border:       "rgba(255,255,255,0.07)",
  borderMid:    "rgba(255,255,255,0.12)",
  borderHigh:   "rgba(255,255,255,0.20)",
  // Crimson Targeting
  gold:         "#C9A84C",
  goldDim:       "rgba(201,168,76,0.45)",
  goldFaint:     "rgba(201,168,76,0.12)",
  goldTrace:     "rgba(201,168,76,0.06)",
  // Steel data
  steel:        "#90A4AE",
  steelDim:     "rgba(144,164,174,0.45)",
  steelFaint:   "rgba(144,164,174,0.12)",
  // Ink
  ink:          "#F5F0E8",
  inkOff:       "rgba(245,240,232,0.88)",
  inkMid:       "rgba(245,240,232,0.55)",
  inkDim:       "rgba(245,240,232,0.30)",
  inkFaint:     "rgba(245,240,232,0.12)",
  inkTrace:     "rgba(245,240,232,0.05)",
  // Semantic (feedback scores — kept)
  sage:         "#3D9E6A",
  sageDim:      "rgba(61,158,106,0.14)",
  sageBorder:   "rgba(61,158,106,0.28)",
  amber:        "#D4860A",
  amberDim:     "rgba(212,134,10,0.12)",
  amberBorder:  "rgba(212,134,10,0.28)",
  crimson:      "#C03030",
  crimsonDim:   "rgba(192,48,48,0.12)",
  crimsonBorder:"rgba(192,48,48,0.28)",
  display:      "'Cormorant Garamond', Georgia, serif",
  mono:         "'DM Mono', monospace",
  sans:         "'Plus Jakarta Sans', system-ui, sans-serif",
};

const SP = {
  snap:    { type:"spring", stiffness:500, damping:32 },
  arrive:  { type:"spring", stiffness:360, damping:28, mass:1 },
  press:   { type:"spring", stiffness:600, damping:36, mass:0.8 },
  card:    { type:"spring", stiffness:320, damping:28, mass:1.1 },
  stagger: { staggerChildren:0.05, delayChildren:0.06 },
};

const QUESTION_TYPES = [
  { id:"behavioral",  label:"Behavioural"  },
  { id:"technical",   label:"Technical"    },
  { id:"situational", label:"Situational"  },
  { id:"culture",     label:"Culture Fit"  },
];

function scoreColor(s) { return s>=7?C.sage:s>=5?C.amber:C.crimson; }
function diffColor(d)  { return d==="easy"?C.sage:d==="hard"?C.crimson:C.amber; }
function diffBorder(d) { return d==="easy"?C.sageBorder:d==="hard"?C.crimsonBorder:C.amberBorder; }
function diffBg(d)     { return d==="easy"?C.sageDim:d==="hard"?C.crimsonDim:C.amberDim; }

/* ── Tag ── */
function Tag({ children, color, bg, border }) {
  return (
    <span style={{ display:"inline-block", background:bg||C.glassMid,
      color:color||C.inkDim, border:`1px solid ${border||C.border}`,
      borderRadius:4, fontSize:9, padding:"3px 10px", fontFamily:C.mono,
      letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>
      {children}
    </span>
  );
}

/* ── Key ── */
function Key({ children }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
      padding:"2px 7px", background:C.glassMid, border:`1px solid ${C.borderMid}`,
      borderRadius:4, fontSize:9, fontFamily:C.mono, color:C.inkDim }}>
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   TARGETING RETICLE CANVAS — signature element, input screen
   
   Outer ring: slow CW rotation (20s period)
   Inner crosshair: faster CCW rotation (8s period)
   Corner brackets: static, mark the target zone
   Hard lines, no glow — 35% opacity
   The system is always scanning.
══════════════════════════════════════════════════════════ */
function ReticleCanvas() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width * 0.72;
    const cy = canvas.height * 0.5;
    const R = Math.min(canvas.width, canvas.height) * 0.38;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angleRef.current += 0.004; // outer ring CW

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(201,168,76,0.25)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Outer ring dashes (rotating)
      for (let i = 0; i < 36; i++) {
        const a = angleRef.current + (i / 36) * Math.PI * 2;
        const isDash = i % 4 !== 0;
        if (!isDash) continue;
        const x1 = cx + (R + 4) * Math.cos(a);
        const y1 = cy + (R + 4) * Math.sin(a);
        const x2 = cx + (R + 10) * Math.cos(a);
        const y2 = cy + (R + 10) * Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(201,168,76,0.45)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Middle ring (static)
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.65, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(144,164,174,0.15)`;
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // Inner crosshair (CCW faster)
      const innerAngle = -angleRef.current * 2.5;
      const crossLen = R * 0.55;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => {
        const gapFrac = 0.15;
        ctx.beginPath();
        ctx.moveTo(
          cx + Math.cos(innerAngle) * crossLen * gapFrac * (dx===0?1:Math.sign(dx))
            + Math.cos(innerAngle + Math.PI/2) * crossLen * gapFrac * (dy===0?1:Math.sign(dy)),
          cy + Math.sin(innerAngle) * crossLen * gapFrac * (dx===0?1:Math.sign(dx))
            + Math.sin(innerAngle + Math.PI/2) * crossLen * gapFrac * (dy===0?1:Math.sign(dy))
        );
        // Simplified: just draw 4 lines from center gap
        const gapR = R * 0.08;
        const lineA = innerAngle + (dx!==0 ? (dx>0?0:Math.PI) : (dy>0?Math.PI/2:-Math.PI/2));
        ctx.moveTo(cx + Math.cos(lineA)*gapR, cy + Math.sin(lineA)*gapR);
        ctx.lineTo(cx + Math.cos(lineA)*crossLen, cy + Math.sin(lineA)*crossLen);
        ctx.strokeStyle = `rgba(201,168,76,0.55)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201,168,76,0.70)`;
      ctx.fill();

      // Corner brackets (static)
      const bSize = R * 0.18;
      const bR = R * 1.05;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy]) => {
        const bx = cx + sx * bR * 0.7;
        const by = cy + sy * bR * 0.42;
        ctx.strokeStyle = `rgba(144,164,174,0.40)`;
        ctx.lineWidth = 1.5;
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + sx * bSize, by);
        ctx.stroke();
        // Vertical
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by + sy * bSize);
        ctx.stroke();
      });

      // Range rings (faint)
      [0.3, 0.85].forEach(frac => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * frac, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(144,164,174,0.08)`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <canvas ref={canvasRef}
      style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, opacity:0.85 }}/>
  );
}

/* ══════════════════════════════════════════════════════════
   RADAR SWEEP — mic button signature, practice screen
   A rotating arc around the mic button when recording.
   One full sweep every 2s. Not a pulse — actual rotation.
══════════════════════════════════════════════════════════ */
function RadarSweep({ size = 56 }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = size; canvas.height = size;
    const cx = size/2, cy = size/2, r = size/2 - 3;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      angleRef.current += 0.05; // 2s period at 60fps

      // Track
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(201,168,76,0.20)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sweep trail
      for (let t = 0; t < 30; t++) {
        const ta = angleRef.current - (t/30) * (Math.PI * 0.8);
        const opacity = (1 - t/30) * 0.55;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, ta - 0.04, ta);
        ctx.closePath();
        ctx.fillStyle = `rgba(201,168,76,${opacity})`;
        ctx.fill();
      }

      // Sweep tip
      const tx = cx + r * Math.cos(angleRef.current);
      const ty = cy + r * Math.sin(angleRef.current);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = `rgba(201,168,76,0.9)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = C.gold;
      ctx.fill();

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [size]);

  return (
    <canvas ref={canvasRef}
      style={{ position:"absolute", inset:-(size/2 - 19),
        width:size, height:size, pointerEvents:"none" }}/>
  );
}

/* ══════════════════════════════════════════════════════════
   SCAN LOCK — question card expand signature
   A thin red line sweeps top→bottom over 400ms when a
   card opens. Target acquired. GPU: scaleY + opacity only.
══════════════════════════════════════════════════════════ */
function ScanLock() {
  return (
    <motion.div
      initial={{ scaleY:0, opacity:1 }}
      animate={{ scaleY:1, opacity:0 }}
      transition={{ duration:0.4, ease:[0.4,0,0.6,1] }}
      style={{ position:"absolute", top:0, left:0, right:0, bottom:0,
        background:`linear-gradient(180deg, ${C.gold} 0%, transparent 4%, transparent 96%, ${C.gold} 100%)`,
        pointerEvents:"none", zIndex:5, originY:0, transformBox:"fill-box" }}/>
  );
}

export default function PrepPal() {
  const [jd, setJd]                       = useState("");
  const [role, setRole]                   = useState("");
  const [level, setLevel]                 = useState("fresher");
  const [selectedTypes, setSelectedTypes] = useState(["behavioral","situational"]);
  const [questions, setQuestions]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [activeQ, setActiveQ]             = useState(null);
  const [scanningQ, setScanningQ]         = useState(null);
  const [userAnswer, setUserAnswer]       = useState("");
  const [feedback, setFeedback]           = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [step, setStep]                   = useState("input");
  const [practiceQ, setPracticeQ]         = useState(null);
  const [recording, setRecording]         = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const recognitionRef     = useRef(null);
  const shouldRecordRef    = useRef(false);
  const finalTranscriptRef = useRef("");
  const timerRef           = useRef(null);

  useEffect(() => {
    return () => {
      shouldRecordRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function toggleType(id) {
    setSelectedTypes(prev => prev.includes(id)
      ? prev.filter(t=>t!==id) : [...prev, id]);
  }

  function reset() {
    stopMic();
    setStep("input"); setQuestions([]); setFeedback(null);
    setUserAnswer(""); setPracticeQ(null); setError("");
    setActiveQ(null); setScanningQ(null);
  }

  function createRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous=false; r.interimResults=true; r.lang="en-IN"; r.maxAlternatives=1;
    r.onresult = (event) => {
      let interim="";
      for (let i=event.resultIndex;i<event.results.length;i++) {
        if (event.results[i].isFinal) finalTranscriptRef.current+=event.results[i][0].transcript+" ";
        else interim+=event.results[i][0].transcript;
      }
      setUserAnswer(finalTranscriptRef.current+interim);
    };
    r.onend = () => {
      if (shouldRecordRef.current) {
        try { const n=createRecognition(); recognitionRef.current=n; n.start(); } catch(e) {}
      }
    };
    r.onerror = (e) => {
      if (e.error==="no-speech"&&shouldRecordRef.current) {
        try { const n=createRecognition(); recognitionRef.current=n; n.start(); } catch(e2) {}
      }
    };
    return r;
  }

  function startMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Please use Chrome."); return; }
    finalTranscriptRef.current=""; setUserAnswer("");
    shouldRecordRef.current=true; setRecording(true); setRecordingTime(0);
    timerRef.current = setInterval(()=>setRecordingTime(t=>t+1), 1000);
    const r=createRecognition(); recognitionRef.current=r; r.start();
  }

  function stopMic() {
    shouldRecordRef.current=false; setRecording(false);
    if (timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}
    if (recognitionRef.current){try{recognitionRef.current.stop();}catch(e){}recognitionRef.current=null;}
    setUserAnswer(finalTranscriptRef.current.trim());
  }

  function formatTime(s) {
    return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  }

  function expandCard(i) {
    if (activeQ===i) { setActiveQ(null); setScanningQ(null); return; }
    setScanningQ(i);
    setActiveQ(i);
    setTimeout(()=>setScanningQ(null), 500);
  }

  async function generateQuestions() {
    if (!jd.trim()||!role.trim()) return;
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
        headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:4000,messages:[{role:"user",content:prompt}]}),
      });
      if (!res.ok){setError(`Error ${res.status}`);setLoading(false);return;}
      const data = await res.json();
      const raw = data.content?.map(i=>i.text||"").join("")||"";
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match){setError("Failed to parse questions.");setLoading(false);return;}
      setQuestions(JSON.parse(match[0]));
      setStep("questions");
    } catch(e){setError(e.message);}
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
        headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1000,messages:[{role:"user",content:prompt}]}),
      });
      if (!res.ok){setFeedbackLoading(false);return;}
      const data = await res.json();
      const raw = data.content?.map(i=>i.text||"").join("")||"";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match){setFeedbackLoading(false);return;}
      setFeedback(JSON.parse(match[0]));
    } catch(e){console.error(e);}
    setFeedbackLoading(false);
  }

  // Variants
  const pageVariants = {
    hidden: { opacity:0, scale:0.98 },
    show:   { opacity:1, scale:1, transition:{ ...SP.arrive, staggerChildren:0.06 } },
    exit:   { opacity:0, scale:0.98, transition:{ duration:0.15 } },
  };
  const itemVariants = {
    hidden: { opacity:0, scale:0.96, y:-6 },
    show:   { opacity:1, scale:1, y:0, transition:SP.arrive },
  };
  const cardListVariants = {
    hidden: {},
    show: { transition:{ staggerChildren:0.045, delayChildren:0.05 } },
  };
  const cardItemVariants = {
    hidden: { opacity:0, scale:0.96, y:-8 },
    show:   { opacity:1, scale:1, y:0, transition:SP.card },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{-webkit-font-smoothing:antialiased;}
        body{background:${C.void};}
        ::selection{background:${C.goldTrace};color:${C.gold};}
        ::placeholder{color:${C.inkFaint};}
        ::-webkit-scrollbar{width:2px;}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        textarea:focus,input:focus,select:focus{outline:none;}
        @media(prefers-reduced-motion:reduce){
          *{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}
          canvas{display:none;}
        }
      `}</style>

      <div style={{ minHeight:"100vh", background:C.void, fontFamily:C.sans,
        color:C.inkOff, position:"relative" }}>

        {/* Top red hairline */}
        <div style={{ position:"fixed", top:0, left:0, right:0, height:1,
          background:`linear-gradient(90deg, transparent, ${C.gold}80, ${C.gold}, ${C.gold}80, transparent)`,
          zIndex:300 }}/>

        {/* HEADER */}
        <header style={{ position:"sticky", top:0, zIndex:200,
          background:"rgba(5,7,9,0.90)", backdropFilter:"blur(24px)",
          borderBottom:`1px solid ${C.border}`, padding:"0 48px",
          height:62, display:"flex", alignItems:"center", justifyContent:"space-between" }}>

          <motion.div
            initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
            transition={{ ...SP.arrive, delay:0.05 }}
            style={{ display:"flex", alignItems:"center", gap:14 }}>
            {/* Logo — targeting crosshair */}
            <div style={{ width:34, height:34, borderRadius:8, flexShrink:0,
              background:C.goldFaint, border:`1px solid ${C.gold}50`,
              display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative" }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke={C.gold} strokeWidth="1"/>
                <circle cx="9" cy="9" r="3" stroke={C.gold} strokeWidth="1" opacity="0.6"/>
                <circle cx="9" cy="9" r="1.5" fill={C.gold}/>
                <line x1="9" y1="1" x2="9" y2="5" stroke={C.gold} strokeWidth="1.2"/>
                <line x1="9" y1="13" x2="9" y2="17" stroke={C.gold} strokeWidth="1.2"/>
                <line x1="1" y1="9" x2="5" y2="9" stroke={C.gold} strokeWidth="1.2"/>
                <line x1="13" y1="9" x2="17" y2="9" stroke={C.gold} strokeWidth="1.2"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, fontStyle:"italic",
                color:C.ink, fontFamily:C.display, lineHeight:1 }}>PrepPal</div>
              <div style={{ fontSize:8, color:C.inkFaint, letterSpacing:"0.2em",
                textTransform:"uppercase", fontFamily:C.mono, marginTop:2 }}>
                Interview Intelligence · by Divyah
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
            transition={{ ...SP.arrive, delay:0.08 }}
            style={{ display:"flex", alignItems:"center", gap:16 }}>
            {step!=="input" && (
              <div style={{ fontFamily:C.mono, fontSize:8, color:C.gold,
                letterSpacing:"0.18em", textTransform:"uppercase", opacity:0.8 }}>
                {step==="questions"?`${questions.length} TARGETS ACQUIRED`
                  :step==="practice"?"PRACTICE MODE":""}
              </div>
            )}
            {step!=="input" && (
              <motion.button
                whileTap={{ scale:0.97, transition:SP.press }}
                onClick={reset}
                style={{ background:C.glass, border:`1px solid ${C.border}`,
                  borderRadius:6, color:C.inkDim, fontSize:9, padding:"7px 16px",
                  fontFamily:C.mono, letterSpacing:"0.14em", textTransform:"uppercase",
                  cursor:"pointer", transition:"border-color 150ms, color 150ms" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}>
                ← New Session
              </motion.button>
            )}
          </motion.div>
        </header>

        <AnimatePresence mode="wait">

          {/* ══ INPUT ══ */}
          {step==="input" && (
            <motion.div key="input"
              variants={pageVariants} initial="hidden" animate="show" exit="exit"
              style={{ position:"relative", zIndex:1 }}>

              {/* TARGETING RETICLE — signature element */}
              <ReticleCanvas/>

              <div style={{ maxWidth:760, padding:"64px 48px 100px" }}>

                {/* Hero */}
                <motion.div variants={itemVariants} style={{ marginBottom:52 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
                    <div style={{ height:1, width:36, background:C.gold }}/>
                    <span style={{ fontSize:8, letterSpacing:"0.26em", textTransform:"uppercase",
                      color:C.gold, fontFamily:C.mono, fontWeight:700 }}>
                      Acquisition System Online
                    </span>
                  </div>
                  <h1 style={{ fontFamily:C.display, fontStyle:"italic", fontWeight:700,
                    fontSize:64, color:C.ink, margin:"0 0 4px", letterSpacing:"-2.5px", lineHeight:0.92 }}>
                    Walk in prepared.
                  </h1>
                  <h1 style={{ fontFamily:C.display, fontStyle:"italic", fontSize:64,
                    color:C.gold, margin:"0 0 22px", letterSpacing:"-2.5px", lineHeight:0.92 }}>
                    Walk out hired.
                  </h1>
                  <p style={{ fontSize:14, color:C.inkDim, fontFamily:C.mono,
                    lineHeight:1.85, maxWidth:420 }}>
                    Paste a JD, pick your question types, speak or type your answers —
                    get brutally honest AI feedback.
                  </p>
                </motion.div>

                {/* Form */}
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

                  {/* Role + Level */}
                  <motion.div variants={itemVariants}
                    style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {/* Role */}
                    <div style={{ background:C.glass, border:`1px solid ${C.border}`,
                      borderRadius:10, overflow:"hidden", position:"relative" }}>
                      <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
                        background:`linear-gradient(90deg,${C.gold},transparent)` }}/>
                      <div style={{ padding:"12px 18px 10px", borderBottom:`1px solid ${C.border}` }}>
                        <label style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase",
                          color:C.inkDim, fontFamily:C.mono, fontWeight:700 }}>
                          Role Title <span style={{ color:C.gold }}>*</span>
                        </label>
                      </div>
                      <input style={{ width:"100%", background:"transparent", border:"none",
                        color:C.ink, fontFamily:C.mono, fontSize:"0.84rem",
                        padding:"13px 18px", caretColor:C.gold }}
                        placeholder="e.g. HR Executive" value={role}
                        onChange={e=>setRole(e.target.value)}/>
                    </div>
                    {/* Level */}
                    <div style={{ background:C.glass, border:`1px solid ${C.border}`,
                      borderRadius:10, overflow:"hidden", position:"relative" }}>
                      <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
                        background:`linear-gradient(90deg,${C.steel},transparent)` }}/>
                      <div style={{ padding:"12px 18px 10px", borderBottom:`1px solid ${C.border}` }}>
                        <label style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase",
                          color:C.inkDim, fontFamily:C.mono, fontWeight:700 }}>
                          Experience Level
                        </label>
                      </div>
                      <select style={{ width:"100%", background:"transparent", border:"none",
                        color:C.ink, fontFamily:C.mono, fontSize:"0.84rem",
                        padding:"13px 18px", cursor:"pointer", appearance:"none" }}
                        value={level} onChange={e=>setLevel(e.target.value)}>
                        <option value="fresher" style={{ background:C.obsidian }}>Fresher / Entry Level</option>
                        <option value="mid" style={{ background:C.obsidian }}>Mid Level (2–5 years)</option>
                        <option value="senior" style={{ background:C.obsidian }}>Senior (5+ years)</option>
                        <option value="lead" style={{ background:C.obsidian }}>Lead / Manager</option>
                      </select>
                    </div>
                  </motion.div>

                  {/* Question types */}
                  <motion.div variants={itemVariants}
                    style={{ background:C.glass, border:`1px solid ${C.border}`,
                      borderRadius:10, overflow:"hidden" }}>
                    <div style={{ padding:"12px 18px 10px", borderBottom:`1px solid ${C.border}` }}>
                      <label style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase",
                        color:C.inkDim, fontFamily:C.mono, fontWeight:700 }}>
                        Question Types
                      </label>
                    </div>
                    <div style={{ padding:"14px 18px", display:"flex", gap:8, flexWrap:"wrap" }}>
                      {QUESTION_TYPES.map(t => {
                        const active = selectedTypes.includes(t.id);
                        return (
                          <motion.button key={t.id}
                            whileTap={{ scale:0.96, transition:SP.press }}
                            onClick={()=>toggleType(t.id)}
                            style={{ padding:"8px 18px", borderRadius:7, fontSize:11,
                              fontWeight:600, fontFamily:C.mono, letterSpacing:"0.06em",
                              background:active?C.goldTrace:"transparent",
                              color:active?C.gold:C.inkDim,
                              border:`1px solid ${active?C.gold+"50":C.border}`,
                              cursor:"pointer", transition:"all 150ms ease" }}
                            onMouseEnter={e=>{if(!active){e.currentTarget.style.borderColor=C.gold+"40";e.currentTarget.style.color=C.gold;}}}
                            onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}}>
                            {t.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* JD */}
                  <motion.div variants={itemVariants}
                    style={{ background:C.glass, border:`1px solid ${C.border}`,
                      borderRadius:10, overflow:"hidden", position:"relative" }}>
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
                      background:`linear-gradient(90deg,${C.gold},transparent)` }}/>
                    <div style={{ padding:"12px 18px 10px", borderBottom:`1px solid ${C.border}` }}>
                      <label style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase",
                        color:C.inkDim, fontFamily:C.mono, fontWeight:700 }}>
                        Job Description <span style={{ color:C.gold }}>*</span>
                      </label>
                    </div>
                    <textarea style={{ width:"100%", background:"transparent", border:"none",
                      color:C.inkOff, fontFamily:C.mono, fontSize:"0.82rem",
                      padding:"16px 18px", resize:"vertical", lineHeight:1.8,
                      minHeight:180, caretColor:C.gold }}
                      placeholder="Paste the full job description here..."
                      value={jd} onChange={e=>setJd(e.target.value)}/>
                  </motion.div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
                        exit={{ opacity:0 }} transition={SP.arrive}
                        style={{ background:C.crimsonDim, border:`1px solid ${C.crimsonBorder}`,
                          borderRadius:8, padding:"11px 16px", fontSize:11,
                          color:"#ff7070", fontFamily:C.mono }}>
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* CTA */}
                  <motion.button variants={itemVariants}
                    disabled={!jd.trim()||!role.trim()||loading||selectedTypes.length===0}
                    whileHover={!jd.trim()||!role.trim()||loading?{}:{ scale:1.01, transition:SP.snap }}
                    whileTap={!jd.trim()||!role.trim()||loading?{}:{ scale:0.97, transition:SP.press }}
                    onClick={generateQuestions}
                    style={{
                      background:!jd.trim()||!role.trim()||loading||selectedTypes.length===0
                        ?C.glassMid:`linear-gradient(135deg,${C.gold},#A07830)`,
                      color:!jd.trim()||!role.trim()||loading||selectedTypes.length===0
                        ?C.inkDim:C.ink,
                      border:`1px solid ${!jd.trim()||!role.trim()||loading?C.border:"transparent"}`,
                      borderRadius:10, padding:"15px", fontSize:10,
                      letterSpacing:"0.22em", textTransform:"uppercase",
                      fontFamily:C.mono, fontWeight:700, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                    }}>
                    {loading ? (
                      <>
                        <motion.div animate={{ rotate:360 }}
                          transition={{ duration:0.8, repeat:Infinity, ease:"linear" }}
                          style={{ width:12, height:12, border:`2px solid rgba(255,255,255,0.2)`,
                            borderTopColor:C.ink, borderRadius:"50%" }}/>
                        Acquiring targets…
                      </>
                    ) : "Generate Interview Questions →"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ QUESTIONS ══ */}
          {step==="questions" && (
            <motion.div key="questions"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              transition={{ duration:0.2 }}
              style={{ maxWidth:760, margin:"0 auto", padding:"44px 40px 100px",
                position:"relative", zIndex:1 }}>

              {/* Section header */}
              <motion.div
                initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
                transition={SP.arrive}
                style={{ marginBottom:32 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ height:1, width:28, background:C.gold }}/>
                  <span style={{ fontSize:8, letterSpacing:"0.22em", textTransform:"uppercase",
                    color:C.gold, fontFamily:C.mono }}>Targets Acquired</span>
                </div>
                <h2 style={{ fontFamily:C.display, fontStyle:"italic", fontWeight:700,
                  fontSize:38, color:C.ink, letterSpacing:"-1.5px", margin:"0 0 6px" }}>{role}</h2>
                <p style={{ fontSize:11, color:C.inkDim, fontFamily:C.mono }}>
                  {questions.length} questions · {level} level
                </p>
              </motion.div>

              {/* Question cards */}
              <motion.div variants={cardListVariants} initial="hidden" animate="show"
                style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {questions.map((q,i) => (
                  <motion.div key={i} variants={cardItemVariants}
                    onClick={()=>expandCard(i)}
                    whileHover={{ borderColor:C.borderMid, transition:SP.snap }}
                    style={{ border:`1px solid ${activeQ===i?C.gold+"40":C.border}`,
                      borderRadius:12, overflow:"hidden", cursor:"pointer",
                      background:C.glass, position:"relative",
                      transition:"border-color 150ms ease" }}>

                    {/* Scan lock — fires on open */}
                    {scanningQ===i && <ScanLock/>}

                    {/* Top accent */}
                    <div style={{ height:1, background:activeQ===i
                      ?`linear-gradient(90deg,${C.gold},transparent)`
                      :`linear-gradient(90deg,${C.border},transparent)`,
                      transition:"all 200ms ease" }}/>

                    <div style={{ padding:"15px 18px", display:"flex",
                      alignItems:"flex-start", gap:14 }}>
                      {/* Number */}
                      <motion.div
                        animate={{ background:activeQ===i?C.goldTrace:C.glassMid,
                          borderColor:activeQ===i?C.gold+"40":C.border,
                          color:activeQ===i?C.gold:C.inkDim }}
                        transition={{ duration:0.2 }}
                        style={{ width:28, height:28, borderRadius:7,
                          border:`1px solid ${C.border}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:10, fontWeight:700, fontFamily:C.mono, flexShrink:0 }}>
                        {String(i+1).padStart(2,"0")}
                      </motion.div>

                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                          <Tag color={diffColor(q.difficulty)} bg={diffBg(q.difficulty)}
                            border={diffBorder(q.difficulty)}>{q.difficulty}</Tag>
                          <Tag>{q.type}</Tag>
                        </div>
                        <p style={{ fontSize:"0.86rem", fontWeight:600, color:C.inkOff,
                          lineHeight:1.55, fontFamily:C.sans }}>{q.question}</p>
                      </div>

                      <motion.div
                        animate={{ rotate:activeQ===i?180:0 }} transition={SP.snap}
                        style={{ color:C.inkDim, fontSize:10, flexShrink:0 }}>▾</motion.div>
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {activeQ===i && (
                        <motion.div
                          initial={{ height:0, opacity:0 }}
                          animate={{ height:"auto", opacity:1 }}
                          exit={{ height:0, opacity:0 }}
                          transition={{ duration:0.24, ease:[0.16,1,0.3,1] }}
                          style={{ overflow:"hidden" }}>
                          <div style={{ borderTop:`1px solid ${C.border}`,
                            background:C.glassMid, padding:"18px" }}>
                            <div style={{ display:"flex", flexDirection:"column",
                              gap:14, marginBottom:18 }}>
                              {[
                                { label:"What they're looking for", color:C.gold, text:q.what_they_want },
                                { label:"Model answer approach", color:C.sage, text:q.model_answer },
                                { label:"Red flags to avoid", color:C.crimson, text:q.red_flags },
                              ].map((s,j) => (
                                <motion.div key={j}
                                  initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
                                  transition={{ ...SP.arrive, delay:j*0.06 }}>
                                  <div style={{ fontSize:8, fontWeight:700, color:s.color,
                                    letterSpacing:"0.18em", textTransform:"uppercase",
                                    fontFamily:C.mono, marginBottom:6,
                                    display:"flex", alignItems:"center", gap:8 }}>
                                    <div style={{ height:1, width:14, background:s.color }}/>
                                    {s.label}
                                  </div>
                                  <p style={{ fontSize:"0.8rem", color:C.inkMid,
                                    lineHeight:1.75, fontFamily:C.mono }}>{s.text}</p>
                                </motion.div>
                              ))}
                            </div>

                            <motion.button
                              whileTap={{ scale:0.97, transition:SP.press }}
                              onClick={e=>{
                                e.stopPropagation();
                                setPracticeQ(q);setUserAnswer("");setFeedback(null);setStep("practice");
                              }}
                              style={{ background:`linear-gradient(135deg,${C.gold},#A07830)`,
                                color:C.ink, border:"none", borderRadius:8,
                                padding:"10px 22px", fontSize:10, fontWeight:700,
                                letterSpacing:"0.18em", textTransform:"uppercase",
                                fontFamily:C.mono, cursor:"pointer" }}>
                              Practice this →
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ══ PRACTICE ══ */}
          {step==="practice" && practiceQ && (
            <motion.div key="practice"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              transition={{ duration:0.2 }}
              style={{ maxWidth:760, margin:"0 auto", padding:"44px 40px 100px",
                position:"relative", zIndex:1 }}>

              {/* Question card */}
              <motion.div
                initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
                transition={SP.arrive}
                style={{ background:C.glass, border:`1px solid ${C.border}`,
                  borderRadius:12, overflow:"hidden", marginBottom:14,
                  position:"relative" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
                  background:`linear-gradient(90deg,${C.gold},transparent)` }}/>
                <div style={{ padding:"18px" }}>
                  <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
                    <Tag color={diffColor(practiceQ.difficulty)} bg={diffBg(practiceQ.difficulty)}
                      border={diffBorder(practiceQ.difficulty)}>{practiceQ.difficulty}</Tag>
                    <Tag>{practiceQ.type}</Tag>
                  </div>
                  <p style={{ fontSize:"1.05rem", fontFamily:C.display, fontStyle:"italic",
                    fontWeight:600, color:C.ink, lineHeight:1.5 }}>{practiceQ.question}</p>
                </div>
              </motion.div>

              {/* Answer section */}
              <motion.div
                initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
                transition={{ ...SP.arrive, delay:0.06 }}
                style={{ background:C.glass, border:`1px solid ${C.border}`,
                  borderRadius:12, overflow:"hidden", marginBottom:14 }}>
                <div style={{ padding:"12px 18px 10px", borderBottom:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <label style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase",
                    color:C.inkDim, fontFamily:C.mono, fontWeight:700 }}>Your Answer</label>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    {recording && (
                      <motion.span
                        animate={{ opacity:[1,0.3,1] }}
                        transition={{ duration:0.8, repeat:Infinity }}
                        style={{ fontSize:10, color:C.gold, fontFamily:C.mono,
                          fontWeight:700, fontVariantNumeric:"tabular-nums" }}>
                        ● {formatTime(recordingTime)}
                      </motion.span>
                    )}
                    {/* Mic button with radar sweep */}
                    <div style={{ position:"relative", width:38, height:38 }}>
                      {recording && <RadarSweep size={56}/>}
                      <motion.button
                        whileTap={{ scale:0.92, transition:SP.press }}
                        onClick={recording?stopMic:startMic}
                        style={{ width:38, height:38, borderRadius:"50%",
                          background:recording?C.gold:C.glassMid,
                          border:`1px solid ${recording?"transparent":C.borderMid}`,
                          color:C.ink, fontSize:recording?"0.8rem":"1rem",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          cursor:"pointer", position:"relative", zIndex:2 }}>
                        {recording?"■":"🎙"}
                      </motion.button>
                    </div>
                  </div>
                </div>

                {recording && (
                  <motion.div
                    initial={{ opacity:0 }} animate={{ opacity:1 }}
                    style={{ padding:"9px 18px", background:"rgba(201,168,76,0.05)",
                      borderBottom:`1px solid ${C.border}`,
                      fontSize:11, color:C.gold, fontFamily:C.mono }}>
                    ● Recording active — speak clearly. Press ■ when done.
                  </motion.div>
                )}

                <textarea
                  style={{ width:"100%", background:"transparent", border:"none",
                    color:C.inkOff, fontFamily:C.mono, fontSize:"0.83rem",
                    padding:"16px 18px", resize:"vertical", lineHeight:1.8,
                    minHeight:160, caretColor:C.gold, outline:"none" }}
                  placeholder={recording?"Listening…":"Speak using 🎙 or type your answer here..."}
                  value={userAnswer} onChange={e=>setUserAnswer(e.target.value)}/>

                <div style={{ padding:"9px 18px", borderTop:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:9, color:C.inkFaint, fontFamily:C.mono }}>
                    Tip: Use Chrome for voice · you can edit after speaking
                  </span>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
                transition={{ ...SP.arrive, delay:0.1 }}
                style={{ display:"flex", gap:10, marginBottom:18 }}>
                <motion.button
                  whileTap={{ scale:0.97, transition:SP.press }}
                  onClick={()=>{setStep("questions");setFeedback(null);setUserAnswer("");stopMic();}}
                  style={{ background:C.glass, border:`1px solid ${C.border}`,
                    borderRadius:9, padding:"12px 20px", fontSize:10, fontWeight:700,
                    color:C.inkDim, letterSpacing:"0.14em", textTransform:"uppercase",
                    fontFamily:C.mono, cursor:"pointer", transition:"border-color 150ms, color 150ms" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderMid;e.currentTarget.style.color=C.inkOff;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}>
                  ← Back
                </motion.button>

                <motion.button
                  disabled={!userAnswer.trim()||feedbackLoading}
                  whileHover={!userAnswer.trim()||feedbackLoading?{}:{ scale:1.01, transition:SP.snap }}
                  whileTap={!userAnswer.trim()||feedbackLoading?{}:{ scale:0.97, transition:SP.press }}
                  onClick={()=>getFeedback(practiceQ)}
                  style={{ flex:1,
                    background:!userAnswer.trim()||feedbackLoading
                      ?C.glassMid:`linear-gradient(135deg,${C.gold},#A07830)`,
                    color:!userAnswer.trim()||feedbackLoading?C.inkDim:C.ink,
                    border:`1px solid ${!userAnswer.trim()||feedbackLoading?C.border:"transparent"}`,
                    borderRadius:9, padding:"12px", fontSize:10, letterSpacing:"0.2em",
                    textTransform:"uppercase", fontFamily:C.mono, fontWeight:700,
                    cursor:!userAnswer.trim()||feedbackLoading?"not-allowed":"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                  {feedbackLoading ? (
                    <>
                      <motion.div animate={{ rotate:360 }}
                        transition={{ duration:0.8, repeat:Infinity, ease:"linear" }}
                        style={{ width:11, height:11, border:`2px solid rgba(255,255,255,0.2)`,
                          borderTopColor:C.ink, borderRadius:"50%" }}/>
                      Analysing…
                    </>
                  ) : "Get AI Feedback →"}
                </motion.button>
              </motion.div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
                    exit={{ opacity:0 }} transition={SP.arrive}
                    style={{ display:"flex", flexDirection:"column", gap:10 }}>

                    {/* Score card */}
                    <div style={{ background:C.glass, border:`1px solid ${C.border}`,
                      borderRadius:12, overflow:"hidden", position:"relative" }}>
                      <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
                        background:`linear-gradient(90deg,${scoreColor(feedback.score)},transparent)` }}/>
                      <div style={{ padding:"22px", display:"flex", alignItems:"center", gap:24 }}>
                        <div style={{ position:"relative", flexShrink:0 }}>
                          <svg width={90} height={90} viewBox="0 0 90 90">
                            <circle cx={45} cy={45} r={34} fill="none"
                              stroke={C.border} strokeWidth={3}/>
                            <motion.circle cx={45} cy={45} r={34} fill="none"
                              stroke={scoreColor(feedback.score)} strokeWidth={3}
                              strokeLinecap="round"
                              strokeDasharray={`${(feedback.score/10)*2*Math.PI*34} ${2*Math.PI*34}`}
                              transform="rotate(-90 45 45)"
                              initial={{ strokeDasharray:`0 ${2*Math.PI*34}` }}
                              animate={{ strokeDasharray:`${(feedback.score/10)*2*Math.PI*34} ${2*Math.PI*34}` }}
                              transition={{ ...SP.arrive, delay:0.2 }}/>
                            <text x={45} y={41} textAnchor="middle"
                              fill={scoreColor(feedback.score)}
                              style={{ fontSize:24, fontWeight:700, fontFamily:C.display }}>
                              {feedback.score}
                            </text>
                            <text x={45} y={56} textAnchor="middle" fill={C.inkDim}
                              style={{ fontSize:8, fontFamily:C.mono, letterSpacing:"0.1em" }}>
                              / 10
                            </text>
                          </svg>
                        </div>
                        <div>
                          <p style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase",
                            color:C.inkDim, fontFamily:C.mono, marginBottom:8 }}>AI Verdict</p>
                          <p style={{ fontSize:"0.95rem", fontFamily:C.display, fontStyle:"italic",
                            color:C.ink, lineHeight:1.55 }}>{feedback.verdict}</p>
                        </div>
                      </div>
                    </div>

                    {/* Strengths / Improvements / Missing */}
                    {[
                      { label:"Strengths",    color:C.sage,   border:C.sageBorder,   bg:C.sageDim,   items:feedback.strengths },
                      { label:"Improvements", color:C.amber,  border:C.amberBorder,  bg:C.amberDim,  items:feedback.improvements },
                      { label:"Missing",      color:C.crimson,border:C.crimsonBorder,bg:C.crimsonDim,items:feedback.missing },
                    ].map((s,i) => s.items?.length>0 && (
                      <motion.div key={i}
                        initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
                        transition={{ ...SP.arrive, delay:i*0.07 }}
                        style={{ border:`1px solid ${s.border}`, borderRadius:10,
                          overflow:"hidden", background:s.bg }}>
                        <div style={{ padding:"10px 18px", borderBottom:`1px solid ${s.border}` }}>
                          <span style={{ fontSize:9, fontWeight:700, color:s.color,
                            letterSpacing:"0.18em", textTransform:"uppercase",
                            fontFamily:C.mono }}>{s.label}</span>
                        </div>
                        <div style={{ padding:"12px 18px", display:"flex",
                          flexDirection:"column", gap:7 }}>
                          {s.items.map((item,j) => (
                            <div key={j} style={{ display:"flex", gap:10 }}>
                              <span style={{ color:s.color, flexShrink:0, fontSize:8, marginTop:4 }}>◆</span>
                              <span style={{ fontSize:"0.8rem", color:C.inkOff,
                                lineHeight:1.72, fontFamily:C.mono }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}

                    {/* Rewritten answer */}
                    {feedback.rewritten && (
                      <motion.div
                        initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
                        transition={{ ...SP.arrive, delay:0.24 }}
                        style={{ background:C.glass, border:`1px solid ${C.border}`,
                          borderRadius:10, overflow:"hidden", position:"relative" }}>
                        <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
                          background:`linear-gradient(90deg,${C.gold},transparent)` }}/>
                        <div style={{ padding:"10px 18px", borderBottom:`1px solid ${C.border}` }}>
                          <span style={{ fontSize:9, fontWeight:700, color:C.gold,
                            letterSpacing:"0.18em", textTransform:"uppercase",
                            fontFamily:C.mono }}>◈ Suggested Better Answer</span>
                        </div>
                        <div style={{ padding:"14px 18px" }}>
                          <p style={{ fontSize:"0.81rem", color:C.inkMid,
                            lineHeight:1.8, fontFamily:C.mono }}>{feedback.rewritten}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Key hints */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                      gap:6, paddingTop:6 }}>
                      <Key>↵</Key>
                      <span style={{ fontSize:9, color:C.inkFaint, fontFamily:C.mono }}>retry answer</span>
                      <span style={{ color:C.border, margin:"0 4px" }}>·</span>
                      <Key>←</Key>
                      <span style={{ fontSize:9, color:C.inkFaint, fontFamily:C.mono }}>back to questions</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}