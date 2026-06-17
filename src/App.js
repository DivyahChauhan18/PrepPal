import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  void:"#080808",obsidian:"#101010",obsidianMid:"#141414",obsidianLight:"#1C1C1C",
  glass:"rgba(255,255,255,0.03)",glassMid:"rgba(255,255,255,0.05)",
  border:"rgba(255,255,255,0.07)",borderMid:"rgba(255,255,255,0.12)",borderHigh:"rgba(255,255,255,0.20)",
  gold:"#C9A84C",goldDim:"rgba(201,168,76,0.45)",goldFaint:"rgba(201,168,76,0.12)",goldTrace:"rgba(201,168,76,0.06)",
  steel:"#90A4AE",steelDim:"rgba(144,164,174,0.45)",steelFaint:"rgba(144,164,174,0.12)",
  ink:"#F5F0E8",inkOff:"rgba(245,240,232,0.88)",inkMid:"rgba(245,240,232,0.55)",
  inkDim:"rgba(245,240,232,0.30)",inkFaint:"rgba(245,240,232,0.12)",inkTrace:"rgba(245,240,232,0.05)",
  sage:"#3D9E6A",sageDim:"rgba(61,158,106,0.14)",sageBorder:"rgba(61,158,106,0.28)",
  amber:"#D4860A",amberDim:"rgba(212,134,10,0.12)",amberBorder:"rgba(212,134,10,0.28)",
  crimson:"#C03030",crimsonDim:"rgba(192,48,48,0.12)",crimsonBorder:"rgba(192,48,48,0.28)",
  display:"'Cormorant Garamond', Georgia, serif",
  mono:"'DM Mono', monospace",
  sans:"'Plus Jakarta Sans', system-ui, sans-serif",
};

const SP = {
  snap:   { type:"spring", stiffness:500, damping:32 },
  arrive: { type:"spring", stiffness:360, damping:28, mass:1 },
  press:  { type:"spring", stiffness:600, damping:36, mass:0.8 },
  card:   { type:"spring", stiffness:320, damping:28, mass:1.1 },
};

const QUESTION_TYPES = [
  { id:"behavioral",  label:"Behavioural" },
  { id:"technical",   label:"Technical"   },
  { id:"situational", label:"Situational" },
  { id:"culture",     label:"Culture Fit" },
];

const FILLER_WORDS = ["um","uh","like","basically","you know","sort of","kind of","literally","actually","so","right","okay","well","i mean","just","very","really","quite"];

function scoreColor(s) { return s>=7?C.sage:s>=5?C.amber:C.crimson; }
function diffColor(d)  { return d==="easy"?C.sage:d==="hard"?C.crimson:C.amber; }
function diffBorder(d) { return d==="easy"?C.sageBorder:d==="hard"?C.crimsonBorder:C.amberBorder; }
function diffBg(d)     { return d==="easy"?C.sageDim:d==="hard"?C.crimsonDim:C.amberDim; }

function detectFillerWords(text) {
  const lower = text.toLowerCase();
  const found = {};
  FILLER_WORDS.forEach(w => {
    const re = new RegExp(`\\b${w.replace(/\s+/g,"\\s+")}\\b`, "gi");
    const matches = lower.match(re);
    if (matches) found[w] = matches.length;
  });
  return found;
}

function highlightFillers(text, fillers) {
  if (!Object.keys(fillers).length) return text;
  const pattern = Object.keys(fillers).map(w => w.replace(/\s+/g,"\\s+")).join("|");
  const re = new RegExp(`\\b(${pattern})\\b`, "gi");
  return text.replace(re, match => `__FILLER__${match}__FILLER__`);
}

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

function Key({ children }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
      padding:"2px 7px", background:C.glassMid, border:`1px solid ${C.borderMid}`,
      borderRadius:4, fontSize:9, fontFamily:C.mono, color:C.inkDim }}>
      {children}
    </span>
  );
}

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
    const cx = canvas.width*0.72, cy = canvas.height*0.5;
    const R = Math.min(canvas.width,canvas.height)*0.38;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      angleRef.current += 0.004;
      ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.strokeStyle="rgba(201,168,76,0.25)";ctx.lineWidth=1;ctx.stroke();
      for(let i=0;i<36;i++){if(i%4===0)continue;const a=angleRef.current+(i/36)*Math.PI*2;const x1=cx+(R+4)*Math.cos(a),y1=cy+(R+4)*Math.sin(a),x2=cx+(R+10)*Math.cos(a),y2=cy+(R+10)*Math.sin(a);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle="rgba(201,168,76,0.45)";ctx.lineWidth=1.5;ctx.stroke();}
      ctx.beginPath();ctx.arc(cx,cy,R*0.65,0,Math.PI*2);ctx.strokeStyle="rgba(144,164,174,0.15)";ctx.lineWidth=0.75;ctx.stroke();
      const ia=-angleRef.current*2.5,cl=R*0.55;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const gapR=R*0.08;const lineA=ia+(dx!==0?(dx>0?0:Math.PI):(dy>0?Math.PI/2:-Math.PI/2));ctx.beginPath();ctx.moveTo(cx+Math.cos(lineA)*gapR,cy+Math.sin(lineA)*gapR);ctx.lineTo(cx+Math.cos(lineA)*cl,cy+Math.sin(lineA)*cl);ctx.strokeStyle="rgba(201,168,76,0.55)";ctx.lineWidth=1;ctx.stroke();});
      ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fillStyle="rgba(201,168,76,0.70)";ctx.fill();
      const bSize=R*0.18,bR=R*1.05;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{const bx=cx+sx*bR*0.7,by=cy+sy*bR*0.42;ctx.strokeStyle="rgba(144,164,174,0.40)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+sx*bSize,by);ctx.stroke();ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx,by+sy*bSize);ctx.stroke();});
      [0.3,0.85].forEach(f=>{ctx.beginPath();ctx.arc(cx,cy,R*f,0,Math.PI*2);ctx.strokeStyle="rgba(144,164,174,0.08)";ctx.lineWidth=0.5;ctx.stroke();});
      frameRef.current=requestAnimationFrame(draw);
    };
    frameRef.current=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(frameRef.current);
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.85}}/>;
}

function RadarSweep({ size=56 }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const angleRef = useRef(0);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");canvas.width=size;canvas.height=size;
    const cx=size/2,cy=size/2,r=size/2-3;
    const draw=()=>{
      ctx.clearRect(0,0,size,size);angleRef.current+=0.05;
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle="rgba(201,168,76,0.20)";ctx.lineWidth=1.5;ctx.stroke();
      for(let t=0;t<30;t++){const ta=angleRef.current-(t/30)*(Math.PI*0.8);const op=(1-t/30)*0.55;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,ta-0.04,ta);ctx.closePath();ctx.fillStyle=`rgba(201,168,76,${op})`;ctx.fill();}
      const tx=cx+r*Math.cos(angleRef.current),ty=cy+r*Math.sin(angleRef.current);
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(tx,ty);ctx.strokeStyle="rgba(201,168,76,0.9)";ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,2.5,0,Math.PI*2);ctx.fillStyle=C.gold;ctx.fill();
      frameRef.current=requestAnimationFrame(draw);
    };
    frameRef.current=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(frameRef.current);
  },[size]);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:-(size/2-19),width:size,height:size,pointerEvents:"none"}}/>;
}

