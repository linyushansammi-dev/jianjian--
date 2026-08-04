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
