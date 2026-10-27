function choice(id, label, tag) {
  return { id, label, tag };
}

function options(first, second, third, fourth) {
  return [
    { ...first, score: 1 },
    { ...second, score: 2 },
    { ...third, score: 4 },
    { ...fourth, score: 5 },
  ];
}

const EQUITY = ['tw_etf', 'tw_stock', 'us_etf', 'us_stock', 'crypto'];
const LISTED = ['tw_etf', 'tw_stock', 'us_etf', 'us_stock'];
const TAIWAN = ['tw_etf', 'tw_stock'];
const USD = ['us_etf', 'us_stock', 'crypto', 'gold'];

const questions = [
  {
    id: 'horizon',
    category: 'allocation',
    prompt: '這筆用來投資的錢，最短多久內不會拿去付生活？',
    options: options(
      choice('year', '一年內可能要用', 'low'),
      choice('three', '一到三年', 'guarded'),
      choice('seven', '三到七年', 'open'),
      choice('long', '七年以上，而且生活費另有預備', 'high'),
    ),
  },
  {
    id: 'income',
    category: 'allocation',
    prompt: '這筆錢若虧損，對你的生活？',
    options: options(
      choice('tight', '賠了，生活會立刻緊', 'low'),
      choice('cut', '賠一截會緊縮開銷，但還過得去', 'guarded'),
      choice('salary', '生活靠薪資或事業，這筆錢賠了不改開銷', 'open'),
      choice('half', '就算腰斬，收入和開銷都不受影響', 'high'),
    ),
  },
  {
    id: 'cashfloor',
    category: 'allocation',
    prompt: '你願意讓隨時拿得到的現金，佔可投資資產多低？',
    options: options(
      choice('half', '至少一半', 'low'),
      choice('third', '大約兩到三成', 'guarded'),
      choice('tenth', '大約一成', 'open'),
      choice('none', '幾乎不留，錢要在市場裡', 'high'),
    ),
  },
  {
    id: 'single',
    category: 'allocation',
    prompt: '單一檔股票，你最多讓它佔可投資資產多少？',
    options: options(
      choice('five', '不買個股，或單檔不超過 5%', 'low'),
      choice('ten', '可以到 10%', 'guarded'),
      choice('twenty', '可以到 20%', 'open'),
      choice('more', '超過 20% 我也接受', 'high'),
    ),
  },
  {
    id: 'leverage',
    category: 'allocation',
    prompt: '融資、槓桿、借錢投資，你的情況是？',
    options: options(
      choice('never', '不用，也不打算用', 'low'),
      choice('maybe', '沒用過，小比例我願意考慮', 'guarded'),
      choice('some', '用過或正在用，部位不大', 'open'),
      choice('tool', '槓桿是我平常的工具', 'high'),
    ),
  },
  {
    id: 'newmoney',
    category: 'allocation',
    prompt: '下一筆閒錢進來，你預設怎麼放？',
    options: options(
      choice('cash', '先放現金，等很有把握再動', 'low'),
      choice('index', '大多進指數，個股很少', 'guarded'),
      choice('mix', '指數為主，會撥一截挑個股', 'open'),
      choice('stock', '優先加在我看好的個股', 'high'),
    ),
  },
  {
    id: 'drawdown',
    category: 'preference',
    prompt: '帳面從高點回撤，你認為自己還睡得著的深度是？',
    options: options(
      choice('ten', '跌 10% 我就會想減', 'low'),
      choice('twenty', '大約 20%', 'guarded'),
      choice('thirtyfive', '大約 35%', 'open'),
      choice('half', '跌一半我還照計畫', 'high'),
    ),
  },
  {
    id: 'path',
    category: 'preference',
    prompt: '兩條路走到十年後，期望結果可以很接近，過程不同。你選？',
    options: options(
      choice('quiet', '每年小賺小賠，很少看到跌 15%', 'low'),
      choice('mild', '大多時候溫和上漲，偶爾跌 20%', 'guarded'),
      choice('deep', '漲得較多，中間會出現跌 35%', 'open'),
      choice('wild', '我要更高的上漲，腰斬我也接受', 'high'),
    ),
  },
  {
    id: 'bullself',
    category: 'preference',
    prompt: '市場連漲一段、你的帳戶也在高點時，你怎麼看自己的承受度？',
    options: options(
      choice('doubt', '我會提醒自己，現在的感覺不可信', 'low'),
      choice('same', '還是照原本的比例，不加風險', 'guarded'),
      choice('more', '會覺得自己可以再多一點個股', 'open'),
      choice('raise', '會覺得之前太保守，主動把風險調高', 'high'),
    ),
  },
  {
    id: 'volatility',
    category: 'preference',
    prompt: '帳戶一個月波動 8%，你會？',
    options: options(
      choice('flat', '不能接受，減到幾乎沒感覺', 'low'),
      choice('down', '不舒服，把部位降一檔', 'guarded'),
      choice('plan', '看一眼，照原計畫', 'open'),
      choice('want', '這種波動太小，我想要更大的部位', 'high'),
    ),
  },
  {
    id: 'concentration',
    category: 'preference',
    prompt: '集中和分散，你站哪邊？',
    options: options(
      choice('spread', '我要分散，不押少數幾檔', 'low'),
      choice('index', '以指數為主，個股只是點綴', 'guarded'),
      choice('sector', '可以集中在少數產業，但不單押一檔', 'open'),
      choice('few', '我就是要集中在看懂的少數幾檔', 'high'),
    ),
  },
  {
    id: 'lossmiss',
    category: 'preference',
    prompt: '你比較不能忍受哪一種？',
    options: options(
      choice('loss', '虧損。少賺可以，賠錢不行', 'low'),
      choice('lossmore', '兩邊都在意，虧損更不能接受', 'guarded'),
      choice('missmore', '兩邊都在意，錯過上漲更不能接受', 'open'),
      choice('miss', '踏空。我寧願承受回撤，也不要空倉看別人賺', 'high'),
    ),
  },
  {
    id: 'sleep',
    category: 'preference',
    prompt: '什麼情況你會因為部位睡不著？',
    options: options(
      choice('any', '一有虧損就會', 'low'),
      choice('limit', '虧損超過我事先寫下的限度', 'guarded'),
      choice('rule', '只有在我破了自己的規則時', 'open'),
      choice('rare', '很少因為部位睡不著', 'high'),
    ),
  },
  {
    id: 'y2022',
    category: 'behavior',
    tide: 'against',
    missedWhen: 'before-2023',
    related: EQUITY,
    scene: {
      title: '2022 空頭',
      body: '這不是跌一天。台股全年下跌 22.4%，1 月高點約 18619，10 月低點約 12629。標普 500 全年跌 19.4%，那斯達克跌 33.1%。',
      source: '自由財經，2022-12-31；中央社，2022-12-31',
    },
    prompts: {
      actual: '那一年你的股票或加密部位，最接近哪一個？',
      hypothetical: '如果那一年你有股票部位，你最可能做哪一個？',
    },
    options: options(
      choice('cut', '跌勢確認後，把股票降到很少', 'cut'),
      choice('freeze', '不再加碼，也不砍，放著', 'freeze'),
      choice('plan', '照原本的定期投入，不因空頭停', 'plan'),
      choice('add', '愈跌愈買，現金明顯減少', 'add'),
    ),
  },
  {
    id: 'yen2024',
    category: 'behavior',
    tide: 'against',
    missedWhen: 'before-2024-08',
    related: LISTED,
    scene: {
      title: '2024 年 8 月 5 日，日圓升值',
      body: '日圓急升，借日圓去做的交易被迫平倉，全球股市一起跌。台股當天跌 1807 點、跌幅 8.35%，收在 19830；日經跌約 12.4%。',
      source: '今周刊、上報，2024-08-05；TechNews，2024-08-06',
    },
    prompts: {
      actual: '8 月 5 日這種單日大跌，你實際最接近哪一個？',
      hypothetical: '如果那天你有股票，你最可能做哪一個？',
    },
    options: options(
      choice('cut', '當天或隔天減碼', 'cut'),
      choice('freeze', '想減，最後幾乎沒動', 'freeze'),
      choice('hold', '沒減也沒加', 'hold'),
      choice('add', '當天或反彈前加碼', 'add'),
    ),
  },
  {
    id: 'tariff-shock',
    category: 'behavior',
    tide: 'against',
    missedWhen: 'before-2025-04',
    related: LISTED,
    chain: {
      id: 'tariff-2025',
      title: '2025 年 4 月對等關稅',
      step: 1,
      stepLabel: '公布後重挫（4/7）',
    },
    scene: {
      title: '2025 年 4 月對等關稅',
      body: '4 月 2 日（美國時間）川普公布對等關稅，台灣被課 32%。台股過完清明連假，4 月 7 日單日跌 2065.87 點、跌幅 9.7%，大量個股跌停。',
      source: '中央社，2025-04-07',
    },
    prompts: {
      actual: '4 月 7 日這種跌法出現時，你實際做了什麼？',
      hypothetical: '如果那天你有股票，你會怎麼做？',
    },
    options: options(
      choice('cut', '先減碼', 'cut'),
      choice('freeze', '幾乎沒動', 'freeze'),
      choice('hold', '不賣不買', 'hold'),
      choice('add', '下跌就加碼', 'add'),
    ),
  },
  {
    id: 'tariff-rebound',
    category: 'behavior',
    tide: 'with',
    missedWhen: 'before-2025-04',
    related: LISTED,
    chain: {
      id: 'tariff-2025',
      title: '2025 年 4 月對等關稅',
      step: 2,
      follows: 'tariff-shock',
      stepLabel: '暫緩後暴漲（4/10）',
    },
    scene: {
      title: '同一段：暫緩之後的暴漲',
      body: '4 月 9 日（美國時間）川普對多數國家暫緩高額對等關稅 90 天，期間改課 10%。美股當天道瓊漲 7.87%、那斯達克漲 12.16%。台股 4 月 10 日漲 1608 點。',
      source: '中央社，2025-04-10',
    },
    prompts: {
      actual: '4 月 10 日這種大漲，你接著做了什麼？',
      hypothetical: '如果接著出現這種大漲，你會怎麼做？',
    },
    options: options(
      choice('cut', '趁漲再減', 'cut'),
      choice('hold', '維持不動', 'hold'),
      choice('chase', '加碼，但不超過跌前水位', 'chase'),
      choice('add', '加碼，而且超過跌前水位', 'add'),
    ),
  },
  {
    id: 'twd2025',
    category: 'behavior',
    tide: 'against',
    missedWhen: 'before-2025-04',
    related: USD,
    scene: {
      title: '2025 年 5 月台幣暴力升值',
      body: '5 月 2 日新台幣兌美元升值 9.53 角、收 31.064，是 2002 年以來最大單日升幅。5 月 5 日盤中到過 29.59。全月升值 2.088 元、升幅 6.98%，月底收 29.929。沒有避險的美元資產，換成台幣會縮水，就算美國的價格沒跌。',
      source: '中央社，2025-05-02、2025-05-29',
    },
    prompts: {
      actual: '你那些以美元計價、又沒有避險的部位，當時最接近哪一個？',
      hypothetical: '如果你有未避險的美股或美元資產，你最可能做哪一個？',
    },
    options: options(
      choice('cut', '因為換回台幣變少，減碼', 'cut'),
      choice('freeze', '不安，但沒有動作', 'freeze'),
      choice('hold', '當成匯率波動，部位照舊', 'hold'),
      choice('add', '趁台幣強，換成更多美元資產', 'add'),
    ),
  },
  {
    id: 'july-drop',
    category: 'behavior',
    tide: 'against',
    related: TAIWAN,
    chain: {
      id: 'july-2026',
      title: '2026 年 7 月長多急跌',
      step: 1,
      stepLabel: '急跌初期（7/7）',
    },
    scene: {
      title: '2026 年 7 月長多裡的急跌',
      body: '台股在長多之後。7 月 7 日加權指數跌 1077 點、收在 45479，人氣的高價股與被動元件開始跌停。指數仍在四萬五以上，這是急跌的開頭。',
      source: '中央社，2026-07-07',
    },
    prompts: {
      actual: '7 月 7 日急跌的開頭，你實際做了什麼？',
      hypothetical: '如果急跌的開頭你有股票，你會怎麼做？',
    },
    options: options(
      choice('cut', '先把個股減下來', 'cut'),
      choice('freeze', '擔心，但只是看著', 'freeze'),
      choice('hold', '沒有因為這一天改部位', 'hold'),
      choice('add', '當天或隔天加碼', 'add'),
    ),
  },
  {
    id: 'july-half',
    category: 'behavior',
    tide: 'against',
    related: TAIWAN,
    chain: {
      id: 'july-2026',
      title: '2026 年 7 月長多急跌',
      step: 2,
      follows: 'july-drop',
      stepLabel: '人氣股腰斬之後',
    },
    scene: {
      title: '同一段：人氣股腰斬',
      body: '7 月 17 日大盤再跌 2953 點、收在 42671。到 7 月下旬，被動元件等多檔人氣股單月跌幅超過五成；一批高價股從今年高點算下來已經腰斬。',
      source: '工商時報，2026-07-18；Yahoo 股市，2026-07-31；今周刊，2026-07-29',
    },
    prompts: {
      actual: '人氣股腰斬之後，你做了什麼？',
      hypothetical: '如果人氣股已經腰斬，你會怎麼做？',
    },
    options: options(
      choice('cut', '賣掉或再減', 'cut'),
      choice('freeze', '不再加碼，套著', 'freeze'),
      choice('hold', '不加碼，維持原計畫', 'hold'),
      choice('average', '腰斬後攤平加碼', 'average'),
    ),
  },
];

