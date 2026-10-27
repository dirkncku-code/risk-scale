export function flowOf(quiz) {
  return [
    { kind: 'years' },
    { kind: 'products' },
    ...quiz.questions.map((question) => ({ kind: 'score', id: question.id })),
  ];
}

export function questionById(quiz, id) {
  return quiz.questions.find((question) => question.id === id);
}

export function optionOf(question, optionId) {
  return question.options.find((option) => option.id === optionId);
}

export function missedEvent(rule, years) {
  if (rule === 'before-2023') return years === 'lt1' || years === 'y1_3';
  if (rule === 'before-2024-08' || rule === 'before-2025-04') return years === 'lt1';
  return false;
}

export function hasRelated(question, products) {
  return (question.related ?? []).some((id) => products.includes(id));
}

export function canClaimActual(question, experience) {
  if (question.category !== 'behavior') return false;
  return hasRelated(question, experience?.products ?? []);
}

export function resolveFrame(question, experience, override) {
  if (!canClaimActual(question, experience)) return 'hypo';
  if (override === 'actual' || override === 'hypo') return override;
  if (missedEvent(question.missedWhen, experience.years)) return 'hypo';
  return 'actual';
}

export function frameHint(question, experience, frame) {
  const related = canClaimActual(question, experience);
  const missed = missedEvent(question.missedWhen, experience?.years);
  if (!related) {
    return { text: '你近三年沒有碰這類部位，這題用假設。', canToggle: false };
  }
  if (frame === 'hypo' && missed) {
    return {
      text: '以你填的年資，這段多半早於你進場。這題先用假設。',
      canToggle: true,
      toggleTo: 'actual',
      toggleLabel: '我當時就有部位，改問實際',
    };
  }
  if (frame === 'hypo') {
    return {
      text: '這題改成假設。',
      canToggle: true,
      toggleTo: 'actual',
      toggleLabel: '改問我當時的動作',
    };
  }
  return {
    text: '這題問你當時的實際動作。',
    canToggle: true,
    toggleTo: 'hypo',
    toggleLabel: '當時沒有部位，改問假設',
  };
}

export function resolvePrompt(quiz, question, experience, answers, frames) {
  if (question.category !== 'behavior') return question.prompt;
  const frame = resolveFrame(question, experience, frames[question.id]);
  const body = frame === 'actual' ? question.prompts.actual : question.prompts.hypothetical;
  if (question.chain?.step !== 2) return body;
  const previous = questionById(quiz, question.chain.follows);
  const previousOption = optionOf(previous, answers[previous?.id]);
  if (!previousOption) return body;
  return `你剛才選的是「${previousOption.label}」。${body}`;
}

export function materialize(quiz, experience, answers, frames) {
  const out = {};
  for (const question of quiz.questions) {
    const optionId = answers[question.id];
    if (!optionOf(question, optionId)) return null;
    out[question.id] = {
      optionId,
      frame: question.category === 'behavior'
        ? resolveFrame(question, experience, frames[question.id])
        : undefined,
    };
  }
  return out;
}

export function normalize(score, count) {
  return ((score - count) / (count * 4)) * 100;
}

function sumQuestions(questions, answers) {
  return questions.reduce((total, question) => {
    const option = optionOf(question, answers[question.id].optionId);
    return total + option.score;
  }, 0);
}

export function planNumbers(weights, assumptions) {
  const { cash, bond, index, stock } = weights;
  const returns = assumptions.returnBps;
  const returnBps = (cash * returns.cash + bond * returns.bond + index * returns.index + stock * returns.stock) / 100;
  return { returnBps };
}

export function formatReturn(bps) {
  const tenths = Math.round(bps / 10);
  const absolute = Math.abs(tenths);
  const sign = tenths < 0 ? '-' : '';
  return `${sign}${Math.trunc(absolute / 10)}.${absolute % 10}%`;
}

export function exampleState(quiz) {
  const sample = quiz.example;
  const experience = { years: sample.years, products: sample.products };
  const answers = {};
  const frames = {};
  quiz.questions.forEach((question, index) => {
    const option = question.options[sample.picks[index]];
    answers[question.id] = option.id;
    if (question.category === 'behavior') frames[question.id] = resolveFrame(question, experience, undefined);
  });
  const state = materialize(quiz, experience, answers, frames);
  if (!state) throw new Error('範例答案組不出結果');
  return { years: sample.years, products: [...sample.products], answers: state };
}

