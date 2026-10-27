import { useState } from 'react';
import { quiz } from '../content/quiz.js';
import { resultDescription } from '../engine/model.js';
import Shell from './Shell.jsx';

function FrameTag({ frame }) {
  if (!frame) return null;
  return <span className={frame === 'hypo' ? 'tag hypo' : 'tag'}>{frame === 'hypo' ? '假設' : '實際'}</span>;
}

function Ruler({ score, shownId }) {
  const left = ((score - quiz.profiles[0].min) / (quiz.profiles.at(-1).max - quiz.profiles[0].min)) * 100;
  const shown = quiz.profiles.find((profile) => profile.id === shownId);
  return (
    <div className="stack">
      <div className="ruler-wrap">
        <div className="ruler" role="img" aria-label={`總分 ${score}，配置採用${shown.name}`}>
          {quiz.profiles.map((profile) => (
            <div key={profile.id} className={profile.id === shownId ? 'seg on' : 'seg'} style={{ flex: profile.max - profile.min + 1 }}>
              <span>{profile.name}</span>
            </div>
          ))}
        </div>
        <div className="pin" style={{ left: `${left}%` }} />
      </div>
      <p className="muted">刻度針是總分。亮起來的那一段，是這次採用的配置。</p>
    </div>
  );
}

export default function ResultScreen({
  report,
  mode,
  hasDraft,
  share,
  onCopy,
  copied,
  copyFallback,
  onRetake,
  onEdit,
  onHome,
  onShowOwn,
}) {
  const [confirming, setConfirming] = useState(false);
  const shown = report.shown;
  const year = quiz.years.find((item) => item.id === report.years);
  const productText = report.products.map((id) => quiz.products.find((item) => item.id === id)?.label).filter(Boolean).join('、');
  const allocationLabel = quiz.assets.map((asset) => `${asset.label} ${shown.weights[asset.key]}%`).join('，');
  const retakeWarning = mode === 'own'
    ? '這會清掉這次結果，從頭作答。已經分享出去的連結還開得了。'
    : '這會清掉這台瀏覽器裡的作答，從頭開始。';

  function askRetake() {
    if (mode === 'example' && !hasDraft) {
      onRetake();
      return;
    }
    setConfirming(true);
  }

  const sameBand = report.rawProfile.id === shown.id;
  const scoreLine = sameBand
    ? `總分 ${report.total} / ${report.max} · 區間 ${shown.min}–${shown.max}`
    : `總分 ${report.total} / ${report.max} · 總分在${report.rawProfile.name}，配置用${shown.name}（${shown.min}–${shown.max}）`;

  return (
    <Shell narrow>
      <div className="stack">
        {mode === 'example' ? <p className="banner example">這是範例結果，不是你的分數。</p> : null}
        {mode === 'link' ? <p className="banner">這是分享連結上的結果，不會蓋掉你這台電腦自己的作答。</p> : null}

        <h1>{shown.name}</h1>
        <p className="score">{report.total}</p>
        <p className="muted">{scoreLine}</p>
        <p>了解自己，找到睡得著的組合。</p>
        {report.followBehavior ? <p className="banner">以行為為準</p> : <p className="muted">高分只代表答得比較敢。</p>}
        <Ruler score={report.total} shownId={shown.id} />

        <section className="stack">
          <h2>睡得著的配置</h2>
          <p className="muted">規劃示意，非預測。</p>
          <div className="alloc" role="img" aria-label={allocationLabel}>
            {quiz.assets.filter((asset) => shown.weights[asset.key] > 0).map((asset) => (
              <span key={asset.key} style={{ width: `${shown.weights[asset.key]}%`, background: asset.color }} />
            ))}
          </div>
          <table>
            <tbody>
              {quiz.assets.map((asset) => (
                <tr key={asset.key}>
                  <td><span className="swatch" style={{ background: asset.color }} aria-hidden="true" />{asset.label}</td>
                  <td>{shown.weights[asset.key]}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="metrics">
            <div>單一個股上限<strong>{shown.singleCap}%</strong></div>
            <div>假設期望報酬<strong>{shown.returnLabel}</strong></div>
            <div>預期最大回撤<strong>{shown.drawdownLabel}</strong></div>
          </div>
          <p>{shown.feel}</p>
        </section>

        <section className="stack">
          <h2>自評與行為</h2>
          <p className="muted">左邊是上漲時說得出口的承受度。右邊是下跌當天的題，不含暴漲那天；暴漲那天放在下面的對照。</p>
          <p>{report.gapText}</p>
          {report.hypoCount === report.behaviorCount ? (
            <p className="banner">漲跌行為 {report.behaviorCount} 題都是假設。你還沒有用真實部位驗證過自己。</p>
          ) : null}
          {report.hypoCount > 0 && report.hypoCount < report.behaviorCount ? (
            <p className="banner">漲跌行為裡有 {report.hypoCount} 題是假設，其餘是你填的實際動作。</p>
          ) : null}
          <div className="cols">
            <div>
              <p className="muted">上漲時的自評傾向</p>
              <p className="pick">{report.byCategory.preference.score} / {report.byCategory.preference.max}</p>
              <p className="muted">換算 {Math.round(report.preferenceNorm)}</p>
            </div>
            <div>
              <p className="muted">下跌當天的實際／假設動作</p>
              <p className="pick">{report.against.score} / {report.against.max}</p>
              <p className="muted">換算 {Math.round(report.against.norm)}</p>
            </div>
          </div>
          {report.chains.map((chain) => (
            <article key={chain.id}>
              <h3>{chain.title}</h3>
              <div className="pair">
                <div>
                  <p className="kicker">{chain.first.stepLabel}<FrameTag frame={chain.first.frame} /></p>
                  <p className="pick">{chain.first.label}</p>
                </div>
                <div>
                  <p className="kicker">{chain.second.stepLabel}<FrameTag frame={chain.second.frame} /></p>
                  <p className="pick">{chain.second.label}</p>
                </div>
              </div>
              <p className="reading">{chain.reading}</p>
            </article>
          ))}
          {report.singles.map((item) => (
            <div key={item.id}>
              <p className="kicker">{item.title}<FrameTag frame={item.frame} /></p>
              <p className="pick">{item.label}</p>
            </div>
          ))}
          <p className="muted">年資：{year?.label}。近三年：{productText}。</p>
        </section>

        <details className="card">
          <summary>計分明細</summary>
          <ol className="choice-list">
            {report.choices.map((choice, index) => {
              const category = quiz.categories.find((item) => item.id === choice.category);
              return (
                <li key={choice.id}>
                  <p className="muted">{index + 1} · {category.label}<FrameTag frame={choice.frame} /></p>
                  <p>{choice.title}</p>
                  <p>{choice.label}</p>
                  <p>得分 {choice.score}</p>
                </li>
              );
            })}
          </ol>
        </details>

        <section className="stack quiet">
          <h2>免責聲明</h2>
          <p>{quiz.planningNote}</p>
          <p>{quiz.disclaimer}</p>
          <p className="muted">{quiz.methodNote}</p>
        </section>

        <div className="actions">
          {confirming ? (
            <>
              <p>{retakeWarning}</p>
              <button className="btn" type="button" onClick={onRetake}>清掉，從頭開始</button>
              <button className="btn-ghost" type="button" onClick={() => setConfirming(false)}>留下</button>
            </>
          ) : (
            <button className="btn" type="button" onClick={askRetake}>做我自己的測試</button>
          )}
          {mode === 'own' ? <button className="btn-ghost" type="button" onClick={onEdit}>修改答案</button> : null}
          {mode !== 'own' ? <button className="btn-ghost" type="button" onClick={onHome}>回首頁</button> : null}
          {mode === 'link' && hasDraft ? <button className="btn-ghost" type="button" onClick={onShowOwn}>看我這台電腦的作答</button> : null}
        </div>

        {mode === 'example' || !share ? (
          <p className="muted">範例沒有可分享的個人結果。</p>
        ) : (
          <section className="stack">
            <h2>分享</h2>
            <p className="muted">{share.title}</p>
            <p className="muted">{resultDescription(quiz, report)}</p>
            <div className="share-actions">
              <a className="btn" href={share.lineUrl} target="_blank" rel="noreferrer">用 Line 分享</a>
              <a className="btn-ghost" href={share.facebookUrl} target="_blank" rel="noreferrer">用 Facebook 分享</a>
              <button className="btn-ghost" type="button" onClick={onCopy}>{copied ? '已複製' : '複製結果連結'}</button>
            </div>
            {copyFallback ? <input className="copybox" readOnly value={copyFallback} aria-label="結果連結" /> : null}
          </section>
        )}
      </div>
    </Shell>
  );
}