export const quiz = {
  codecVersion: 1,
  storageVersion: 1,
  brand: '德克mur mur',
  title: '風險刻度',
  fanPage: 'https://www.facebook.com/profile.php?id=61571663936725',
  gapStep: 25,
  assumptions: {
    returnBps: { cash: 200, bond: 350, index: 800, stock: 1050 },
  },
  methodNote:
    '假設各資產長期期望報酬：現金 2%、債券 3.5%、指數股票 8%、個股 10.5%。組合期望報酬按配置加權，結果頁以區間呈現，不是單一預測值。預期最大回撤是各類型事先寫好的規劃幅度，不是這組配置的歷史回測。',
  planningNote:
    '以上報酬與回撤皆為長期規劃假設，實際結果會受市場環境、估值與個人行為影響。較高的期望報酬通常伴隨較高的回撤機率與幅度。',
  disclaimer: '本工具僅供自我了解參考，不構成投資建議。',
  shareTemplates: {
    line: '我完成了風險刻度測驗，結果是【{name}】（總分 {score}）。\n查看我的結果：{resultUrl}\n你也來測測自己的風險刻度：{startUrl}',
    title: '風險刻度｜{name}（總分 {score}）',
    description: '結果是{name}，總分 {score}。睡得著的配置是長期規劃示意，不是投資建議。',
  },
  // 固定範例：總分 67，落在穩健；自評明顯高於下跌當天，結果頁改顯示保守。
  example: {
    years: 'y7',
    products: ['tw_etf', 'tw_stock', 'us_etf'],
    picks: [2, 2, 2, 1, 0, 2, 2, 2, 3, 2, 2, 2, 2, 1, 1, 0, 2, 2, 0, 3],
  },
  years: [
    { id: 'lt1', label: '不到 1 年' },
    { id: 'y1_3', label: '1 年以上、不到 3 年' },
    { id: 'y3_7', label: '3 年以上、不到 7 年' },
    { id: 'y7', label: '7 年以上' },
  ],
  products: [
    { id: 'tw_etf', label: '台股 ETF' },
    { id: 'tw_stock', label: '台股個股' },
    { id: 'us_etf', label: '美股 ETF' },
    { id: 'us_stock', label: '美股個股' },
    { id: 'bond', label: '債券' },
    { id: 'crypto', label: '加密' },
    { id: 'gold', label: '黃金' },
    { id: 'cash', label: '幾乎只有現金', exclusive: true },
  ],
  categories: [
    { id: 'allocation', label: '資金配置', blurb: '錢的期限、生活依賴、集中度與槓桿。' },
    { id: 'preference', label: '風險偏好', blurb: '你說自己扛得住多少。上漲時這一段最容易估高。' },
    { id: 'behavior', label: '漲跌行為', blurb: '真實行情裡你做了什麼，或你假設自己會做什麼。' },
  ],
  assets: [
    { key: 'cash', label: '現金', color: '#8b98a6' },
    { key: 'bond', label: '債券', color: '#6f8f86' },
    { key: 'index', label: '指數股票', color: '#d4b483' },
    { key: 'stock', label: '個股', color: '#f0e2cc' },
  ],
  intro: {
    years: {
      kicker: '不計分 · 1 / 2',
      title: '你投資多久了？',
      body: '從第一筆實際投入算起，包含台股、美股、基金、加密。紙上模擬不算。',
    },
    products: {
      kicker: '不計分 · 2 / 2',
      title: '近三年你實際碰過哪些？',
      body: '可複選。這決定後面的行情題是問你當時的動作，還是問假設。幾乎只有現金，就只選最後一項。',
    },
  },
  profiles: [
    {
      id: 'defend',
      name: '極保守',
      min: 20,
      max: 36,
      weights: { cash: 50, bond: 35, index: 15, stock: 0 },
      singleCap: 0,
      returnLow: 3,
      returnHigh: 4,
      returnLabel: '約 3–4%',
      drawdownLabel: '約 -8%',
      feel: '大多數年份波動很小，出現較大虧損的機率低',
    },
    {
      id: 'steady',
      name: '保守',
      min: 37,
      max: 52,
      weights: { cash: 30, bond: 30, index: 35, stock: 5 },
      singleCap: 5,
      returnLow: 4,
      returnHigh: 6,
      returnLabel: '約 4–6%',
      drawdownLabel: '約 -15%',
      feel: '平常較平穩，遇到空頭時有機會出現中等幅度回撤',
    },
    {
      id: 'balance',
      name: '穩健',
      min: 53,
      max: 68,
      weights: { cash: 15, bond: 20, index: 50, stock: 15 },
      singleCap: 8,
      returnLow: 6,
      returnHigh: 8,
      returnLabel: '約 6–8%',
      drawdownLabel: '約 -25%',
      feel: '長期有機會獲得較好報酬，但過程中出現兩成以上回撤的機率不低',
    },
    {
      id: 'growth',
      name: '成長',
      min: 69,
      max: 84,
      weights: { cash: 10, bond: 10, index: 45, stock: 35 },
      singleCap: 10,
      returnLow: 7,
      returnHigh: 9,
      returnLabel: '約 7–9%',
      drawdownLabel: '約 -35%',
      feel: '報酬潛力較高，但必須能接受偶爾出現大幅回撤，且回撤後需要時間修復',
    },
    {
      id: 'aggressive',
      name: '積極',
      min: 85,
      max: 100,
      weights: { cash: 5, bond: 5, index: 40, stock: 50 },
      singleCap: 15,
      returnLow: 8,
      returnHigh: 11,
      returnLabel: '約 8–11%',
      drawdownLabel: '約 -45% 或更深',
      feel: '數學上的期望報酬最高，但過程中出現腰斬等級回撤的機率明顯存在，心理壓力大，且需要更長時間修復',
    },
  ],
  questions,
  chainReadings: {
    'tariff-2025': [
      {
        when: (first, second) => ['cut', 'freeze'].includes(first) && ['chase', 'add'].includes(second),
        text: '跌的時候退或動不了，大漲那天又把部位加回去。這是順勢的追，不是跌的時候扛住。',
      },
      {
        when: (first, second) => first === 'cut' && second === 'cut',
        text: '跌也減、漲也減，風險是往下收。',
      },
      {
        when: (first, second) => first === 'cut' && second === 'hold',
        text: '減完就停，大漲那天沒有追回去。',
      },
      {
        when: (first, second) => first === 'hold' && second === 'hold',
        text: '這兩天都沒有改部位。',
      },
      {
        when: (first, second) => first === 'hold' && ['chase', 'add'].includes(second),
        text: '重挫那天沒有動，大漲這天加碼。加在上漲的那一邊。',
      },
      {
        when: (first, second) => first === 'add' && second === 'cut',
        text: '跌的時候加，大漲那天減。',
      },
      {
        when: (first, second) => first === 'add' && second === 'hold',
        text: '跌時加了，大漲這天沒有再加。',
      },
      {
        when: (first, second) => first === 'add' && ['chase', 'add'].includes(second),
        text: '跌時加、漲時再加，部位比事件前更重。',
      },
      {
        when: (first, second) => first === 'freeze' && second === 'cut',
        text: '重挫那天幾乎沒動，大漲這天趁勢把風險降下來。',
      },
      {
        when: (first, second) => first === 'freeze' && second === 'hold',
        text: '重挫那天幾乎沒動，大漲這天也沒有追。',
      },
      {
        when: () => true,
        text: '左邊是重挫當下，右邊是暴漲之後。對照看你是在減、在抱，還是在追。',
      },
    ],
    'july-2026': [
      {
        when: (first, second) => second === 'average' && first === 'add',
        text: '急跌時就加碼，腰斬之後又攤平。部位一路變重。睡得著的條件通常是趨勢破了會賣，而不是腰斬後把成本攤下來。',
      },
      {
        when: (_first, second) => second === 'average',
        text: '腰斬之後還在攤平。睡得著的條件通常是趨勢破了會賣，而不是腰斬後把成本攤下來。',
      },
      {
        when: (first, second) => first === 'cut' && second === 'cut',
        text: '急跌時減，腰斬後也沒有加回去。這比較接近「趨勢破了會賣」。',
      },
      {
        when: (first, second) => first === 'cut' && ['hold', 'freeze'].includes(second),
        text: '急跌時減過，腰斬後沒有再加。',
      },
      {
        when: (_first, second) => second === 'hold' || second === 'freeze',
        text: '腰斬後沒有再加碼。',
      },
      {
        when: (first, second) => first === 'add' && second === 'cut',
        text: '急跌時加，腰斬後改賣。',
      },
      {
        when: () => true,
        text: '左邊是急跌開頭，右邊是腰斬之後。對照看你是在減、在抱，還是在攤。',
      },
    ],
  },
};
