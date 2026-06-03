import { useState, useRef, useEffect } from "react";

const C = {
  b100: "#f5ede0", b200: "#e8d8c0", b300: "#c8a878", b400: "#a07848",
  b500: "#7a5430", b600: "#5a3820", b700: "#3a2010",
  bg: "#f5ede0", surface: "#fdf8f2", surfaceDeep: "#ede0cc",
  text: "#3a2010", textSoft: "#6a4828", muted: "#9a7858", mutedLight: "#c0a080",
  success: "#6a8a50", successBg: "#f0f4e8",
  warning: "#b88a30", warningBg: "#faf0d8",
  danger: "#a85840", dangerBg: "#f8ece8",
};

const QUESTION_TYPES = [
  { id: "behavioral", label: "Behavioural" },
  { id: "technical", label: "Technical" },
  { id: "situational", label: "Situational" },
  { id: "culture", label: "Culture Fit" },
];

export default function PrepPal() {
  const [jd, setJd] = useState("");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("fresher");
  const [selectedTypes, setSelectedTypes] = useState(["behavioral", "situational"]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeQ, setActiveQ] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [step, setStep] = useState("input");
  const [practiceQ, setPracticeQ] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const recognitionRef = useRef(null);
  const shouldRecordRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      shouldRecordRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function toggleType(id) {
    setSelectedTypes((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  function reset() {
    stopMic();
    setStep("input"); setQuestions([]); setFeedback(null);
    setUserAnswer(""); setPracticeQ(null); setError("");
  }

  function createRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const r = new SpeechRecognition();
    r.continuous = false; // keep false — we restart manually
    r.interimResults = true;
    r.lang = "en-IN";
    r.maxAlternatives = 1;

    r.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setUserAnswer(finalTranscriptRef.current + interim);
    };

    r.onend = () => {
      if (shouldRecordRef.current) {
        // Auto restart
        try {
          const newR = createRecognition();
          recognitionRef.current = newR;
          newR.start();
        } catch (e) {
          console.error("Restart failed", e);
        }
      }
    };

    r.onerror = (e) => {
      if (e.error === "no-speech" && shouldRecordRef.current) {
        // Restart on no-speech too
        try {
          const newR = createRecognition();
          recognitionRef.current = newR;
          newR.start();
        } catch (err) {
          console.error(err);
        }
      }
    };

    return r;
  }

  function startMic() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported. Please use Chrome.");
      return;
    }
    finalTranscriptRef.current = "";
    setUserAnswer("");
    shouldRecordRef.current = true;
    setRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

    const r = createRecognition();
    recognitionRef.current = r;
    r.start();
  }

  function stopMic() {
    shouldRecordRef.current = false;
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setUserAnswer(finalTranscriptRef.current.trim());
  }

  function handleMicClick() {
    if (recording) stopMic();
    else startMic();
  }

  function formatTime(s) {
    return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  }

  async function generateQuestions() {
    if (!jd.trim() || !role.trim()) return;
    setLoading(true); setError(""); setQuestions([]);

    const prompt = `You are an expert HR interviewer. Generate interview questions based on this job description.
ROLE: ${role}
EXPERIENCE LEVEL: ${level}
QUESTION TYPES: ${selectedTypes.join(", ")}
JOB DESCRIPTION: ${jd}

Return ONLY a raw JSON array. No markdown. No backticks. No explanation. Start your response with [ and end with ]. Structure:
[{"id":1,"type":"behavioral","question":"...","what_they_want":"...","model_answer":"...","red_flags":"...","difficulty":"medium"}]
Generate 8-10 questions specific to the role. difficulty: easy, medium, or hard.`;

    try {
      const res = await fetch("/api/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key":"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" , "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) { setError(`Error ${res.status}`); setLoading(false); return; }
      const data = await res.json();
      const raw = data.content?.map((i) => i.text || "").join("") || "";
      const clean = raw.replace(/`{3}json|`{3}/g, "").trim();
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { setError(`No JSON found. Raw response: ${raw.slice(0, 200)}`); setLoading(false); return; }
      setQuestions(JSON.parse(jsonMatch[0]));
      setStep("questions");
    } catch (e) { setError(e.message); }
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
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "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" , "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) { setFeedbackLoading(false); return; }
      const data = await res.json();
      const raw = data.content?.map((i) => i.text || "").join("") || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { setFeedbackLoading(false); return; }
      setFeedback(JSON.parse(jsonMatch[0]));
    } catch (e) { console.error(e); }
    setFeedbackLoading(false);
  }

  const diffColor = (d) => d === "easy" ? C.success : d === "hard" ? C.danger : C.warning;
  const diffBg = (d) => d === "easy" ? C.successBg : d === "hard" ? C.dangerBg : C.warningBg;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0} body{background:${C.bg}}
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${C.b300};border-radius:4px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ripple{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.5);opacity:0}}
        .anim{animation:fadeUp 0.3s ease forwards}
        .q-card:hover{border-color:${C.b400}!important;box-shadow:0 4px 20px rgba(58,32,16,0.1)!important}
        textarea:focus{border-color:${C.b400}!important;outline:none}
        input:focus{border-color:${C.b400}!important;outline:none}
        select:focus{border-color:${C.b400}!important;outline:none}
        .mic-ripple{animation:ripple 1.5s ease infinite}
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ height: "3px", background: `linear-gradient(90deg, ${C.b700}, ${C.b500}, ${C.b300}, ${C.b500}, ${C.b700})` }} />

        <header style={{ background: C.b700, padding: "1.1rem 2rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ width: "38px", height: "38px", border: `1.5px solid ${C.b300}`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: C.b300, fontSize: "0.9rem", flexShrink: 0 }}>▷</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: "700", color: C.b100 }}>PrepPal</h1>
            <p style={{ fontSize: "0.58rem", color: C.b400, letterSpacing: "0.18em", textTransform: "uppercase" }}>Interview Intelligence · by Divyah</p>
          </div>
          {step !== "input" && <button onClick={reset} style={{ background: "none", border: `1px solid ${C.b600}`, borderRadius: "6px", color: C.b400, fontSize: "0.68rem", padding: "0.3rem 0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← New Session</button>}
        </header>

        <div style={{ height: "1px", background: C.b200 }} />

        {step === "input" && (
          <>
            <div style={{ background: `linear-gradient(160deg, ${C.b500} 0%, ${C.b400} 100%)`, padding: "3rem 2rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", borderRadius: "50%", background: `radial-gradient(circle, ${C.b300}40, transparent 70%)` }} />
              <div style={{ position: "absolute", bottom: "-30px", left: "-30px", width: "150px", height: "150px", borderRadius: "50%", background: `radial-gradient(circle, ${C.b600}60, transparent 70%)` }} />
              <div style={{ display: "inline-block", border: `1px solid ${C.b300}60`, borderRadius: "20px", padding: "0.3rem 1rem", fontSize: "0.6rem", color: C.b200, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "1.25rem", background: "rgba(255,255,255,0.05)", position: "relative" }}>Interview Intelligence</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.6rem", fontWeight: "700", color: C.b100, lineHeight: 1.1, marginBottom: "1rem", position: "relative" }}>Walk in<br /><em style={{ color: C.b200 }}>ready for anything.</em></h2>
              <div style={{ width: "50px", height: "1px", background: C.b200, margin: "0 auto 1rem", opacity: 0.5 }} />
              <p style={{ fontSize: "0.8rem", color: C.b200, lineHeight: 1.8, maxWidth: "360px", margin: "0 auto", fontWeight: "300", position: "relative", opacity: 0.85 }}>Paste a JD, get tailored questions, speak or type your answers, get honest AI feedback.</p>
            </div>
            <div style={{ height: "2px", background: `linear-gradient(90deg, ${C.b500}, ${C.b200}, ${C.b300}, ${C.b200}, ${C.b500})` }} />

            <div style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.62rem", fontWeight: "600", color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Role Title *</label>
                  <input style={{ width: "100%", background: C.surface, border: `1px solid ${C.b200}`, borderRadius: "10px", padding: "0.75rem 1rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: C.text }} placeholder="e.g. HR Executive" value={role} onChange={(e) => setRole(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: "0.62rem", fontWeight: "600", color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Experience Level</label>
                  <select style={{ width: "100%", background: C.surface, border: `1px solid ${C.b200}`, borderRadius: "10px", padding: "0.75rem 1rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: C.text, cursor: "pointer" }} value={level} onChange={(e) => setLevel(e.target.value)}>
                    <option value="fresher">Fresher / Entry Level</option>
                    <option value="mid">Mid Level (2-5 years)</option>
                    <option value="senior">Senior (5+ years)</option>
                    <option value="lead">Lead / Manager</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.62rem", fontWeight: "600", color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>Question Types</label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {QUESTION_TYPES.map((t) => (
                    <button key={t.id} onClick={() => toggleType(t.id)} style={{ padding: "0.45rem 1rem", borderRadius: "8px", fontSize: "0.72rem", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", background: selectedTypes.includes(t.id) ? C.b500 : C.surface, color: selectedTypes.includes(t.id) ? C.b100 : C.muted, border: `1.5px solid ${selectedTypes.includes(t.id) ? C.b500 : C.b200}` }}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.62rem", fontWeight: "600", color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Job Description *</label>
                <textarea style={{ width: "100%", background: C.surface, border: `1px solid ${C.b200}`, borderRadius: "10px", padding: "1rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: C.text, resize: "vertical", lineHeight: "1.6", minHeight: "200px" }} placeholder="Paste the full job description here..." value={jd} onChange={(e) => setJd(e.target.value)} />
              </div>
              {error && <div style={{ background: C.dangerBg, border: `1px solid rgba(168,88,64,0.25)`, borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.75rem", color: C.danger }}>{error}</div>}
              <button onClick={generateQuestions} disabled={!jd.trim() || !role.trim() || loading || selectedTypes.length === 0} style={{ background: !jd.trim() || !role.trim() || loading ? C.b200 : C.b700, color: !jd.trim() || !role.trim() || loading ? C.muted : C.b100, border: "none", borderRadius: "10px", padding: "0.9rem", fontSize: "0.75rem", fontWeight: "600", cursor: !jd.trim() || !role.trim() || loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {loading ? "◌  Generating..." : "▷  Generate Interview Questions"}
              </button>
            </div>
          </>
        )}

        {step === "questions" && (
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: "700", color: C.text }}>{role}</h2>
              <p style={{ fontSize: "0.72rem", color: C.muted, marginTop: "3px" }}>{questions.length} questions · {level} level</p>
            </div>
            <div style={{ height: "1px", background: `linear-gradient(90deg, ${C.b400}, ${C.b200})`, marginBottom: "0.5rem" }} />
            {questions.map((q, i) => (
              <div key={i} className="anim q-card" style={{ background: C.surface, border: `1px solid ${C.b200}`, borderRadius: "14px", overflow: "hidden", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 8px rgba(58,32,16,0.04)" }} onClick={() => setActiveQ(activeQ === i ? null : i)}>
                <div style={{ height: "2px", background: `linear-gradient(90deg, ${C.b500}, ${C.b300})` }} />
                <div style={{ padding: "1.1rem 1.25rem", display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                  <div style={{ width: "26px", height: "26px", background: C.surfaceDeep, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "700", color: C.b500, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ background: C.surfaceDeep, color: C.b500, fontSize: "0.58rem", fontWeight: "700", padding: "0.15rem 0.5rem", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{q.type}</span>
                      <span style={{ background: diffBg(q.difficulty), color: diffColor(q.difficulty), fontSize: "0.58rem", fontWeight: "700", padding: "0.15rem 0.5rem", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{q.difficulty}</span>
                    </div>
                    <p style={{ fontSize: "0.84rem", fontWeight: "600", color: C.text, lineHeight: 1.5 }}>{q.question}</p>
                  </div>
                  <div style={{ color: C.b300, fontSize: "0.75rem", flexShrink: 0, transition: "transform 0.2s", transform: activeQ === i ? "rotate(180deg)" : "none" }}>▼</div>
                </div>
                {activeQ === i && (
                  <div style={{ borderTop: `1px solid ${C.b200}`, padding: "1.1rem 1.25rem", background: C.surfaceDeep, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    {[{ label: "What they're looking for", color: C.b500, text: q.what_they_want }, { label: "Model answer approach", color: C.success, text: q.model_answer }, { label: "Red flags to avoid", color: C.danger, text: q.red_flags }].map((s, j) => (
                      <div key={j}>
                        <div style={{ fontSize: "0.58rem", fontWeight: "700", color: s.color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>{s.label}</div>
                        <div style={{ height: "1px", background: C.b200, marginBottom: "0.4rem" }} />
                        <p style={{ fontSize: "0.78rem", color: C.textSoft, lineHeight: 1.6, fontWeight: "300" }}>{s.text}</p>
                      </div>
                    ))}
                    <button onClick={(e) => { e.stopPropagation(); setPracticeQ(q); setUserAnswer(""); setFeedback(null); setStep("practice"); }} style={{ background: C.b700, color: C.b100, border: "none", borderRadius: "8px", padding: "0.6rem 1.25rem", fontSize: "0.72rem", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", alignSelf: "flex-start" }}>▷ Practice this question</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {step === "practice" && practiceQ && (
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.b200}`, borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ height: "2px", background: `linear-gradient(90deg, ${C.b500}, ${C.b300})` }} />
              <div style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem" }}>
                  <span style={{ background: C.surfaceDeep, color: C.b500, fontSize: "0.58rem", fontWeight: "700", padding: "0.15rem 0.5rem", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{practiceQ.type}</span>
                  <span style={{ background: diffBg(practiceQ.difficulty), color: diffColor(practiceQ.difficulty), fontSize: "0.58rem", fontWeight: "700", padding: "0.15rem 0.5rem", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{practiceQ.difficulty}</span>
                </div>
                <p style={{ fontSize: "1rem", fontFamily: "'Playfair Display', serif", fontWeight: "600", color: C.text, lineHeight: 1.5 }}>{practiceQ.question}</p>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.62rem", fontWeight: "600", color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Your Answer</label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {recording && <span style={{ fontSize: "0.7rem", color: C.danger, fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>● {formatTime(recordingTime)}</span>}
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {recording && <div className="mic-ripple" style={{ position: "absolute", width: "44px", height: "44px", borderRadius: "50%", border: `2px solid ${C.danger}`, pointerEvents: "none" }} />}
                    <button onClick={handleMicClick} style={{ width: "40px", height: "40px", borderRadius: "50%", background: recording ? C.danger : C.b500, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", color: C.b100, transition: "all 0.2s" }}>
                      {recording ? "■" : "🎙"}
                    </button>
                  </div>
                </div>
              </div>
              {recording && <div style={{ background: C.dangerBg, border: `1px solid rgba(168,88,64,0.2)`, borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "0.72rem", color: C.danger, marginBottom: "0.5rem" }}>● Recording... speak clearly. Click ■ when done.</div>}
              <textarea style={{ width: "100%", background: C.surface, border: `1px solid ${C.b200}`, borderRadius: "10px", padding: "1rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: C.text, resize: "vertical", lineHeight: "1.7", minHeight: "160px" }} placeholder={recording ? "Listening..." : "Speak using 🎙 or type your answer..."} value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} />
              <p style={{ fontSize: "0.65rem", color: C.mutedLight, marginTop: "0.4rem" }}>Tip: Use Chrome. You can edit the transcription after speaking.</p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => { setStep("questions"); setFeedback(null); setUserAnswer(""); stopMic(); }} style={{ background: C.surface, border: `1px solid ${C.b200}`, borderRadius: "10px", padding: "0.75rem 1.25rem", fontSize: "0.72rem", fontWeight: "600", color: C.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
              <button onClick={() => getFeedback(practiceQ)} disabled={!userAnswer.trim() || feedbackLoading} style={{ flex: 1, background: !userAnswer.trim() || feedbackLoading ? C.b200 : C.b700, color: !userAnswer.trim() || feedbackLoading ? C.muted : C.b100, border: "none", borderRadius: "10px", padding: "0.75rem", fontSize: "0.75rem", fontWeight: "600", cursor: !userAnswer.trim() || feedbackLoading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em" }}>
                {feedbackLoading ? "◌  Analysing..." : "▷  Get AI Feedback"}
              </button>
            </div>

            {feedback && (
              <div className="anim" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ background: C.surface, border: `1px solid ${C.b200}`, borderRadius: "14px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
                  <div style={{ width: "58px", height: "58px", borderRadius: "50%", border: `2px solid ${feedback.score >= 7 ? C.success : feedback.score >= 5 ? C.warning : C.danger}`, background: feedback.score >= 7 ? C.successBg : feedback.score >= 5 ? C.warningBg : C.dangerBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: "700", color: feedback.score >= 7 ? C.success : feedback.score >= 5 ? C.warning : C.danger }}>{feedback.score}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.6rem", color: C.mutedLight, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Score / 10</div>
                    <p style={{ fontSize: "0.85rem", fontWeight: "600", color: C.text }}>{feedback.verdict}</p>
                  </div>
                </div>
                {[{ label: "✓ Strengths", color: C.success, bg: C.successBg, border: "rgba(106,138,80,0.2)", items: feedback.strengths }, { label: "△ Improvements", color: C.warning, bg: C.warningBg, border: "rgba(184,138,48,0.2)", items: feedback.improvements }, { label: "✕ Missing", color: C.danger, bg: C.dangerBg, border: "rgba(168,88,64,0.2)", items: feedback.missing }].map((s, i) => s.items?.length > 0 && (
                  <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "12px", padding: "1rem 1.25rem" }}>
                    <div style={{ fontSize: "0.6rem", fontWeight: "700", color: s.color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>{s.label}</div>
                    <div style={{ height: "1px", background: C.b200, marginBottom: "0.6rem" }} />
                    {s.items.map((item, j) => <div key={j} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.3rem" }}><span style={{ color: s.color, flexShrink: 0 }}>·</span><span style={{ fontSize: "0.78rem", color: C.textSoft, lineHeight: 1.6, fontWeight: "300" }}>{item}</span></div>)}
                  </div>
                ))}
                {feedback.rewritten && (
                  <div style={{ background: C.surfaceDeep, border: `1px solid ${C.b200}`, borderRadius: "12px", padding: "1rem 1.25rem" }}>
                    <div style={{ fontSize: "0.6rem", fontWeight: "700", color: C.b500, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>◈ Suggested Better Answer</div>
                    <div style={{ height: "1px", background: C.b200, marginBottom: "0.6rem" }} />
                    <p style={{ fontSize: "0.78rem", color: C.textSoft, lineHeight: 1.7, fontWeight: "300" }}>{feedback.rewritten}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div style={{ height: "2px", background: `linear-gradient(90deg, ${C.b700}, ${C.b400}, ${C.b300}, ${C.b400}, ${C.b700})`, marginTop: "2rem" }} />
      </div>
    </>
  );
}