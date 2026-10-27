import { useEffect, useMemo, useState } from 'react';
import { quiz } from './content/quiz.js';
import { decodeShare, encodeShare } from './engine/codec.js';
import {
  buildReport,
  exampleState,
  facebookHref,
  flowOf,
  lineHref,
  lineMessage,
  materialize,
  questionById,
  resultDescription,
  resultTitle,
  sanitizeDraft,
  toggleProduct,
} from './engine/model.js';
import { clearDraft, loadDraft, saveDraft } from './engine/storage.js';
import Landing from './ui/Landing.jsx';
import QuizScreen from './ui/QuizScreen.jsx';
import ResultScreen from './ui/ResultScreen.jsx';

const FLOW = flowOf(quiz);

function replaceShare(code) {
  const url = new URL(location.href);
  if (code) url.searchParams.set('r', code);
  else url.searchParams.delete('r');
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function sameShare(saved, code) {
  const state = materialize(quiz, { years: saved.years, products: saved.products }, saved.answers, saved.frames);
  if (!state) return false;
  return encodeShare(quiz, { years: saved.years, products: saved.products, answers: state }) === code;
}

function currentShareUrl(code) {
  const url = new URL(location.href);
  url.searchParams.set('r', code);
  url.hash = '';
  return url.toString();
}

function startLink() {
  const url = new URL(location.href);
  url.searchParams.delete('r');
  url.hash = '';
  return url.toString();
}

function setMeta(selector, content) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute('content', content);
}

function readBoot() {
  const saved = sanitizeDraft(quiz, loadDraft());
  const code = new URLSearchParams(location.search).get('r');
  const blank = {
    view: 'landing',
    cursor: 0,
    years: null,
    products: [],
    answers: {},
    frames: {},
    dirty: false,
    linkView: null,
    linkError: '',
    kept: saved,
  };
  if (!code) return blank;
  const decoded = decodeShare(quiz, code);
  if (!decoded.ok) return { ...blank, linkError: decoded.error };
  if (saved?.completed && sameShare(saved, code)) {
    return {
      ...blank,
      view: 'result',
      cursor: saved.cursor,
      years: saved.years,
      products: saved.products,
      answers: saved.answers,
      frames: saved.frames,
      dirty: true,
    };
  }
  return { ...blank, view: 'result', linkView: decoded.state };
}

