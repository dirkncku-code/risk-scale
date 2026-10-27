import assert from 'node:assert/strict';
import test from 'node:test';
import { quiz } from '../content/quiz.js';
import { decodeShare, encodeShare } from './codec.js';
import {
  buildReport,
  canClaimActual,
  exampleState,
  facebookHref,
  formatReturn,
  lineHref,
  lineMessage,
  materialize,
  planNumbers,
  profileForScore,
  resolveFrame,
  resolvePrompt,
  toggleProduct,
  validateQuiz,
} from './model.js';

const held = { years: 'y7', products: ['tw_stock', 'us_etf'] };

function stamped(experience, pick) {
  const answers = {};
  const frames = {};
  for (const question of quiz.questions) {
    const option = pick(question);
    answers[question.id] = option.id;
    if (question.category === 'behavior') {
      frames[question.id] = resolveFrame(question, experience, undefined);
    }
  }
  return materialize(quiz, experience, answers, frames);
}

test('題庫結構站得住', () => {
  validateQuiz(quiz);
  assert.equal(quiz.questions.length, 20);
  assert.equal(quiz.products.length, 8);
  assert.equal(quiz.questions.filter((question) => question.category === 'allocation').length, 6);
  assert.equal(quiz.questions.filter((question) => question.category === 'preference').length, 7);
  assert.equal(quiz.questions.filter((question) => question.category === 'behavior').length, 7);
  assert.equal(quiz.questions.filter((question) => question.tide === 'against').length, 6);
  assert.deepEqual(
    quiz.questions.filter((question) => question.chain).map((question) => question.id),
    ['tariff-shock', 'tariff-rebound', 'july-drop', 'july-half'],
  );
});

test('分數不依序就會被擋下', () => {
  const broken = {
    ...quiz,
    questions: quiz.questions.map((question, index) => (
      index === 0
        ? { ...question, options: question.options.map((option, optionIndex) => (optionIndex === 2 ? { ...option, score: 3 } : option)) }
        : question
    )),
  };
  assert.throws(() => validateQuiz(broken), /分數順序/);
});

test('連環題沒有緊接就會被擋下', () => {
  const broken = {
    ...quiz,
    questions: quiz.questions.map((question) => (
      question.id === 'tariff-rebound'
        ? { ...question, chain: { ...question.chain, follows: 'y2022' } }
        : question
    )),
  };
  assert.throws(() => validateQuiz(broken), /緊接/);
});

test('全選最保守是 20 分極保守，全選最敢是 100 分積極', () => {
  const low = buildReport(quiz, { ...held, answers: stamped(held, (question) => question.options[0]) });
  const high = buildReport(quiz, { ...held, answers: stamped(held, (question) => question.options[3]) });
  const upperMid = buildReport(quiz, { ...held, answers: stamped(held, (question) => question.options[2]) });
  assert.equal(low.total, 20);
  assert.equal(low.rawProfile.id, 'defend');
  assert.equal(low.shown.name, '極保守');
  assert.equal(low.stepped, false);
  assert.equal(high.total, 100);
  assert.equal(high.shown.name, '積極');
  assert.equal(upperMid.total, 80);
  assert.equal(upperMid.rawProfile.name, '成長');
  assert.equal(profileForScore(quiz, 68).name, '穩健');
  assert.equal(profileForScore(quiz, 69).name, '成長');
});

