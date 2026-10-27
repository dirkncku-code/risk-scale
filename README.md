# 風險刻度

德克mur mur 的投資風險承受度測驗。了解自己，找到睡得著的組合。分數高不代表比較會投資，也不構成投資建議。

公開網址：<https://dirkncku-code.github.io/risk-scale/>

沒有登入，沒有資料庫。作答存在瀏覽器的 `localStorage`（鍵名 `dk-risk-scale-v1`）。分享用網址參數 `?r=`。別人的連結不會寫進這台瀏覽器的作答。推上 `main` 之後，GitHub Actions 會建置並部署到 GitHub Pages。

結果五檔：極保守 20–36、保守 37–52、穩健 53–68、成長 69–84、積極 85–100。期望報酬假設現金 2%、債券 3.5%、指數股票 8%、個股 10.5%，按配置加權後以區間顯示。最大回撤是各檔寫死的規劃幅度。自評比下跌當天的動作高出門檻時，配置降一檔，並註明以行為為準；總分不改。

開頭頁的「先看範例結果」用題庫裡的 `example`，不寫入 localStorage。Line 分享帶結果連結和測驗開頭；Facebook 分享帶結果頁網址，標題與描述寫進頁面的 meta。靜態網站沒有伺服器，Facebook 的爬蟲讀不到這份依結果變動的 meta。

## 開發

```bash
npm install
npm test
npm run dev
npm run build
```

## 怎麼加題

題目都在 `src/content/quiz.js`。計分、降檔、分享碼在 `src/engine/`，畫面不認得特定題號。

1. 在 `questions` 加一筆。四個選項，分數必須依序是 1、2、4、5。
2. 漲跌行為題要有 `scene`、`related`、`prompts.actual`、`prompts.hypothetical`，並標 `tide: 'against'` 或 `'with'`。
3. 連環題第二題設 `chain.step: 2` 和 `chain.follows`，而且必須緊接在第一題後面。對照句寫在 `chainReadings`。
4. 刻度區間要從「題數 × 1」接到「題數 × 5」，中間不能有洞。加題之後滿分會變，五段配置要一起改。
5. 改了題數、選項順序或商品清單，就把 `codecVersion` 加一。舊的分享連結會顯示讀不了，不會被錯解。
6. `npm test`。結構不對會直接失敗。

年資若早於行情，行為題預設用假設，作答者可以改口成實際。近三年沒碰相關商品，則只能用假設。