export function profileForScore(quiz, total) {
  const found = quiz.profiles.find((profile) => total >= profile.min && total <= profile.max);
  if (!found) throw new Error(`分數 ${total} 不在刻度上`);
  return found;
}

export function stepDown(quiz, profile, gap) {
  if (gap < quiz.gapStep) return { profile, stepped: false };
  const index = quiz.profiles.findIndex((item) => item.id === profile.id);
  if (index <= 0) return { profile, stepped: false };
  return { profile: quiz.profiles[index - 1], stepped: true };
}

export function chainPairs(quiz) {
  const pairs = [];
  quiz.questions.forEach((question, index) => {
    if (question.chain?.step === 1) pairs.push({ first: question, second: quiz.questions[index + 1] });
  });
  return pairs;
}

function sideOf(question, answers) {
  const answer = answers[question.id];
  const option = optionOf(question, answer.optionId);
  return {
    stepLabel: question.chain.stepLabel,
    label: option.label,
    tag: option.tag,
    score: option.score,
    frame: answer.frame,
  };
}

export function readChain(quiz, pair, answers) {
  const firstTag = optionOf(pair.first, answers[pair.first.id].optionId).tag;
  const secondTag = optionOf(pair.second, answers[pair.second.id].optionId).tag;
  const rules = quiz.chainReadings[pair.first.chain.id] ?? [];
  const hit = rules.find((rule) => rule.when(firstTag, secondTag));
  return {
    id: pair.first.chain.id,
    title: pair.first.chain.title,
    reading: hit?.text ?? '',
    first: sideOf(pair.first, answers),
    second: sideOf(pair.second, answers),
  };
}

export function gapReading(quiz, gap, followBehavior, stepped, raw, shown) {
  const rounded = Math.round(gap);
  if (followBehavior) {
    const moved = stepped
      ? `配置改採${shown.name}，不採用總分所在的${raw.name}。`
      : `總分已經在${raw.name}，沒有更低的一檔，配置維持這裡。`;
    return `上漲時的自評比下跌當天的動作更積極（距離 ${rounded} 分，門檻 ${quiz.gapStep} 分）。以行為為準。${moved}總分沒有改。`;
  }
  if (gap <= -quiz.gapStep) {
    return `下跌當天的動作比上漲時的自評更敢（距離 ${rounded} 分）。配置不因此調高。敢加碼和睡得著是兩件事。`;
  }
  return `上漲時的自評和下跌當天的動作，距離 ${rounded} 分，還沒到「以行為為準」的 ${quiz.gapStep} 分。配置跟總分同一檔。`;
}

export function fillTemplate(template, fields) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (fields[key] == null ? '' : String(fields[key])));
}

function shareFields(report, resultUrl, startUrl) {
  return {
    name: report.shown.name,
    score: report.total,
    resultUrl,
    startUrl,
  };
}

export function lineMessage(quiz, report, resultUrl, startUrl) {
  return fillTemplate(quiz.shareTemplates.line, shareFields(report, resultUrl, startUrl));
}

export function resultTitle(quiz, report) {
  return fillTemplate(quiz.shareTemplates.title, shareFields(report, '', ''));
}

export function resultDescription(quiz, report) {
  return fillTemplate(quiz.shareTemplates.description, shareFields(report, '', ''));
}

export function lineHref(text) {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}

