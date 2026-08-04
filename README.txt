健健健身 JianJian Stable

這是一套完整且一致的專案檔案，基底為最後確認可執行的 v11.7。
本版只修正「菜單修改後無法確實儲存」：
- 輸入文字或熱量後標示尚未儲存。
- 儲存時先寫入 localStorage。
- 已登入時，以既有 Firestore 格式 {json: JSON.stringify(menu)} 寫入 users/{uid}/menus/{日期}。
- 切換日期前提醒未儲存內容。
- 不更動登入、好友、訓練、生理週期、首頁及其他功能。

建議建立新的 GitHub Repository，例如 jianjian-stable，將本 ZIP 內所有檔案一次上傳至根目錄。
GitHub Pages 設定：Deploy from a branch / main / (root)。


Stable Calorie Progress：
- 首頁新增今日熱量進度條。
- 目前熱量由當天菜單各餐的估計熱量自動加總。
- 使用菜單頁修改餐點與熱量後，首頁立即重新計算。
- 按儲存後保留本機與 Firestore 菜單資料。
- 顯示剩餘熱量、剛好達標或超過熱量。
- 超過目標時進度條及提示改為紅色。
- 僅修改熱量顯示，不變更登入、好友、訓練或其他架構。
- app.js / style.css 快取參數為 1172。


Custom metrics + GIF guides: removed fixed quick add; added edit/reset; added 6 original GIF guides and proficiency display. Cache 1173.


JianJian Ultimate — Build 1401

本次只做低風險基礎整理：

1. 修正動作庫「只看收藏」使用未定義 id 的錯誤。
2. 修正 style.css 快取網址含有兩個 ?v= 的問題。
3. 所有動作要點加入：
   - YouTube 中文教學
   - YouTube 完整示範
4. 連結依動作名稱自動搜尋，因此內建與自訂動作都可使用。
5. 有 GIF 的動作顯示 GIF＋YouTube。
6. 沒有 GIF 的動作顯示備援提示＋YouTube。
7. 不修改 Google 登入、Firebase、好友、菜單、訓練與生理週期資料結構。

部署後請測試：
- 首頁是否正常載入
- 動作庫搜尋及只看收藏
- 任一動作 → 查看教學 → YouTube 兩個按鈕
- GIF 有無時皆能正常顯示
