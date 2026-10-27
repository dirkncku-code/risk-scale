import { canClaimActual } from './model.js';

export function encodeShare(quiz, state) {
  const yearIndex = quiz.years.findIndex((item) => item.id === state.years);
  if (yearIndex < 0) throw new Error('年資缺漏');
  let mask = 0;
  for (const id of state.products) {
    const index = quiz.products.findIndex((item) => item.id === id);
    if (index < 0) throw new Error(`商品缺漏 ${id}`);
    mask |= 1 << index;
  }
  const width = Math.ceil(quiz.products.length / 4);
  const hex = mask.toString(16).padStart(width, '0');
  const answerChars = quiz.questions.map((question) => {
    const index = question.options.findIndex((option) => option.id === state.answers[question.id]?.optionId);
    if (index < 0) throw new Error(`答案缺漏 ${question.id}`);
    return String(index);
  }).join('');
  const frameChars = quiz.questions
    .filter((question) => question.category === 'behavior')
    .map((question) => (state.answers[question.id].frame === 'hypo' ? 'h' : 'a'))
    .join('');
  return `v${quiz.codecVersion}.${yearIndex}.${hex}.${answerChars}.${frameChars}`;
}

export function decodeShare(quiz, raw) {
  const fail = (error) => ({ ok: false, error });
  if (!raw) return fail('連結是空的');
  const parts = String(raw).split('.');
  if (parts.length !== 5) return fail('連結格式不對');
  const [version, yearCode, hex, answerChars, frameChars] = parts;
  if (version !== `v${quiz.codecVersion}`) return fail('這份連結的版本和現在的題庫對不上');
  const yearIndex = Number(yearCode);
  if (!Number.isInteger(yearIndex) || !quiz.years[yearIndex]) return fail('年資讀不出來');
  const width = Math.ceil(quiz.products.length / 4);
  if (!new RegExp(`^[0-9a-f]{${width}}$`).test(hex)) return fail('商品讀不出來');
  const mask = Number.parseInt(hex, 16);
  if (mask < 0 || mask >= (1 << quiz.products.length)) return fail('商品讀不出來');
  const products = quiz.products.filter((_, index) => (mask & (1 << index)) !== 0).map((item) => item.id);
  if (products.length === 0) return fail('連結裡沒有商品');
  if (answerChars.length !== quiz.questions.length || !/^[0-3]+$/.test(answerChars)) {
    return fail('答案和現在的題數對不上');
  }
  const behavior = quiz.questions.filter((question) => question.category === 'behavior');
  if (frameChars.length !== behavior.length || !/^[ah]+$/.test(frameChars)) {
    return fail('實際或假設的標記讀不出來');
  }
  const years = quiz.years[yearIndex].id;
  const experience = { years, products };
  const answers = {};
  quiz.questions.forEach((question, index) => {
    answers[question.id] = { optionId: question.options[Number(answerChars[index])].id };
  });
  behavior.forEach((question, index) => {
    const requested = frameChars[index] === 'h' ? 'hypo' : 'actual';
    answers[question.id].frame = requested === 'actual' && canClaimActual(question, experience) ? 'actual' : 'hypo';
  });
  return { ok: true, state: { years, products, answers } };
}
