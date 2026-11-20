import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import "./index.css";

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [noClicks, setNoClicks] = useState(0);
  const [noAsYes, setNoAsYes] = useState(false);
  const [noPosition, setNoPosition] = useState(null);
  const [scales, setScales] = useState({ yes: 1, no: 1 });
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const noButtonRef = useRef(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data.json`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load data.json");
        return response.json();
      })
      .then(setData)
      .catch((reason) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (questionIndex !== 1 || !noPosition || !noButtonRef.current) return undefined;

    const keepButtonVisible = () => {
      const rect = noButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Fixed `left`/`top` coordinates use the layout viewport. Keep the
      // clamp in that same coordinate space to avoid mobile viewport offsets.
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const gutter = 16;
      const nextLeft = Math.min(Math.max(gutter, noPosition.left), Math.max(gutter, viewportWidth - rect.width - gutter));
      const nextTop = Math.min(Math.max(gutter, noPosition.top), Math.max(gutter, viewportHeight - rect.height - gutter));
      if (nextLeft !== noPosition.left || nextTop !== noPosition.top) setNoPosition({ left: nextLeft, top: nextTop });
    };

    keepButtonVisible();
    window.addEventListener("resize", keepButtonVisible);
    return () => {
      window.removeEventListener("resize", keepButtonVisible);
    };
  }, [questionIndex, noPosition]);

  if (error) return <main className="grid min-h-screen place-items-center bg-[#fff4f7] p-6 text-center text-[#6f5360]">{error}</main>;
  if (!data) return <main className="grid min-h-screen place-items-center bg-[#fff4f7] text-[#9c7182]">Loading your questions…</main>;
  if (showEnvelope) return <EnvelopeView data={data} showLetter={showLetter} setShowLetter={setShowLetter} replay={() => { setQuestionIndex(0); setNoClicks(0); setNoAsYes(false); setNoPosition(null); setScales({ yes: 1, no: 1 }); setShowEnvelope(false); setShowLetter(false); }} />;

  const question = data.questions[questionIndex];
  const tooltip = data.noMessages[(noClicks - 1) % data.noMessages.length] || question.hint;
  const noButtonIsYes = questionIndex === 0 && noAsYes;
  const noStyle = questionIndex === 1 && noPosition ? { left: noPosition.left, top: noPosition.top, transform: "translate(0, 0)" } : { transform: `scale(${scales.no})` };
  const resetQuestion = () => { setNoClicks(0); setNoAsYes(false); setNoPosition(null); setScales({ yes: 1, no: 1 }); };
  const goNext = () => { if (questionIndex === data.questions.length - 1) setShowEnvelope(true); else { setQuestionIndex((current) => current + 1); resetQuestion(); } };
  const handleNo = () => {
    setNoClicks((current) => current + 1);
    if (questionIndex === 0) return setNoAsYes(true);
    if (questionIndex === 1) {
      const button = noButtonRef.current;
      const buttonWidth = button?.getBoundingClientRect().width || 112;
      const buttonHeight = button?.getBoundingClientRect().height || 52;
      const gutter = 16;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const maxLeft = Math.max(gutter, viewportWidth - buttonWidth - gutter);
      const maxTop = Math.max(gutter, viewportHeight - buttonHeight - gutter);
      const currentRect = button?.getBoundingClientRect();
      const currentCenter = currentRect
        ? { x: currentRect.left + currentRect.width / 2, y: currentRect.top + currentRect.height / 2 }
        : { x: viewportWidth / 2, y: viewportHeight / 2 };
      const minimumDistance = Math.min(140, Math.max(64, Math.min(viewportWidth, viewportHeight) * 0.18));
      let bestPosition = null;
      let bestDistance = -1;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        const candidate = {
          left: Math.round(gutter + Math.random() * Math.max(0, maxLeft - gutter)),
          top: Math.round(gutter + Math.random() * Math.max(0, maxTop - gutter))
        };
        const distance = Math.hypot(
          candidate.left + buttonWidth / 2 - currentCenter.x,
          candidate.top + buttonHeight / 2 - currentCenter.y
        );
        if (distance > bestDistance) {
          bestPosition = candidate;
          bestDistance = distance;
        }
        if (distance >= minimumDistance) break;
      }
      return setNoPosition(bestPosition);
    }
    setScales((current) => ({ yes: Math.min(2.5, current.yes + 0.18), no: Math.max(0.15, current.no - 0.12) }));
  };

  const noButton = (
    <button ref={noButtonRef} type="button" onClick={noButtonIsYes ? goNext : handleNo} aria-label={questionIndex === 1 && noClicks ? tooltip : question.noLabel} className={`group min-h-[52px] min-w-28 rounded-full px-6 py-3 font-bold shadow-[0_7px_16px_rgba(154,87,111,.08)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#f5afc3] ${noButtonIsYes ? "border-transparent bg-[#ef7095] !text-white shadow-[0_9px_19px_rgba(214,83,123,.25)]" : "border border-[#b2607d]/20 bg-white text-[#d6537b]"} ${questionIndex === 1 && noPosition ? "fixed z-50" : ""}`} style={noStyle}>
      {questionIndex === 1 && noClicks > 0 && <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 w-max max-w-52 -translate-x-1/2 rounded-xl bg-[#3f2734] px-3 py-2 text-xs font-medium text-white opacity-100 shadow-lg transition">{tooltip}<span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#3f2734]" /></span>}
      {noButtonIsYes ? question.yesLabel : question.noLabel}
    </button>
  );

  return (
    <>
    <main className="relative grid min-h-screen place-items-center overflow-visible bg-[radial-gradient(circle_at_50%_5%,#fffdfc_0,#fff4f7_42%,#fce9f0_100%)] px-3 py-6 text-[#3f2734] sm:px-5">
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden"><div className="absolute -left-16 -top-24 h-60 w-60 rounded-full bg-[#ffd3df] opacity-50 blur-sm" /><div className="absolute -bottom-24 -right-16 h-60 w-60 rounded-full bg-[#ffe0bd] opacity-50 blur-sm" /></div>
      <section className="relative z-10 w-full max-w-[560px] text-center" aria-live="polite">
        <p className="mb-[18px] text-[.78rem] font-bold uppercase tracking-[.12em] text-[#9c7182]">A tiny question for you <span className="text-base text-[#ef7095]">♡</span></p>
        <div className="mx-auto mb-7 h-1 w-[min(210px,60%)] overflow-hidden rounded-full bg-[#ef7095]/15"><span className="block h-full rounded-full bg-[#ef7095] transition-all duration-500" style={{ width: `${((questionIndex + 1) / data.questions.length) * 100}%` }} /></div>
        <div className="rounded-[30px] border border-white/80 bg-white/75 px-4 py-6 shadow-[0_20px_70px_rgba(189,108,133,.15)] backdrop-blur sm:px-6 sm:py-8">
          <div className="mx-auto mb-[18px] grid h-32 w-32 place-items-center rounded-full bg-[#fff0f4] shadow-[inset_0_0_0_9px_rgba(255,255,255,.7)] sm:h-[146px] sm:w-[146px]"><img className="h-24 w-24 object-contain sm:h-28 sm:w-28" src={`${import.meta.env.BASE_URL}${question.sticker.replace(/^\/+/, "")}`} alt={`Illustration for question ${questionIndex + 1}`} /></div>
          <p className="mb-2.5 text-[.77rem] font-bold uppercase tracking-[.1em] text-[#ef7095]">Question {questionIndex + 1} of {data.questions.length}</p>
          <h1 className="mx-auto min-h-[2.4em] max-w-[470px] font-[Pacifico] text-[clamp(1.8rem,6vw,2.65rem)] leading-tight font-normal">{question.text}</h1>
          <p className="mt-[13px] min-h-6 text-[.88rem] text-[#9c7182]">{noClicks && questionIndex === 1 ? tooltip : question.hint}</p>
          <div className="relative mt-[22px] flex min-h-[58px] justify-center gap-3">
            <button type="button" onClick={goNext} className="min-h-[52px] min-w-28 rounded-full bg-[#ef7095] px-6 py-3 font-bold text-white shadow-[0_9px_19px_rgba(214,83,123,.25)] transition hover:-translate-y-0.5 hover:bg-[#d6537b] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#f5afc3]" style={{ transform: `scale(${scales.yes})` }}>{question.yesLabel}</button>
            {questionIndex === 1 && noPosition ? <span aria-hidden="true" className="min-h-[52px] min-w-28" /> : noButton}
          </div>
        </div>
      </section>
    </main>
    {questionIndex === 1 && noPosition && createPortal(noButton, document.body)}
    </>
  );
}

function EnvelopeView({ data, showLetter, setShowLetter, replay }) {
  const letter = data.letter;
  return <main className="grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_5%,#fffdfc_0,#fff4f7_42%,#fce9f0_100%)] px-3 py-6 text-[#3f2734]"><section className="w-full max-w-[560px] animate-[fade-in_.7s_ease_both] text-center"><p className="mb-[18px] text-[.78rem] font-bold uppercase tracking-[.12em] text-[#9c7182]">One last little thing <span className="text-base text-[#ef7095]">✦</span></p><button type="button" aria-label="Open your letter" onClick={() => setShowLetter(true)} className="relative mx-auto my-[70px] block aspect-[1.45] w-[min(300px,80vw)] animate-[fall-in_.9s_cubic-bezier(.2,.85,.35,1.15)_both] drop-shadow-[0_24px_18px_rgba(157,75,107,.2)]"><span className="absolute inset-[15%_0_0] rounded-lg bg-[#f28aaa]" /><span className="absolute inset-[15%_0_auto] z-10 h-[55%] bg-[#f8a2bb] [clip-path:polygon(0_0,100%_0,50%_100%)]" /><span className="relative z-20 block pt-[32%] text-3xl text-white">♥</span><span className="relative z-20 mt-2 block text-xs font-bold uppercase tracking-[.1em] text-white">{letter.envelopeLabel}</span></button><p className="text-[.9rem] text-[#9c7182]">Tap the envelope to open it</p></section>{showLetter && <div className="fixed inset-0 z-50 grid place-items-center bg-[#3f2734]/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="relative w-full max-w-[500px] animate-[pop-in_.4s_ease_both] rounded-[22px] border border-[#f5d8d0] bg-[#fffdf7] bg-[radial-gradient(#f4dbd9_1px,transparent_1px)] bg-[length:15px_15px] px-7 py-11 text-center shadow-[0_25px_90px_rgba(90,42,63,.25)]"><button type="button" aria-label="Close letter" onClick={() => setShowLetter(false)} className="absolute right-4 top-3 h-8 w-8 rounded-full bg-[#fff0f2] text-xl leading-none text-[#9c7182]">×</button><p className="mb-2.5 text-xs font-bold uppercase tracking-[.12em] text-[#ef7095]">A letter for you</p><h2 className="mb-[17px] font-[Pacifico] text-3xl font-normal">{letter.title}</h2><p className="mx-auto max-w-[390px] whitespace-pre-line text-base leading-[1.8] text-[#6f5360]">{letter.message}</p><p className="my-6 font-[Pacifico] text-xl text-[#d6537b]">{letter.signature}</p><button type="button" onClick={replay} className="rounded-full border border-[#b2607d]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#d6537b]">Read it again ♡</button></div></div>}</main>;
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