test('五檔配置的加權報酬落在所寫區間', () => {
  const expected = {
    defend: { name: '極保守', weights: { cash: 50, bond: 35, index: 15, stock: 0 }, singleCap: 0, returnBps: 342.5, returnLabel: '約 3–4%', drawdownLabel: '約 -8%' },
    steady: { name: '保守', weights: { cash: 30, bond: 30, index: 35, stock: 5 }, singleCap: 5, returnBps: 497.5, returnLabel: '約 4–6%', drawdownLabel: '約 -15%' },
    balance: { name: '穩健', weights: { cash: 15, bond: 20, index: 50, stock: 15 }, singleCap: 8, returnBps: 657.5, returnLabel: '約 6–8%', drawdownLabel: '約 -25%' },
    growth: { name: '成長', weights: { cash: 10, bond: 10, index: 45, stock: 35 }, singleCap: 10, returnBps: 782.5, returnLabel: '約 7–9%', drawdownLabel: '約 -35%' },
    aggressive: { name: '積極', weights: { cash: 5, bond: 5, index: 40, stock: 50 }, singleCap: 15, returnBps: 872.5, returnLabel: '約 8–11%', drawdownLabel: '約 -45% 或更深' },
  };
  assert.equal(quiz.assumptions.returnBps.stock, 1050);
  for (const [id, spec] of Object.entries(expected)) {
    const profile = quiz.profiles.find((item) => item.id === id);
    assert.equal(profile.name, spec.name);
    assert.deepEqual(profile.weights, spec.weights);
    assert.equal(profile.singleCap, spec.singleCap);
    assert.equal(profile.returnLabel, spec.returnLabel);
    assert.equal(profile.drawdownLabel, spec.drawdownLabel);
    assert.equal(planNumbers(profile.weights, quiz.assumptions).returnBps, spec.returnBps);
    assert.ok(spec.returnBps >= profile.returnLow * 100 && spec.returnBps <= profile.returnHigh * 100);
  }
  assert.equal(formatReturn(expected.growth.returnBps), '7.8%');
  assert.equal(
    quiz.planningNote,
    '以上報酬與回撤皆為長期規劃假設，實際結果會受市場環境、估值與個人行為影響。較高的期望報酬通常伴隨較高的回撤機率與幅度。',
  );
  assert.equal(quiz.disclaimer, '本工具僅供自我了解參考，不構成投資建議。');
});

test('自評高出逆勢達門檻就降一檔，敢做的逆勢不自動升檔', () => {
  const answers = {};
  const frames = {};
  for (const question of quiz.questions) {
    const index = question.tide === 'against' ? 2 : 3;
    answers[question.id] = question.options[index].id;
    if (question.category === 'behavior') frames[question.id] = 'actual';
  }
  const hot = buildReport(quiz, { ...held, answers: materialize(quiz, held, answers, frames) });
  assert.equal(hot.total, 94);
  assert.equal(hot.rawProfile.id, 'aggressive');
  assert.equal(hot.stepped, true);
  assert.equal(hot.followBehavior, true);
  assert.equal(hot.shown.id, 'growth');
  assert.match(hot.gapText, /以行為為準/);
  assert.ok(hot.gap >= quiz.gapStep);

  answers.y2022 = quiz.questions.find((question) => question.id === 'y2022').options[3].id;
  const stay = buildReport(quiz, { ...held, answers: materialize(quiz, held, answers, frames) });
  assert.equal(stay.total, 95);
  assert.equal(stay.stepped, false);
  assert.equal(stay.shown.id, 'aggressive');

  const timid = {};
  const timidFrames = {};
  for (const question of quiz.questions) {
    const index = question.category === 'preference' ? 0 : 3;
    timid[question.id] = question.options[index].id;
    if (question.category === 'behavior') timidFrames[question.id] = 'actual';
  }
  const braveHands = buildReport(quiz, { ...held, answers: materialize(quiz, held, timid, timidFrames) });
  assert.ok(braveHands.gap <= -quiz.gapStep);
  assert.equal(braveHands.followBehavior, false);
  assert.equal(braveHands.stepped, false);
  assert.match(braveHands.gapText, /不因此調高/);
  assert.equal(braveHands.shown.id, braveHands.rawProfile.id);
});

test('範例是固定答案：總分 67，以行為為準改顯示保守', () => {
  const report = buildReport(quiz, exampleState(quiz));
  assert.equal(report.total, 67);
  assert.equal(report.rawProfile.name, '穩健');
  assert.equal(report.shown.name, '保守');
  assert.equal(report.followBehavior, true);
  assert.match(report.gapText, /以行為為準/);
  assert.equal(report.shown.returnLabel, '約 4–6%');
  assert.equal(report.shown.drawdownLabel, '約 -15%');
  assert.deepEqual(report.shown.weights, { cash: 30, bond: 30, index: 35, stock: 5 });
});

