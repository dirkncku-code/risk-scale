import { useState } from 'react';
import { quiz } from '../content/quiz.js';
import Shell from './Shell.jsx';

export default function Landing({ draft, linkError, onStart, onResume, onResult, onEdit, onExample }) {
  const [confirming, setConfirming] = useState(false);
  const answered = draft ? Object.keys(draft.answers).length : 0;

  return (
    <Shell>
      <div className="stack">
        <p className="kicker">了解自己，找到睡得著的組合</p>
        <h1>風險刻度</h1>
        <p className="lede">人在上漲時容易把自己的風險承受度估高。這份測驗把你說得出口的承受度，和行情逆著你時的動作分開。</p>
        <div className="card stack">
          <p>兩題經驗不計分，二十題計分。每題四個選項，作答時不顯示分數。</p>
          <p>滿分 100。高分只代表答得比較敢，不是比較好，也不是該加碼的理由。</p>
          <p className="muted">沒有登入，沒有資料庫。紀錄只留在這台瀏覽器。分享連結裡是你的選項，沒有姓名。</p>
        </div>
        {linkError ? <p className="banner" role="alert">這條連結讀不了：{linkError}</p> : null}
        {draft ? (
          <div className="card stack">
            <p>{draft.completed ? '這台瀏覽器有一份做完的結果。' : `這台瀏覽器有未完成的作答，已答 ${answered} 題。`}</p>
            <div className="actions">
              {draft.completed ? <button className="btn" type="button" onClick={onResult}>看上次的結果</button> : null}
              <button className={draft.completed ? 'btn-ghost' : 'btn'} type="button" onClick={draft.completed ? onEdit : onResume}>
                {draft.completed ? '修改答案' : '繼續作答'}
              </button>
              {confirming ? (
                <>
                  <button className="btn-ghost" type="button" onClick={onStart}>清掉，重來</button>
                  <button className="btn-ghost" type="button" onClick={() => setConfirming(false)}>留下</button>
                </>
              ) : (
                <button className="btn-ghost" type="button" onClick={() => setConfirming(true)}>重新作答</button>
              )}
            </div>
          </div>
        ) : (
          <button className="btn" type="button" onClick={onStart}>開始作答</button>
        )}
        <button className="btn-ghost" type="button" onClick={onExample}>先看範例結果</button>
        <div className="ruler" aria-hidden="true">
          {quiz.profiles.map((profile) => (
            <div key={profile.id} className="seg" style={{ flex: profile.max - profile.min + 1 }}>
              <span>{profile.name}</span>
            </div>
          ))}
        </div>
        <p className="muted">刻度從{quiz.profiles[0].name}到{quiz.profiles.at(-1).name}。結果給的是一份睡得著的配置示意，不是買進清單。</p>
      </div>
    </Shell>
  );
}