export function facebookHref(resultUrl) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resultUrl)}`;
}

export function buildReport(quiz, state) {
  const { years, products, answers } = state;
  const total = sumQuestions(quiz.questions, answers);
  const byCategory = {};
  for (const category of quiz.categories) {
    const grouped = quiz.questions.filter((question) => question.category === category.id);
    const score = sumQuestions(grouped, answers);
    byCategory[category.id] = {
      id: category.id,
      label: category.label,
      blurb: category.blurb,
      score,
      max: grouped.length * 5,
      norm: normalize(score, grouped.length),
    };
  }
  const against = quiz.questions.filter((question) => question.tide === 'against');
  const againstScore = sumQuestions(against, answers);
  const againstNorm = normalize(againstScore, against.length);
  const gap = byCategory.preference.norm - againstNorm;
  const rawProfile = profileForScore(quiz, total);
  const followBehavior = gap >= quiz.gapStep;
  const stepped = stepDown(quiz, rawProfile, gap);
  const behavior = quiz.questions.filter((question) => question.category === 'behavior');
  return {
    total,
    max: quiz.questions.length * 5,
    byCategory,
    against: {
      score: againstScore,
      max: against.length * 5,
      count: against.length,
      norm: againstNorm,
    },
    preferenceNorm: byCategory.preference.norm,
    gap,
    rawProfile,
    shown: stepped.profile,
    stepped: stepped.stepped,
    followBehavior,
    numbers: planNumbers(stepped.profile.weights, quiz.assumptions),
    gapText: gapReading(quiz, gap, followBehavior, stepped.stepped, rawProfile, stepped.profile),
    chains: chainPairs(quiz).map((pair) => readChain(quiz, pair, answers)),
    singles: quiz.questions
      .filter((question) => question.category === 'behavior' && !question.chain)
      .map((question) => ({
        id: question.id,
        title: question.scene.title,
        label: optionOf(question, answers[question.id].optionId).label,
        frame: answers[question.id].frame,
      })),
    choices: quiz.questions.map((question) => {
      const option = optionOf(question, answers[question.id].optionId);
      return {
        id: question.id,
        category: question.category,
        title: question.scene?.title ?? question.prompt,
        label: option.label,
        score: option.score,
        frame: answers[question.id].frame ?? null,
      };
    }),
    hypoCount: behavior.filter((question) => answers[question.id].frame === 'hypo').length,
    behaviorCount: behavior.length,
    years,
    products,
  };
}

export function toggleProduct(quiz, list, id) {
  const product = quiz.products.find((item) => item.id === id);
  if (!product) return list;
  const has = list.includes(id);
  if (product.exclusive) return has ? [] : [id];
  const next = list.filter((item) => {
    const known = quiz.products.find((entry) => entry.id === item);
    return known && !known.exclusive && item !== id;
  });
  return has ? next : [...next, id];
}

export function sanitizeDraft(quiz, draft) {
  if (!draft || draft.version !== quiz.storageVersion) return null;
  const years = quiz.years.some((item) => item.id === draft.years) ? draft.years : null;
  const products = Array.isArray(draft.products)
    ? draft.products.filter((id) => quiz.products.some((item) => item.id === id))
    : [];
  const answers = {};
  const frames = {};
  const rawAnswers = draft.answers && typeof draft.answers === 'object' ? draft.answers : {};
  const rawFrames = draft.frames && typeof draft.frames === 'object' ? draft.frames : {};
  for (const question of quiz.questions) {
    const optionId = rawAnswers[question.id];
    if (typeof optionId === 'string' && optionOf(question, optionId)) answers[question.id] = optionId;
    if (rawFrames[question.id] === 'actual' || rawFrames[question.id] === 'hypo') {
      frames[question.id] = rawFrames[question.id];
    }
  }
  if (!years && products.length === 0 && Object.keys(answers).length === 0) return null;
  const last = flowOf(quiz).length - 1;
  const cursor = Number.isInteger(draft.cursor) ? Math.min(Math.max(draft.cursor, 0), last) : 0;
  const completed = Boolean(draft.completed && years && products.length > 0 && Object.keys(answers).length === quiz.questions.length);
  return { years, products, answers, frames, cursor, completed };
}

export function validateQuiz(quiz) {
  const errors = [];
  const ids = new Set();
  quiz.questions.forEach((question, index) => {
    if (!question.id || ids.has(question.id)) errors.push(`題目 id 重複或缺少：${question.id}`);
    ids.add(question.id);
    if (!quiz.categories.some((category) => category.id === question.category)) {
      errors.push(`${question.id} 類別不存在`);
    }
    if (question.options?.length !== 4) errors.push(`${question.id} 要有四個選項`);
    const scores = (question.options ?? []).map((option) => option.score).join(',');
    if (scores !== '1,2,4,5') errors.push(`${question.id} 分數順序是 ${scores}`);
    const optionIds = new Set();
    for (const option of question.options ?? []) {
      if (!option.id || !option.label || !option.tag) errors.push(`${question.id} 選項缺欄位`);
      if (optionIds.has(option.id)) errors.push(`${question.id} 選項 id 重複`);
      optionIds.add(option.id);
    }
    if (question.category === 'behavior') {
      if (question.tide !== 'with' && question.tide !== 'against') errors.push(`${question.id} 要標順勢或逆勢`);
      if (!question.scene?.title || !question.scene?.body || !question.scene?.source) errors.push(`${question.id} 缺情境`);
      if (!question.related?.length) errors.push(`${question.id} 缺相關商品`);
      if (!question.prompts?.actual || !question.prompts?.hypothetical) errors.push(`${question.id} 缺兩種題幹`);
      for (const productId of question.related) {
        if (!quiz.products.some((product) => product.id === productId)) errors.push(`${question.id} 相關商品 ${productId}`);
      }
    } else if (!question.prompt) {
      errors.push(`${question.id} 缺題幹`);
    }
    if (question.chain?.step === 2) {
      const previous = quiz.questions[index - 1];
      if (!previous || previous.id !== question.chain.follows) {
        errors.push(`${question.id} 必須緊接在 ${question.chain.follows} 後面`);
      }
      if (previous?.chain?.id !== question.chain.id || previous?.chain?.step !== 1) {
        errors.push(`${question.id} 的連環不完整`);
      }
    }
    if (question.chain?.step === 1 && quiz.questions[index + 1]?.chain?.follows !== question.id) {
      errors.push(`${question.id} 後面沒有接上第二題`);
    }
  });

  const chainIds = new Set(quiz.questions.filter((question) => question.chain).map((question) => question.chain.id));
  for (const chainId of chainIds) {
    const rules = quiz.chainReadings?.[chainId];
    if (!rules?.length) errors.push(`連環 ${chainId} 沒有對照句`);
    if (rules?.some((rule) => typeof rule.when !== 'function' || !rule.text)) errors.push(`連環 ${chainId} 規則不完整`);
  }

  const minimum = quiz.questions.length;
  const maximum = quiz.questions.length * 5;
  let expect = minimum;
  for (const profile of quiz.profiles) {
    const weight = profile.weights.cash + profile.weights.bond + profile.weights.index + profile.weights.stock;
    if (weight !== 100) errors.push(`${profile.name} 配置加總 ${weight}`);
    if (typeof profile.singleCap !== 'number' || profile.singleCap < 0 || profile.singleCap > 100) {
      errors.push(`${profile.name} 個股上限不對`);
    }
    if (typeof profile.returnLow !== 'number' || typeof profile.returnHigh !== 'number' || profile.returnLow > profile.returnHigh) {
      errors.push(`${profile.name} 報酬區間不對`);
    }
    if (!profile.returnLabel || !profile.drawdownLabel || !profile.feel) errors.push(`${profile.name} 缺結果說明`);
    const point = planNumbers(profile.weights, quiz.assumptions).returnBps;
    if (point < profile.returnLow * 100 || point > profile.returnHigh * 100) {
      errors.push(`${profile.name} 加權報酬不在所寫的區間`);
    }
    if (profile.min !== expect) errors.push(`${profile.name} 應從 ${expect} 分開始`);
    if (profile.max < profile.min) errors.push(`${profile.name} 區間顛倒`);
    expect = profile.max + 1;
  }
  const sample = quiz.example;
  if (!sample || sample.picks?.length !== quiz.questions.length) errors.push('範例答案長度不對');
  else if (!quiz.years.some((item) => item.id === sample.years)) errors.push('範例年資不存在');
  else if (!sample.products?.length || sample.products.some((id) => !quiz.products.some((item) => item.id === id))) {
    errors.push('範例商品不存在');
  } else {
    sample.picks.forEach((pick, index) => {
      if (!Number.isInteger(pick) || pick < 0 || pick > 3) errors.push(`範例第 ${index + 1} 題選項超出範圍`);
    });
  }
  if (quiz.profiles.length && expect !== maximum + 1) errors.push(`刻度停在 ${expect - 1}，應到 ${maximum}`);
  if (quiz.products.filter((product) => product.exclusive).length !== 1) errors.push('要有一個互斥的現金選項');

  if (errors.length) {
    const error = new Error(errors.join('\n'));
    error.errors = errors;
    throw error;
  }
}
