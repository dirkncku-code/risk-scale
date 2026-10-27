import { useEffect, useRef } from 'react';
import { quiz } from '../content/quiz.js';
import { frameHint, questionById, resolveFrame, resolvePrompt } from '../engine/model.js';
import Shell from './Shell.jsx';

const KEYS = ['1', '2', '3', '4'];

export default function QuizScreen({
  item,
  index,
  years,
  products,
  answers,
  frames,
  onYear,
  onProduct,
  onOption,
  onFrame,
  onBack,
  onNext,
}) {
  const titleRef = useRef(null);
  const experience = { years, products };
  const question = item.kind === 'score' ? questionById(quiz, item.id) : null;
  const frame = question?.category === 'behavior' ? resolveFrame(question, experience, frames[question.id]) : null;
  const hint = question?.category === 'behavior' ? frameHint(question, experience, frame) : null;
  const canNext = item.kind === 'years'
    ? Boolean(years)
    : item.kind === 'products'
      ? products.length > 0
      : Boolean(answers[item.id]);

  useEffect(() => {
    titleRef.current?.focus();
    window.scrollTo(0, 0);
  }, [index]);

  useEffect(() => {
    function onKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target?.tagName;
      if (event.target?.type === 'text' || tag === 'TEXTAREA') return;
      const keyIndex = KEYS.indexOf(event.key);
      if (keyIndex >= 0 && item.kind === 'years') onYear(quiz.years[keyIndex].id);
      if (keyIndex >= 0 && question && item.kind === 'score') {
        onOption(question.id, question.options[keyIndex].id, frame);
      }
      if (event.key === 'Enter' && tag !== 'BUTTON' && canNext) {
        event.preventDefault();
        onNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, question, frame, canNext, onYear, onOption, onNext]);

  const scoredCount = quiz.questions.length;
  const kicker = item.kind === 'score'
    ? `計分題 ${index - 1} / ${scoredCount} · ${quiz.categories.find((category) => category.id === question.category).label}`
    : quiz.intro[item.kind].kicker;
  const title = item.kind === 'score'
    ? resolvePrompt(quiz, question, experience, answers, { ...frames, [question.id]: frame })
    : quiz.intro[item.kind].title;
  const progress = `${((index + 1) / (scoredCount + 2)) * 100}%`;

  return (
    <Shell>
      <div className="stack">
        <div className="bar" role="progressbar" aria-valuemin={1} aria-valuemax={scoredCount + 2} aria-valuenow={index + 1} aria-label="作答進度">
          <span style={{ width: progress }} />
        </div>
        <div>
          <p className="kicker">{kicker}{question?.chain?.step === 2 ? ' · 同一情境的下一題' : ''}</p>
          <h1 className="ask" id="q-title" tabIndex={-1} ref={titleRef}>{title}</h1>
          {item.kind !== 'score' ? <p className="muted">{quiz.intro[item.kind].body}</p> : null}
        </div>

        {question?.scene ? (
          <div className="scene">
            <p>{question.scene.body}</p>
            <p className="muted">{question.scene.source}</p>
          </div>
        ) : null}

        {hint ? (
          <div className="stack">
            <p className="muted">{hint.text}</p>
            {hint.canToggle ? (
              <button className="linkish" type="button" onClick={() => onFrame(question.id, hint.toggleTo)}>
                {hint.toggleLabel}
              </button>
            ) : null}
          </div>
        ) : null}

        {item.kind === 'years' ? (
          <div className="stack" role="radiogroup" aria-labelledby="q-title">
            {quiz.years.map((year, yearIndex) => (
              <label key={year.id} className={years === year.id ? 'opt on' : 'opt'}>
                <input type="radio" name="years" value={year.id} checked={years === year.id} onChange={() => onYear(year.id)} />
                <span className="n">{yearIndex + 1}</span>
                <span>{year.label}</span>
              </label>
            ))}
          </div>
        ) : null}

        {item.kind === 'products' ? (
          <div className="stack" role="group" aria-labelledby="q-title">
            {quiz.products.map((product) => {
              const on = products.includes(product.id);
              return (
                <label key={product.id} className={on ? 'check on' : 'check'}>
                  <input type="checkbox" name="products" value={product.id} checked={on} onChange={() => onProduct(product.id)} />
                  <span className="mark" aria-hidden="true" />
                  <span>{product.label}</span>
                </label>
              );
            })}
          </div>
        ) : null}

        {question ? (
          <div className="stack" role="radiogroup" aria-labelledby="q-title">
            {question.options.map((option, optionIndex) => {
              const on = answers[question.id] === option.id;
              return (
                <label key={option.id} className={on ? 'opt on' : 'opt'}>
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={on}
                    onChange={() => onOption(question.id, option.id, frame)}
                  />
                  <span className="n">{optionIndex + 1}</span>
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        ) : null}

        {item.kind === 'score' ? <p className="muted">1 到 4 是鍵盤快捷鍵，不是分數。分數不會在作答時出現。</p> : null}

        <div className="nav">
          <button className="btn-ghost" type="button" onClick={onBack}>{index === 0 ? '回首頁' : '上一題'}</button>
          <button className="btn grow" type="button" onClick={onNext} disabled={!canNext}>
            {index === scoredCount + 1 ? '看結果' : '下一題'}
          </button>
        </div>
      </div>
    </Shell>
  );
}