export default function App() {
  const [boot] = useState(readBoot);
  const [view, setView] = useState(boot.view);
  const [cursor, setCursor] = useState(boot.cursor);
  const [years, setYears] = useState(boot.years);
  const [products, setProducts] = useState(boot.products);
  const [answers, setAnswers] = useState(boot.answers);
  const [frames, setFrames] = useState(boot.frames);
  const [dirty, setDirty] = useState(boot.dirty);
  const [linkView, setLinkView] = useState(boot.linkView);
  const [linkError, setLinkError] = useState(boot.linkError);
  const [exampleOn, setExampleOn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');

  const visibleDraft = useMemo(() => {
    if (!dirty || linkView) return boot.kept;
    return sanitizeDraft(quiz, {
      version: quiz.storageVersion,
      cursor,
      years,
      products,
      answers,
      frames,
      completed: view === 'result',
    });
  }, [boot.kept, dirty, linkView, cursor, years, products, answers, frames, view]);

  useEffect(() => {
    if (!dirty || linkView || exampleOn) return;
    saveDraft({ cursor, years, products, answers, frames, completed: view === 'result' });
  }, [dirty, linkView, exampleOn, view, cursor, years, products, answers, frames]);

  useEffect(() => {
    if (linkView || exampleOn || view !== 'result') return;
    const state = materialize(quiz, { years, products }, answers, frames);
    if (!state || !years || products.length === 0) return;
    replaceShare(encodeShare(quiz, { years, products, answers: state }));
  }, [linkView, exampleOn, view, years, products, answers, frames]);

  const ownState = useMemo(() => {
    if (!years || products.length === 0) return null;
    const state = materialize(quiz, { years, products }, answers, frames);
    return state ? { years, products, answers: state } : null;
  }, [years, products, answers, frames]);

  const ownReport = useMemo(() => (ownState ? buildReport(quiz, ownState) : null), [ownState]);
  const linkReport = useMemo(() => (linkView ? buildReport(quiz, linkView) : null), [linkView]);
  const exampleReport = useMemo(() => buildReport(quiz, exampleState(quiz)), []);
  const mode = linkView ? 'link' : exampleOn ? 'example' : 'own';
  const report = mode === 'link' ? linkReport : mode === 'example' ? exampleReport : ownReport;

  const sharePack = useMemo(() => {
    if (mode === 'example') return null;
    const source = linkView ?? ownState;
    const shown = linkView ? linkReport : ownReport;
    if (!source || !shown) return null;
    const resultUrl = currentShareUrl(encodeShare(quiz, source));
    const startUrl = startLink();
    return {
      resultUrl,
      lineUrl: lineHref(lineMessage(quiz, shown, resultUrl, startUrl)),
      facebookUrl: facebookHref(resultUrl),
      title: resultTitle(quiz, shown),
    };
  }, [mode, linkView, ownState, linkReport, ownReport]);

  useEffect(() => {
    const siteTitle = `${quiz.title}｜${quiz.brand}`;
    const siteDescription = '把上漲時的自評，和行情打下來時的動作分開。找到睡得著的組合。';
    if (view === 'result' && report && mode !== 'example') {
      const title = resultTitle(quiz, report);
      const description = resultDescription(quiz, report);
      document.title = title;
      setMeta('meta[property="og:title"]', title);
      setMeta('meta[property="og:description"]', description);
      setMeta('meta[name="description"]', description);
      return;
    }
    document.title = siteTitle;
    setMeta('meta[property="og:title"]', siteTitle);
    setMeta('meta[property="og:description"]', siteDescription);
    setMeta('meta[name="description"]', siteDescription);
  }, [view, report, mode]);

  function applyDraft(source, nextCursor, nextView) {
    if (!source) return;
    setYears(source.years);
    setProducts(source.products);
    setAnswers(source.answers);
    setFrames(source.frames);
    setCursor(nextCursor);
    setLinkView(null);
    setExampleOn(false);
    setDirty(true);
    replaceShare(null);
    setView(nextView);
  }

  function openExample() {
    setExampleOn(true);
    setLinkView(null);
    setLinkError('');
    setCopied(false);
    setCopyFallback('');
    replaceShare(null);
    setView('result');
  }

  function goHome() {
    setExampleOn(false);
    setLinkView(null);
    replaceShare(null);
    setView('landing');
  }

  function startFresh() {
    clearDraft();
    setExampleOn(false);
    setYears(null);
    setProducts([]);
    setAnswers({});
    setFrames({});
    setCursor(0);
    setCopied(false);
    setCopyFallback('');
    setLinkView(null);
    setLinkError('');
    replaceShare(null);
    setDirty(true);
    setView('quiz');
  }

  function selectOption(questionId, optionId, frame) {
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
    if (frame && questionById(quiz, questionId)?.category === 'behavior') {
      setFrames((current) => ({ ...current, [questionId]: frame }));
    }
    setDirty(true);
  }

  async function copyShare() {
    if (exampleOn) return;
    const source = linkView ?? ownState;
    if (!source) return;
    const url = currentShareUrl(encodeShare(quiz, source));
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFallback('');
    } catch {
      setCopied(false);
      setCopyFallback(url);
    }
  }

  if (view === 'quiz') {
    return (
      <QuizScreen
        item={FLOW[cursor]}
        index={cursor}
        years={years}
        products={products}
        answers={answers}
        frames={frames}
        onYear={(id) => { setYears(id); setDirty(true); }}
        onProduct={(id) => { setProducts((current) => toggleProduct(quiz, current, id)); setDirty(true); }}
        onOption={selectOption}
        onFrame={(questionId, frame) => { setFrames((current) => ({ ...current, [questionId]: frame })); setDirty(true); }}
        onBack={() => { if (cursor === 0) setView('landing'); else setCursor((value) => value - 1); }}
        onNext={() => {
          if (cursor >= FLOW.length - 1) {
            setExampleOn(false);
            setView('result');
          } else {
            setCursor((value) => value + 1);
          }
        }}
      />
    );
  }

  if (view === 'result' && report) {
    return (
      <ResultScreen
        report={report}
        mode={mode}
        hasDraft={Boolean(visibleDraft)}
        share={sharePack}
        onCopy={copyShare}
        copied={copied}
        copyFallback={copyFallback}
        onRetake={startFresh}
        onEdit={() => { setExampleOn(false); replaceShare(null); setCursor(FLOW.length - 1); setDirty(true); setView('quiz'); }}
        onHome={goHome}
        onShowOwn={() => applyDraft(visibleDraft, visibleDraft.cursor, visibleDraft.completed ? 'result' : 'quiz')}
      />
    );
  }

  return (
    <Landing
      draft={visibleDraft}
      linkError={linkError}
      onStart={startFresh}
      onResume={() => applyDraft(visibleDraft, visibleDraft.cursor, 'quiz')}
      onResult={() => applyDraft(visibleDraft, visibleDraft.cursor, 'result')}
      onEdit={() => applyDraft(visibleDraft, FLOW.length - 1, 'quiz')}
      onExample={openExample}
    />
  );
}
