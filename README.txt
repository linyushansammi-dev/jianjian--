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