function ScanLock() {
  return (
    <motion.div initial={{scaleY:0,opacity:1}} animate={{scaleY:1,opacity:0}}
      transition={{duration:0.4,ease:[0.4,0,0.6,1]}}
      style={{position:"absolute",top:0,left:0,right:0,bottom:0,
        background:`linear-gradient(180deg,${C.gold} 0%,transparent 4%,transparent 96%,${C.gold} 100%)`,
        pointerEvents:"none",zIndex:5,originY:0,transformBox:"fill-box"}}/>
  );
}

/* ── Filler word highlighted text ── */
function FillerHighlight({ text, fillers }) {
  const parts = text.split(/__FILLER__(.*?)__FILLER__/g);
  return (
    <span>
      {parts.map((p,i) => i%2===1
        ? <mark key={i} style={{background:"rgba(192,48,48,0.25)",color:C.crimson,borderRadius:2,padding:"0 2px"}}>{p}</mark>
        : p)}
    </span>
  );
}

export default function PrepPal() {
  const [jd,setJd]                         = useState("");
  const [role,setRole]                     = useState("");
  const [company,setCompany]               = useState("");
  const [level,setLevel]                   = useState("fresher");
  const [selectedTypes,setSelectedTypes]   = useState(["behavioral","situational"]);
  const [questions,setQuestions]           = useState([]);
  const [loading,setLoading]               = useState(false);
  const [error,setError]                   = useState("");
  const [activeQ,setActiveQ]               = useState(null);
  const [scanningQ,setScanningQ]           = useState(null);
  const [userAnswer,setUserAnswer]         = useState("");
  const [feedback,setFeedback]             = useState(null);
  const [feedbackLoading,setFeedbackLoading] = useState(false);
  const [step,setStep]                     = useState("input");
  const [practiceQ,setPracticeQ]           = useState(null);
  const [recording,setRecording]           = useState(false);
  const [recordingTime,setRecordingTime]   = useState(0);
  const [fillerWords,setFillerWords]       = useState({});
  const [followUps,setFollowUps]           = useState([]);
  const [followUpLoading,setFollowUpLoading] = useState(false);
  // Mock interview mode
  const [mockMode,setMockMode]             = useState(false);
  const [mockIndex,setMockIndex]           = useState(0);
  const [mockCountdown,setMockCountdown]   = useState(null);
  const [mockComplete,setMockComplete]     = useState(false); // eslint-disable-line no-unused-vars
  const [mockAnswers,setMockAnswers]       = useState([]);

  const recognitionRef     = useRef(null);
  const shouldRecordRef    = useRef(false);
  const finalTranscriptRef = useRef("");
  const timerRef           = useRef(null);
  const countdownRef       = useRef(null);

  useEffect(()=>{
    return()=>{
      shouldRecordRef.current=false;
      if(recognitionRef.current)recognitionRef.current.stop();
      if(timerRef.current)clearInterval(timerRef.current);
      if(countdownRef.current)clearInterval(countdownRef.current);
    };
  },[]);

  function toggleType(id){setSelectedTypes(prev=>prev.includes(id)?prev.filter(t=>t!==id):[...prev,id]);}

  function reset(){
    stopMic();setStep("input");setQuestions([]);setFeedback(null);
    setUserAnswer("");setPracticeQ(null);setError("");setActiveQ(null);setScanningQ(null);
    setFillerWords({});setFollowUps([]);setMockMode(false);setMockIndex(0);
    setMockCountdown(null);setMockComplete(false);setMockAnswers([]);
    if(countdownRef.current)clearInterval(countdownRef.current);
  }

  function createRecognition(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return null;
    const r=new SR();r.continuous=false;r.interimResults=true;r.lang="en-IN";r.maxAlternatives=1;
    r.onresult=(event)=>{
      let interim="";
      for(let i=event.resultIndex;i<event.results.length;i++){
        if(event.results[i].isFinal)finalTranscriptRef.current+=event.results[i][0].transcript+" ";
        else interim+=event.results[i][0].transcript;
      }
      setUserAnswer(finalTranscriptRef.current+interim);
    };
    r.onend=()=>{if(shouldRecordRef.current){try{const n=createRecognition();recognitionRef.current=n;n.start();}catch(e){}}};
    r.onerror=(e)=>{if(e.error==="no-speech"&&shouldRecordRef.current){try{const n=createRecognition();recognitionRef.current=n;n.start();}catch(e2){}}};
    return r;
  }

  function startMic(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Please use Chrome for voice input.");return;}
    finalTranscriptRef.current="";setUserAnswer("");setFillerWords({});
    shouldRecordRef.current=true;setRecording(true);setRecordingTime(0);
    timerRef.current=setInterval(()=>setRecordingTime(t=>t+1),1000);
    const r=createRecognition();recognitionRef.current=r;r.start();
  }

  function stopMic(){
    shouldRecordRef.current=false;setRecording(false);
    if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}
    if(recognitionRef.current){try{recognitionRef.current.stop();}catch(e){}recognitionRef.current=null;}
    const final=finalTranscriptRef.current.trim();
    setUserAnswer(final);
    if(final){const f=detectFillerWords(final);setFillerWords(f);}
  }

  function formatTime(s){return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;}

  function expandCard(i){
    if(activeQ===i){setActiveQ(null);setScanningQ(null);return;}
    setScanningQ(i);setActiveQ(i);setTimeout(()=>setScanningQ(null),500);
  }

  async function generateQuestions(){
    if(!jd.trim()||!role.trim())return;
    setLoading(true);setError("");setQuestions([]);
    const companyLine=company.trim()?`COMPANY: ${company.trim()}\n`:"";
    const prompt=`You are an expert HR interviewer. Generate interview questions.
ROLE: ${role}
${companyLine}EXPERIENCE LEVEL: ${level}
QUESTION TYPES: ${selectedTypes.join(", ")}
JOB DESCRIPTION: ${jd}
${company.trim()?`Make questions specific to what ${company.trim()} typically asks for this role.`:""}
Return ONLY a raw JSON array. No markdown. No backticks. Start with [ end with ].
[{"id":1,"type":"behavioral","question":"...","what_they_want":"...","model_answer":"...","red_flags":"...","difficulty":"medium"}]
Generate 8-10 questions. difficulty: easy, medium, or hard.`;
    try{
      const res=await fetch("/api/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:4000,messages:[{role:"user",content:prompt}]})});
      if(!res.ok){setError(`Error ${res.status}`);setLoading(false);return;}
      const data=await res.json();
      const raw=data.content?.map(i=>i.text||"").join("")||"";
      const match=raw.match(/\[[\s\S]*\]/);
      if(!match){setError("Failed to parse questions.");setLoading(false);return;}
      setQuestions(JSON.parse(match[0]));setStep("questions");
    }catch(e){setError(e.message);}
    setLoading(false);
  }

  async function getFeedback(question,answer){
    const ans=answer||userAnswer;
    if(!ans.trim())return;
    setFeedbackLoading(true);setFeedback(null);setFollowUps([]);
    const fillers=detectFillerWords(ans);setFillerWords(fillers);
    const fillerCount=Object.values(fillers).reduce((a,b)=>a+b,0);
    const fillerNote=fillerCount>0?`\nFiller words detected (${fillerCount} total): ${Object.entries(fillers).map(([w,c])=>`"${w}" x${c}`).join(", ")}. Factor this into the feedback.`:"";
    const durationNote=recordingTime>0?`\nAnswer duration: ${formatTime(recordingTime)} (ideal: 01:30–02:00)`:"";
    const prompt=`You are an expert interview coach. Give honest feedback.
QUESTION: ${question.question}
WHAT INTERVIEWERS WANT: ${question.what_they_want}
MODEL ANSWER: ${question.model_answer}
RED FLAGS: ${question.red_flags}
CANDIDATE'S ANSWER: ${ans}${fillerNote}${durationNote}
Return ONLY valid JSON: {"score":7,"verdict":"...","strengths":["..."],"improvements":["..."],"missing":["..."],"rewritten":"...","fillerFeedback":"..."}
fillerFeedback: brief note on filler words if any, empty string if none.`;
    try{
      const res=await fetch("/api/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      if(!res.ok){setFeedbackLoading(false);return;}
      const data=await res.json();
      const raw=data.content?.map(i=>i.text||"").join("")||"";
      const match=raw.match(/\{[\s\S]*\}/);
      if(!match){setFeedbackLoading(false);return;}
      const parsed=JSON.parse(match[0]);
      setFeedback(parsed);
      generateFollowUps(question,ans);
    }catch(e){console.error(e);}
    setFeedbackLoading(false);
  }

  const generateFollowUps = useCallback(async(question,answer)=>{
    setFollowUpLoading(true);
    try{
      const res=await fetch("/api/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:300,messages:[{role:"user",content:`Based on this interview answer, generate 2 sharp follow-up questions an interviewer would ask next. Return ONLY a JSON array of 2 strings. No markdown.\n\nQUESTION: ${question.question}\nANSWER: ${answer.slice(0,600)}`}]})});
      const data=await res.json();
      const raw=data.content?.map(i=>i.text||"").join("")||"";
      const match=raw.match(/\[[\s\S]*\]/);
      if(match)setFollowUps(JSON.parse(match[0]));
    }catch(e){}
    setFollowUpLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ── Mock interview mode ──
  function startMockInterview(){
    setMockMode(true);setMockIndex(0);setMockAnswers([]);setMockComplete(false);
    setUserAnswer("");setFeedback(null);setFillerWords([]);
    setPracticeQ(questions[0]);setStep("practice");
  }

  function submitMockAnswer(){
    const ans=userAnswer.trim();
    if(!ans)return;
    stopMic();
    const newAnswers=[...mockAnswers,{question:questions[mockIndex],answer:ans,time:recordingTime}];
    setMockAnswers(newAnswers);
    const next=mockIndex+1;
    if(next>=questions.length){
      setMockComplete(true);setMockMode(false);setStep("mockSummary");return;
    }
    setMockCountdown(3);
    countdownRef.current=setInterval(()=>{
      setMockCountdown(c=>{
        if(c<=1){
          clearInterval(countdownRef.current);
          setMockIndex(next);setPracticeQ(questions[next]);
          setUserAnswer("");setFeedback(null);setFillerWords({});setRecordingTime(0);
          setMockCountdown(null);return null;
        }
        return c-1;
      });
    },1000);
  }

  const pageVariants={hidden:{opacity:0,scale:0.98},show:{opacity:1,scale:1,transition:{...SP.arrive,staggerChildren:0.06}},exit:{opacity:0,scale:0.98,transition:{duration:0.15}}};
  const itemVariants={hidden:{opacity:0,scale:0.96,y:-6},show:{opacity:1,scale:1,y:0,transition:SP.arrive}};
  const cardListVariants={hidden:{},show:{transition:{staggerChildren:0.045,delayChildren:0.05}}};
  const cardItemVariants={hidden:{opacity:0,scale:0.96,y:-8},show:{opacity:1,scale:1,y:0,transition:SP.card}};

  const fillerCount=Object.values(fillerWords).reduce((a,b)=>a+b,0);
  const highlightedAnswer=fillerCount>0?highlightFillers(userAnswer,fillerWords):null;

  return(
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
        @media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}canvas{display:none;}}
      `}</style>

      <div style={{minHeight:"100vh",background:C.void,fontFamily:C.sans,color:C.inkOff,position:"relative"}}>
        <div style={{position:"fixed",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${C.gold}80,${C.gold},${C.gold}80,transparent)`,zIndex:300}}/>

        {/* HEADER */}
        <header style={{position:"sticky",top:0,zIndex:200,background:"rgba(5,7,9,0.90)",backdropFilter:"blur(24px)",borderBottom:`1px solid ${C.border}`,padding:"0 48px",height:62,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{...SP.arrive,delay:0.05}}
            style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:34,height:34,borderRadius:8,flexShrink:0,background:C.goldFaint,border:`1px solid ${C.gold}50`,display:"flex",alignItems:"center",justifyContent:"center"}}>
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
              <div style={{fontSize:15,fontWeight:700,fontStyle:"italic",color:C.ink,fontFamily:C.display,lineHeight:1}}>PrepPal</div>
              <div style={{fontSize:8,color:C.inkFaint,letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:C.mono,marginTop:2}}>Interview Intelligence · by Divyah</div>
            </div>
          </motion.div>
          <motion.div initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} transition={{...SP.arrive,delay:0.08}}
            style={{display:"flex",alignItems:"center",gap:16}}>
            {step!=="input"&&<div style={{fontFamily:C.mono,fontSize:8,color:C.gold,letterSpacing:"0.18em",textTransform:"uppercase",opacity:0.8}}>{step==="questions"?`${questions.length} TARGETS ACQUIRED`:step==="practice"?mockMode?"MOCK INTERVIEW":"PRACTICE MODE":step==="mockSummary"?"DEBRIEF":""}</div>}
            {step!=="input"&&(
              <motion.button whileTap={{scale:0.97,transition:SP.press}} onClick={reset}
                style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:6,color:C.inkDim,fontSize:9,padding:"7px 16px",fontFamily:C.mono,letterSpacing:"0.14em",textTransform:"uppercase",cursor:"pointer",transition:"border-color 150ms,color 150ms"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}>
                ← New Session
              </motion.button>
            )}
          </motion.div>
        </header>

        <AnimatePresence mode="wait">

          {/* ══ INPUT ══ */}
          {step==="input"&&(
            <motion.div key="input" variants={pageVariants} initial="hidden" animate="show" exit="exit" style={{position:"relative",zIndex:1}}>
              <ReticleCanvas/>
              <div style={{maxWidth:760,padding:"64px 48px 100px"}}>
                <motion.div variants={itemVariants} style={{marginBottom:52}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
                    <div style={{height:1,width:36,background:C.gold}}/>
                    <span style={{fontSize:8,letterSpacing:"0.26em",textTransform:"uppercase",color:C.gold,fontFamily:C.mono,fontWeight:700}}>Acquisition System Online</span>
                  </div>
                  <h1 style={{fontFamily:C.display,fontStyle:"italic",fontWeight:700,fontSize:64,color:C.ink,margin:"0 0 4px",letterSpacing:"-2.5px",lineHeight:0.92}}>Walk in prepared.</h1>
                  <h1 style={{fontFamily:C.display,fontStyle:"italic",fontSize:64,color:C.gold,margin:"0 0 22px",letterSpacing:"-2.5px",lineHeight:0.92}}>Walk out hired.</h1>
                  <p style={{fontSize:14,color:C.inkDim,fontFamily:C.mono,lineHeight:1.85,maxWidth:420}}>Paste a JD, pick your question types, speak or type your answers — get brutally honest AI feedback.</p>
                </motion.div>

                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {/* Role + Level */}
                  <motion.div variants={itemVariants} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",position:"relative"}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${C.gold},transparent)`}}/>
                      <div style={{padding:"12px 18px 10px",borderBottom:`1px solid ${C.border}`}}>
                        <label style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:C.inkDim,fontFamily:C.mono,fontWeight:700}}>Role Title <span style={{color:C.gold}}>*</span></label>
                      </div>
                      <input style={{width:"100%",background:"transparent",border:"none",color:C.ink,fontFamily:C.mono,fontSize:"0.84rem",padding:"13px 18px",caretColor:C.gold}} placeholder="e.g. HR Executive" value={role} onChange={e=>setRole(e.target.value)}/>
                    </div>
                    <div style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",position:"relative"}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${C.steel},transparent)`}}/>
                      <div style={{padding:"12px 18px 10px",borderBottom:`1px solid ${C.border}`}}>
                        <label style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:C.inkDim,fontFamily:C.mono,fontWeight:700}}>Experience Level</label>
                      </div>
                      <select style={{width:"100%",background:"transparent",border:"none",color:C.ink,fontFamily:C.mono,fontSize:"0.84rem",padding:"13px 18px",cursor:"pointer",appearance:"none"}} value={level} onChange={e=>setLevel(e.target.value)}>
                        <option value="fresher" style={{background:C.obsidian}}>Fresher / Entry Level</option>
                        <option value="mid" style={{background:C.obsidian}}>Mid Level (2-5 years)</option>
                        <option value="senior" style={{background:C.obsidian}}>Senior (5+ years)</option>
                        <option value="lead" style={{background:C.obsidian}}>Lead / Manager</option>
                      </select>
                    </div>
                  </motion.div>

                  {/* Company field */}
                  <motion.div variants={itemVariants} style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",position:"relative"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${C.steel},transparent)`}}/>
                    <div style={{padding:"12px 18px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <label style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:C.inkDim,fontFamily:C.mono,fontWeight:700}}>Company Name</label>
                      <span style={{fontSize:9,color:C.inkFaint,fontFamily:C.mono,letterSpacing:"0.08em"}}>optional — unlocks company-specific questions</span>
                    </div>
                    <input style={{width:"100%",background:"transparent",border:"none",color:C.ink,fontFamily:C.mono,fontSize:"0.84rem",padding:"13px 18px",caretColor:C.gold}} placeholder="e.g. Swiggy, Unacademy, Razorpay..." value={company} onChange={e=>setCompany(e.target.value)}/>
                  </motion.div>

                  {/* Question types */}
                  <motion.div variants={itemVariants} style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
                    <div style={{padding:"12px 18px 10px",borderBottom:`1px solid ${C.border}`}}>
                      <label style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:C.inkDim,fontFamily:C.mono,fontWeight:700}}>Question Types</label>
                    </div>
                    <div style={{padding:"14px 18px",display:"flex",gap:8,flexWrap:"wrap"}}>
                      {QUESTION_TYPES.map(t=>{
                        const active=selectedTypes.includes(t.id);
                        return(
                          <motion.button key={t.id} whileTap={{scale:0.96,transition:SP.press}} onClick={()=>toggleType(t.id)}
                            style={{padding:"8px 18px",borderRadius:7,fontSize:11,fontWeight:600,fontFamily:C.mono,letterSpacing:"0.06em",background:active?C.goldTrace:"transparent",color:active?C.gold:C.inkDim,border:`1px solid ${active?C.gold+"50":C.border}`,cursor:"pointer",transition:"all 150ms ease"}}
                            onMouseEnter={e=>{if(!active){e.currentTarget.style.borderColor=C.gold+"40";e.currentTarget.style.color=C.gold;}}}
                            onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}}>
                            {t.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* JD */}
                  <motion.div variants={itemVariants} style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",position:"relative"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${C.gold},transparent)`}}/>
                    <div style={{padding:"12px 18px 10px",borderBottom:`1px solid ${C.border}`}}>
                      <label style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:C.inkDim,fontFamily:C.mono,fontWeight:700}}>Job Description <span style={{color:C.gold}}>*</span></label>
                    </div>
                    <textarea style={{width:"100%",background:"transparent",border:"none",color:C.inkOff,fontFamily:C.mono,fontSize:"0.82rem",padding:"16px 18px",resize:"vertical",lineHeight:1.8,minHeight:180,caretColor:C.gold}} placeholder="Paste the full job description here..." value={jd} onChange={e=>setJd(e.target.value)}/>
                  </motion.div>

                  <AnimatePresence>
                    {error&&(<motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={SP.arrive} style={{background:C.crimsonDim,border:`1px solid ${C.crimsonBorder}`,borderRadius:8,padding:"11px 16px",fontSize:11,color:"#ff7070",fontFamily:C.mono}}>{error}</motion.div>)}
                  </AnimatePresence>

                  <motion.button variants={itemVariants}
                    disabled={!jd.trim()||!role.trim()||loading||selectedTypes.length===0}
                    whileHover={!jd.trim()||!role.trim()||loading?{}:{scale:1.01,transition:SP.snap}}
                    whileTap={!jd.trim()||!role.trim()||loading?{}:{scale:0.97,transition:SP.press}}
                    onClick={generateQuestions}
                    style={{background:!jd.trim()||!role.trim()||loading||selectedTypes.length===0?C.glassMid:`linear-gradient(135deg,${C.gold},#A07830)`,color:!jd.trim()||!role.trim()||loading||selectedTypes.length===0?C.inkDim:C.ink,border:`1px solid ${!jd.trim()||!role.trim()||loading?C.border:"transparent"}`,borderRadius:10,padding:"15px",fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",fontFamily:C.mono,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                    {loading?(<><motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}} style={{width:12,height:12,border:`2px solid rgba(255,255,255,0.2)`,borderTopColor:C.ink,borderRadius:"50%"}}/>Acquiring targets…</>):"Generate Interview Questions →"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ QUESTIONS ══ */}
          {step==="questions"&&(
            <motion.div key="questions" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
              style={{maxWidth:760,margin:"0 auto",padding:"44px 40px 100px",position:"relative",zIndex:1}}>
              <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={SP.arrive} style={{marginBottom:32}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <div style={{height:1,width:28,background:C.gold}}/>
                  <span style={{fontSize:8,letterSpacing:"0.22em",textTransform:"uppercase",color:C.gold,fontFamily:C.mono}}>Targets Acquired</span>
                </div>
                <h2 style={{fontFamily:C.display,fontStyle:"italic",fontWeight:700,fontSize:38,color:C.ink,letterSpacing:"-1.5px",margin:"0 0 6px"}}>{role}{company?` · ${company}`:""}</h2>
                <p style={{fontSize:11,color:C.inkDim,fontFamily:C.mono}}>{questions.length} questions · {level} level</p>

                {/* Mock interview mode button */}
                <motion.button initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}
                  whileTap={{scale:0.97,transition:SP.press}}
                  onClick={startMockInterview}
                  style={{marginTop:16,background:C.goldTrace,border:`1px solid ${C.gold}50`,borderRadius:8,padding:"10px 22px",fontSize:10,fontWeight:700,color:C.gold,letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:C.mono,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8,transition:"all 150ms"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=C.goldFaint;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=C.goldTrace;}}>
                  ▶ Start Mock Interview
                  <span style={{fontSize:9,color:C.inkDim,fontWeight:400}}>all {questions.length} questions · 3s between</span>
                </motion.button>
              </motion.div>

              <motion.div variants={cardListVariants} initial="hidden" animate="show" style={{display:"flex",flexDirection:"column",gap:8}}>
                {questions.map((q,i)=>(
                  <motion.div key={i} variants={cardItemVariants} onClick={()=>expandCard(i)}
                    whileHover={{borderColor:C.borderMid,transition:SP.snap}}
                    style={{border:`1px solid ${activeQ===i?C.gold+"40":C.border}`,borderRadius:12,overflow:"hidden",cursor:"pointer",background:C.glass,position:"relative",transition:"border-color 150ms ease"}}>
                    {scanningQ===i&&<ScanLock/>}
                    <div style={{height:1,background:activeQ===i?`linear-gradient(90deg,${C.gold},transparent)`:`linear-gradient(90deg,${C.border},transparent)`,transition:"all 200ms ease"}}/>
                    <div style={{padding:"15px 18px",display:"flex",alignItems:"flex-start",gap:14}}>
                      <motion.div animate={{background:activeQ===i?C.goldTrace:C.glassMid,borderColor:activeQ===i?C.gold+"40":C.border,color:activeQ===i?C.gold:C.inkDim}} transition={{duration:0.2}}
                        style={{width:28,height:28,borderRadius:7,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,fontFamily:C.mono,flexShrink:0}}>
                        {String(i+1).padStart(2,"0")}
                      </motion.div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                          <Tag color={diffColor(q.difficulty)} bg={diffBg(q.difficulty)} border={diffBorder(q.difficulty)}>{q.difficulty}</Tag>
                          <Tag>{q.type}</Tag>
                        </div>
                        <p style={{fontSize:"0.86rem",fontWeight:600,color:C.inkOff,lineHeight:1.55,fontFamily:C.sans}}>{q.question}</p>
                      </div>
                      <motion.div animate={{rotate:activeQ===i?180:0}} transition={SP.snap} style={{color:C.inkDim,fontSize:10,flexShrink:0}}>▾</motion.div>
                    </div>
                    <AnimatePresence>
                      {activeQ===i&&(
                        <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.24,ease:[0.16,1,0.3,1]}} style={{overflow:"hidden"}}>
                          <div style={{borderTop:`1px solid ${C.border}`,background:C.glassMid,padding:"18px"}}>
                            <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:18}}>
                              {[{label:"What they're looking for",color:C.gold,text:q.what_they_want},{label:"Model answer approach",color:C.sage,text:q.model_answer},{label:"Red flags to avoid",color:C.crimson,text:q.red_flags}].map((s,j)=>(
                                <motion.div key={j} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{...SP.arrive,delay:j*0.06}}>
                                  <div style={{fontSize:8,fontWeight:700,color:s.color,letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:C.mono,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                                    <div style={{height:1,width:14,background:s.color}}/>{s.label}
                                  </div>
                                  <p style={{fontSize:"0.8rem",color:C.inkMid,lineHeight:1.75,fontFamily:C.mono}}>{s.text}</p>
                                </motion.div>
                              ))}
                            </div>
                            <motion.button whileTap={{scale:0.97,transition:SP.press}}
                              onClick={e=>{e.stopPropagation();setPracticeQ(q);setUserAnswer("");setFeedback(null);setFillerWords({});setFollowUps([]);setMockMode(false);setStep("practice");}}
                              style={{background:`linear-gradient(135deg,${C.gold},#A07830)`,color:C.ink,border:"none",borderRadius:8,padding:"10px 22px",fontSize:10,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:C.mono,cursor:"pointer"}}>
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
          {step==="practice"&&practiceQ&&(
            <motion.div key="practice" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
              style={{maxWidth:760,margin:"0 auto",padding:"44px 40px 100px",position:"relative",zIndex:1}}>

              {/* Mock mode countdown overlay */}
              <AnimatePresence>
                {mockCountdown!==null&&(
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    style={{position:"fixed",inset:0,background:"rgba(8,8,8,0.85)",zIndex:500,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
                    <div style={{fontFamily:C.mono,fontSize:11,color:C.inkDim,letterSpacing:"0.2em",textTransform:"uppercase"}}>Next question in</div>
                    <motion.div key={mockCountdown} initial={{scale:1.4,opacity:0}} animate={{scale:1,opacity:1}} transition={SP.arrive}
                      style={{fontFamily:C.display,fontStyle:"italic",fontSize:96,color:C.gold,lineHeight:1,letterSpacing:"-4px"}}>
                      {mockCountdown}
                    </motion.div>
                    <div style={{fontFamily:C.mono,fontSize:10,color:C.inkDim,letterSpacing:"0.12em"}}>Question {mockIndex+2} of {questions.length}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mock progress bar */}
              {mockMode&&(
                <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontFamily:C.mono,fontSize:9,color:C.gold,letterSpacing:"0.16em",textTransform:"uppercase"}}>Mock Interview · Question {mockIndex+1} of {questions.length}</span>
                    <span style={{fontFamily:C.mono,fontSize:9,color:C.inkDim}}>{Math.round(((mockIndex)/questions.length)*100)}% complete</span>
                  </div>
                  <div style={{height:2,background:C.border,borderRadius:1,overflow:"hidden"}}>
                    <motion.div animate={{width:`${((mockIndex)/questions.length)*100}%`}} transition={SP.arrive}
                      style={{height:"100%",background:`linear-gradient(90deg,${C.gold},#A07830)`,borderRadius:1}}/>
                  </div>
                </motion.div>
              )}

              {/* Question card */}
              <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={SP.arrive}
                style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:14,position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${C.gold},transparent)`}}/>
                <div style={{padding:"18px"}}>
                  <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                    <Tag color={diffColor(practiceQ.difficulty)} bg={diffBg(practiceQ.difficulty)} border={diffBorder(practiceQ.difficulty)}>{practiceQ.difficulty}</Tag>
                    <Tag>{practiceQ.type}</Tag>
                    {mockMode&&<Tag color={C.gold} bg={C.goldTrace} border={C.goldDim}>Mock Mode</Tag>}
                  </div>
                  <p style={{fontSize:"1.05rem",fontFamily:C.display,fontStyle:"italic",fontWeight:600,color:C.ink,lineHeight:1.5}}>{practiceQ.question}</p>
                </div>
              </motion.div>

              {/* Answer section */}
              <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{...SP.arrive,delay:0.06}}
                style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:14}}>
                <div style={{padding:"12px 18px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <label style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:C.inkDim,fontFamily:C.mono,fontWeight:700}}>Your Answer</label>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    {/* Answer timer */}
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <motion.span animate={{color:recordingTime>=90&&recordingTime<=120?C.sage:recordingTime>120?C.amber:C.inkDim}} transition={{duration:0.3}}
                        style={{fontSize:10,fontFamily:C.mono,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>
                        {formatTime(recordingTime)}
                      </motion.span>
                      <span style={{fontSize:8,color:C.inkFaint,fontFamily:C.mono}}>/ 02:00</span>
                    </div>
                    {recording&&(
                      <motion.span animate={{opacity:[1,0.3,1]}} transition={{duration:0.8,repeat:Infinity}}
                        style={{fontSize:10,color:C.gold,fontFamily:C.mono,fontWeight:700}}>● REC</motion.span>
                    )}
                    {/* Filler word count badge */}
                    {fillerCount>0&&!recording&&(
                      <motion.span initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={SP.arrive}
                        style={{fontSize:9,color:C.crimson,fontFamily:C.mono,fontWeight:700,background:C.crimsonDim,border:`1px solid ${C.crimsonBorder}`,borderRadius:4,padding:"2px 8px"}}>
                        {fillerCount} filler{fillerCount>1?"s":""}
                      </motion.span>
                    )}
                    {/* Mic button */}
                    <div style={{position:"relative",width:38,height:38}}>
                      {recording&&<RadarSweep size={56}/>}
                      <motion.button whileTap={{scale:0.92,transition:SP.press}} onClick={recording?stopMic:startMic}
                        style={{width:38,height:38,borderRadius:"50%",background:recording?C.gold:C.glassMid,border:`1px solid ${recording?"transparent":C.borderMid}`,color:C.ink,fontSize:recording?"0.8rem":"1rem",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative",zIndex:2}}>
                        {recording?"■":"🎙"}
                      </motion.button>
                    </div>
                  </div>
                </div>

                {recording&&(
                  <motion.div initial={{opacity:0}} animate={{opacity:1}}
                    style={{padding:"9px 18px",background:"rgba(201,168,76,0.05)",borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.gold,fontFamily:C.mono}}>
                    ● Recording active — speak clearly. Press ■ when done.
                  </motion.div>
                )}

                {/* Highlighted answer with fillers marked */}
                {highlightedAnswer&&!recording?(
                  <div style={{padding:"16px 18px",minHeight:100,fontFamily:C.mono,fontSize:"0.83rem",color:C.inkOff,lineHeight:1.8}}>
                    <FillerHighlight text={highlightedAnswer} fillers={fillerWords}/>
                    <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:6}}>
                      {Object.entries(fillerWords).map(([w,c])=>(
                        <span key={w} style={{fontSize:9,fontFamily:C.mono,color:C.crimson,background:C.crimsonDim,border:`1px solid ${C.crimsonBorder}`,borderRadius:4,padding:"2px 8px"}}>
                          "{w}" ×{c}
                        </span>
                      ))}
                    </div>
                    <button onClick={()=>{setFillerWords({});setUserAnswer(userAnswer);}} style={{marginTop:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,color:C.inkDim,fontFamily:C.mono,fontSize:9,padding:"3px 10px",cursor:"pointer",letterSpacing:"0.08em"}}>Edit answer</button>
                  </div>
                ):(
                  <textarea style={{width:"100%",background:"transparent",border:"none",color:C.inkOff,fontFamily:C.mono,fontSize:"0.83rem",padding:"16px 18px",resize:"vertical",lineHeight:1.8,minHeight:160,caretColor:C.gold,outline:"none"}}
                    placeholder={recording?"Listening…":"Speak using 🎙 or type your answer here..."}
                    value={userAnswer} onChange={e=>{setUserAnswer(e.target.value);setFillerWords({});}}/>
                )}

                <div style={{padding:"9px 18px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:9,color:C.inkFaint,fontFamily:C.mono}}>Tip: Aim for 90–120 seconds · Use Chrome for voice</span>
                  {recordingTime>0&&!recording&&(
                    <span style={{fontSize:9,fontFamily:C.mono,color:recordingTime>=90&&recordingTime<=120?C.sage:recordingTime<90?C.amber:C.crimson}}>
                      {recordingTime>=90&&recordingTime<=120?"✓ Good length":recordingTime<90?"Too short":"Too long"} ({formatTime(recordingTime)})
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{...SP.arrive,delay:0.1}}
                style={{display:"flex",gap:10,marginBottom:18}}>
                {!mockMode&&(
                  <motion.button whileTap={{scale:0.97,transition:SP.press}}
                    onClick={()=>{setStep("questions");setFeedback(null);setUserAnswer("");stopMic();setFillerWords({});setFollowUps([]);}}
                    style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:9,padding:"12px 20px",fontSize:10,fontWeight:700,color:C.inkDim,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:C.mono,cursor:"pointer",transition:"border-color 150ms,color 150ms"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderMid;e.currentTarget.style.color=C.inkOff;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}>
                    ← Back
                  </motion.button>
                )}
                {mockMode?(
                  <motion.button disabled={!userAnswer.trim()} whileTap={!userAnswer.trim()?{}:{scale:0.97,transition:SP.press}}
                    onClick={submitMockAnswer}
                    style={{flex:1,background:!userAnswer.trim()?C.glassMid:`linear-gradient(135deg,${C.gold},#A07830)`,color:!userAnswer.trim()?C.inkDim:C.ink,border:`1px solid ${!userAnswer.trim()?C.border:"transparent"}`,borderRadius:9,padding:"12px",fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:C.mono,fontWeight:700,cursor:!userAnswer.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                    {mockIndex<questions.length-1?`Submit & Next Question →`:"Submit Final Answer →"}
                  </motion.button>
                ):(
                  <motion.button disabled={!userAnswer.trim()||feedbackLoading}
                    whileHover={!userAnswer.trim()||feedbackLoading?{}:{scale:1.01,transition:SP.snap}}
                    whileTap={!userAnswer.trim()||feedbackLoading?{}:{scale:0.97,transition:SP.press}}
                    onClick={()=>getFeedback(practiceQ)}
                    style={{flex:1,background:!userAnswer.trim()||feedbackLoading?C.glassMid:`linear-gradient(135deg,${C.gold},#A07830)`,color:!userAnswer.trim()||feedbackLoading?C.inkDim:C.ink,border:`1px solid ${!userAnswer.trim()||feedbackLoading?C.border:"transparent"}`,borderRadius:9,padding:"12px",fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:C.mono,fontWeight:700,cursor:!userAnswer.trim()||feedbackLoading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                    {feedbackLoading?(<><motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}} style={{width:11,height:11,border:`2px solid rgba(255,255,255,0.2)`,borderTopColor:C.ink,borderRadius:"50%"}}/>Analysing…</>):"Get AI Feedback →"}
                  </motion.button>
                )}
              </motion.div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback&&!mockMode&&(
                  <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={SP.arrive}
                    style={{display:"flex",flexDirection:"column",gap:10}}>

                    {/* Score card */}
                    <div style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",position:"relative"}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${scoreColor(feedback.score)},transparent)`}}/>
                      <div style={{padding:"22px",display:"flex",alignItems:"center",gap:24}}>
                        <div style={{position:"relative",flexShrink:0}}>
                          <svg width={90} height={90} viewBox="0 0 90 90">
                            <circle cx={45} cy={45} r={34} fill="none" stroke={C.border} strokeWidth={3}/>
                            <motion.circle cx={45} cy={45} r={34} fill="none" stroke={scoreColor(feedback.score)} strokeWidth={3} strokeLinecap="round"
                              strokeDasharray={`${(feedback.score/10)*2*Math.PI*34} ${2*Math.PI*34}`}
                              transform="rotate(-90 45 45)"
                              initial={{strokeDasharray:`0 ${2*Math.PI*34}`}}
                              animate={{strokeDasharray:`${(feedback.score/10)*2*Math.PI*34} ${2*Math.PI*34}`}}
                              transition={{...SP.arrive,delay:0.2}}/>
                            <text x={45} y={41} textAnchor="middle" fill={scoreColor(feedback.score)} style={{fontSize:24,fontWeight:700,fontFamily:C.display}}>{feedback.score}</text>
                            <text x={45} y={56} textAnchor="middle" fill={C.inkDim} style={{fontSize:8,fontFamily:C.mono,letterSpacing:"0.1em"}}>/10</text>
                          </svg>
                        </div>
                        <div style={{flex:1}}>
                          <p style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:C.inkDim,fontFamily:C.mono,marginBottom:8}}>AI Verdict</p>
                          <p style={{fontSize:"0.95rem",fontFamily:C.display,fontStyle:"italic",color:C.ink,lineHeight:1.55}}>{feedback.verdict}</p>
                          {/* Duration feedback */}
                          {recordingTime>0&&(
                            <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontSize:9,fontFamily:C.mono,color:C.inkDim,letterSpacing:"0.1em",textTransform:"uppercase"}}>Duration:</span>
                              <span style={{fontSize:10,fontFamily:C.mono,fontWeight:700,color:recordingTime>=90&&recordingTime<=120?C.sage:C.amber}}>{formatTime(recordingTime)}</span>
                              <span style={{fontSize:9,fontFamily:C.mono,color:C.inkFaint}}>target: 01:30–02:00</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Filler word feedback */}
                    {feedback.fillerFeedback&&(
                      <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{...SP.arrive,delay:0.05}}
                        style={{border:`1px solid ${C.crimsonBorder}`,borderRadius:10,overflow:"hidden",background:C.crimsonDim,padding:"12px 18px",display:"flex",alignItems:"flex-start",gap:12}}>
                        <span style={{fontSize:9,fontWeight:700,color:C.crimson,letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:C.mono,flexShrink:0,marginTop:2}}>Filler words</span>
                        <p style={{fontSize:"0.8rem",color:C.inkOff,lineHeight:1.7,fontFamily:C.mono}}>{feedback.fillerFeedback}</p>
                      </motion.div>
                    )}

                    {[{label:"Strengths",color:C.sage,border:C.sageBorder,bg:C.sageDim,items:feedback.strengths},{label:"Improvements",color:C.amber,border:C.amberBorder,bg:C.amberDim,items:feedback.improvements},{label:"Missing",color:C.crimson,border:C.crimsonBorder,bg:C.crimsonDim,items:feedback.missing}].map((s,i)=>s.items?.length>0&&(
                      <motion.div key={i} initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{...SP.arrive,delay:i*0.07}}
                        style={{border:`1px solid ${s.border}`,borderRadius:10,overflow:"hidden",background:s.bg}}>
                        <div style={{padding:"10px 18px",borderBottom:`1px solid ${s.border}`}}>
                          <span style={{fontSize:9,fontWeight:700,color:s.color,letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:C.mono}}>{s.label}</span>
                        </div>
                        <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:7}}>
                          {s.items.map((item,j)=>(
                            <div key={j} style={{display:"flex",gap:10}}>
                              <span style={{color:s.color,flexShrink:0,fontSize:8,marginTop:4}}>◆</span>
                              <span style={{fontSize:"0.8rem",color:C.inkOff,lineHeight:1.72,fontFamily:C.mono}}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}

                    {/* Rewritten answer */}
                    {feedback.rewritten&&(
                      <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{...SP.arrive,delay:0.24}}
                        style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",position:"relative"}}>
                        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${C.gold},transparent)`}}/>
                        <div style={{padding:"10px 18px",borderBottom:`1px solid ${C.border}`}}>
                          <span style={{fontSize:9,fontWeight:700,color:C.gold,letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:C.mono}}>◈ Suggested Better Answer</span>
                        </div>
                        <div style={{padding:"14px 18px"}}>
                          <p style={{fontSize:"0.81rem",color:C.inkMid,lineHeight:1.8,fontFamily:C.mono}}>{feedback.rewritten}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Adaptive follow-up questions */}
                    {(followUpLoading||followUps.length>0)&&(
                      <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{...SP.arrive,delay:0.3}}
                        style={{background:C.glass,border:`1px solid ${C.gold+"30"}`,borderRadius:10,overflow:"hidden",position:"relative"}}>
                        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${C.gold},transparent)`}}/>
                        <div style={{padding:"10px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:9,fontWeight:700,color:C.gold,letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:C.mono}}>⟳ Adaptive Follow-ups</span>
                          {followUpLoading&&<motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}} style={{width:10,height:10,border:`1.5px solid ${C.border}`,borderTopColor:C.gold,borderRadius:"50%"}}/>}
                        </div>
                        <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:8}}>
                          <p style={{fontSize:9,color:C.inkFaint,fontFamily:C.mono,marginBottom:4}}>Based on your answer, an interviewer would likely ask:</p>
                          {followUps.map((q,i)=>(
                            <motion.button key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{...SP.arrive,delay:i*0.08}}
                              whileTap={{scale:0.98,transition:SP.press}}
                              onClick={()=>{setUserAnswer("");setFeedback(null);setFillerWords({});setFollowUps([]);setPracticeQ({...practiceQ,question:q,what_they_want:"Follow-up on your previous answer",model_answer:"Build on what you said — add specifics, metrics, or outcomes",red_flags:"Contradicting your earlier answer or being vague"});}}
                              style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",background:C.glassMid,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",textAlign:"left",transition:"border-color 150ms"}}
                              onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold+"40"}
                              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                              <span style={{color:C.gold,flexShrink:0,fontFamily:C.mono,fontSize:9,marginTop:2}}>↳</span>
                              <span style={{fontSize:"0.8rem",color:C.inkOff,lineHeight:1.65,fontFamily:C.mono}}>{q}</span>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,paddingTop:6}}>
                      <Key>↵</Key><span style={{fontSize:9,color:C.inkFaint,fontFamily:C.mono}}>retry answer</span>
                      <span style={{color:C.border,margin:"0 4px"}}>·</span>
                      <Key>←</Key><span style={{fontSize:9,color:C.inkFaint,fontFamily:C.mono}}>back to questions</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══ MOCK SUMMARY ══ */}
          {step==="mockSummary"&&(
            <motion.div key="mockSummary" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
              style={{maxWidth:760,margin:"0 auto",padding:"44px 40px 100px",position:"relative",zIndex:1}}>
              <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={SP.arrive} style={{marginBottom:32}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <div style={{height:1,width:28,background:C.gold}}/>
                  <span style={{fontSize:8,letterSpacing:"0.22em",textTransform:"uppercase",color:C.gold,fontFamily:C.mono}}>Mock Interview Complete</span>
                </div>
                <h2 style={{fontFamily:C.display,fontStyle:"italic",fontWeight:700,fontSize:38,color:C.ink,letterSpacing:"-1.5px",margin:"0 0 6px"}}>Debrief</h2>
                <p style={{fontSize:11,color:C.inkDim,fontFamily:C.mono}}>{mockAnswers.length} answers recorded · {role}{company?` · ${company}`:""}</p>
              </motion.div>

              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {mockAnswers.map((item,i)=>(
                  <motion.div key={i} initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{...SP.arrive,delay:i*0.06}}
                    style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",position:"relative"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${C.gold},transparent)`}}/>
                    <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:24,height:24,borderRadius:6,background:C.goldTrace,border:`1px solid ${C.gold+"40"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,fontFamily:C.mono,color:C.gold}}>{String(i+1).padStart(2,"0")}</div>
                        <span style={{fontSize:"0.84rem",fontFamily:C.display,fontStyle:"italic",color:C.ink,lineHeight:1.4}}>{item.question.question}</span>
                      </div>
                      <span style={{fontSize:9,fontFamily:C.mono,color:C.inkDim,flexShrink:0,marginLeft:12}}>{formatTime(item.time)}</span>
                    </div>
                    <div style={{padding:"12px 18px"}}>
                      <p style={{fontSize:"0.78rem",color:C.inkDim,lineHeight:1.75,fontFamily:C.mono}}>{item.answer.slice(0,200)}{item.answer.length>200?"…":""}</p>
                    </div>
                    <div style={{padding:"10px 18px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8}}>
                      <motion.button whileTap={{scale:0.97,transition:SP.press}}
                        onClick={()=>{setPracticeQ(item.question);setUserAnswer(item.answer);setFeedback(null);setFillerWords(detectFillerWords(item.answer));setMockMode(false);setStep("practice");getFeedback(item.question,item.answer);}}
                        style={{background:`linear-gradient(135deg,${C.gold},#A07830)`,color:C.ink,border:"none",borderRadius:6,padding:"7px 16px",fontSize:9,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:C.mono,cursor:"pointer"}}>
                        Get Feedback →
                      </motion.button>
                      <motion.button whileTap={{scale:0.97,transition:SP.press}}
                        onClick={()=>{setPracticeQ(item.question);setUserAnswer("");setFeedback(null);setFillerWords({});setMockMode(false);setStep("practice");}}
                        style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 16px",fontSize:9,fontWeight:700,color:C.inkDim,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:C.mono,cursor:"pointer"}}>
                        Retry
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}} style={{marginTop:20,display:"flex",gap:10}}>
                <motion.button whileTap={{scale:0.97,transition:SP.press}}
                  onClick={()=>setStep("questions")}
                  style={{background:C.glass,border:`1px solid ${C.border}`,borderRadius:9,padding:"12px 24px",fontSize:10,fontWeight:700,color:C.inkDim,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:C.mono,cursor:"pointer"}}>
                  ← Back to Questions
                </motion.button>
                <motion.button whileTap={{scale:0.97,transition:SP.press}}
                  onClick={startMockInterview}
                  style={{background:`linear-gradient(135deg,${C.gold},#A07830)`,color:C.ink,border:"none",borderRadius:9,padding:"12px 24px",fontSize:10,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:C.mono,cursor:"pointer"}}>
                  Retry Mock Interview →
                </motion.button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}