test('Line 分享文案帶結果連結和測驗開頭', () => {
  const report = { shown: { name: '積極' }, total: 91 };
  const text = lineMessage(quiz, report, 'https://risk.example/?r=v1', 'https://risk.example/');
  assert.equal(
    text,
    '我完成了風險刻度測驗，結果是【積極】（總分 91）。\n查看我的結果：https://risk.example/?r=v1\n你也來測測自己的風險刻度：https://risk.example/',
  );
  assert.match(decodeURIComponent(lineHref(text)), /總分 91/);
  assert.match(facebookHref('https://risk.example/?r=v1'), /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
});

test('連環題對照：跌時退漲時追，以及腰斬後攤平', () => {
  const answers = {};
  const frames = {};
  for (const question of quiz.questions) {
    answers[question.id] = question.options[0].id;
    if (question.category === 'behavior') frames[question.id] = 'actual';
  }
  answers['tariff-shock'] = 'cut';
  answers['tariff-rebound'] = 'chase';
  answers['july-drop'] = 'add';
  answers['july-half'] = 'average';
  const report = buildReport(quiz, { ...held, answers: materialize(quiz, held, answers, frames) });
  const tariff = report.chains.find((chain) => chain.id === 'tariff-2025');
  const july = report.chains.find((chain) => chain.id === 'july-2026');
  assert.equal(tariff.first.label, '先減碼');
  assert.equal(tariff.second.label, '加碼，但不超過跌前水位');
  assert.match(tariff.reading, /順勢的追/);
  assert.equal(july.first.label, '當天或隔天加碼');
  assert.equal(july.second.label, '腰斬後攤平加碼');
  assert.match(july.reading, /腰斬後把成本攤下來/);
});

test('第二題題幹承接第一題的選擇', () => {
  const rebound = quiz.questions.find((question) => question.id === 'tariff-rebound');
  const text = resolvePrompt(quiz, rebound, held, { 'tariff-shock': 'cut' }, { 'tariff-rebound': 'actual' });
  assert.match(text, /^你剛才選的是「先減碼」。4 月 10 日/);
});

test('沒有相關部位，或年資對不上，預設用假設；本人可以改口', () => {
  const bear = quiz.questions.find((question) => question.id === 'y2022');
  const july = quiz.questions.find((question) => question.id === 'july-drop');
  const cashOnly = { years: 'y7', products: ['cash'] };
  const newbie = { years: 'lt1', products: ['tw_stock', 'us_stock'] };
  assert.equal(canClaimActual(bear, cashOnly), false);
  assert.equal(resolveFrame(bear, cashOnly, 'actual'), 'hypo');
  assert.equal(resolveFrame(bear, newbie, undefined), 'hypo');
  assert.equal(resolveFrame(bear, newbie, 'actual'), 'actual');
  assert.equal(resolveFrame(july, newbie, undefined), 'actual');
  assert.equal(canClaimActual(july, { years: 'y7', products: ['us_etf'] }), false);
  assert.equal(canClaimActual(bear, { years: 'y7', products: ['us_etf'] }), true);
  const answers = stamped(cashOnly, (question) => question.options[0]);
  const report = buildReport(quiz, { ...cashOnly, answers });
  assert.equal(report.hypoCount, report.behaviorCount);
});

test('分享碼可以來回，壞連結不會被讀成答案', () => {
  const experience = { years: 'y3_7', products: ['us_etf', 'gold'] };
  const answers = {};
  const frames = {};
  quiz.questions.forEach((question, index) => {
    answers[question.id] = question.options[index % 4].id;
    if (question.category === 'behavior') frames[question.id] = index % 2 === 0 ? 'hypo' : undefined;
  });
  const stateAnswers = materialize(quiz, experience, answers, frames);
  const code = encodeShare(quiz, { ...experience, answers: stateAnswers });
  const decoded = decodeShare(quiz, code);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.state.years, 'y3_7');
  assert.deepEqual(decoded.state.products, ['us_etf', 'gold']);
  for (const question of quiz.questions) {
    assert.equal(decoded.state.answers[question.id].optionId, stateAnswers[question.id].optionId);
    if (question.category === 'behavior') {
      assert.equal(decoded.state.answers[question.id].frame, stateAnswers[question.id].frame);
    }
  }
  assert.equal(decodeShare(quiz, 'v9.0.00.000.aaaaaaa').ok, false);
  assert.equal(decodeShare(quiz, 'v1.nope').ok, false);
  assert.equal(decodeShare(quiz, '').ok, false);
});

test('現金和其他商品互斥', () => {
  assert.deepEqual(toggleProduct(quiz, [], 'cash'), ['cash']);
  assert.deepEqual(toggleProduct(quiz, ['cash'], 'tw_stock'), ['tw_stock']);
  assert.deepEqual(toggleProduct(quiz, ['tw_stock', 'us_etf'], 'tw_stock'), ['us_etf']);
  assert.deepEqual(toggleProduct(quiz, ['tw_stock'], 'cash'), ['cash']);
  assert.deepEqual(toggleProduct(quiz, ['cash'], 'cash'), []);
});
