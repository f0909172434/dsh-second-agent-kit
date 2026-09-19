# DSH 第二助手工具組

[English](README.md) · **繁體中文**

為 macOS 上的 DeepSeek Harness 0.1.5-rc.2 補上可檢查的執行限制、記憶隔離修正和獨立文件轉檔工具。本專案採 MIT 授權；不改變 DSH Desktop 本身的授權條款。

## 提供的功能

- **操作批准**：保留宿主既有的拒絕／詢問結果，對瀏覽器寫入、接管既有分頁，以及常見發布與刪除命令追加確認。
- **macOS 程序限制**：沿用官方 Seatbelt provider 的檔案政策，額外阻擋受限 shell 程序的 IP 網路和 Apple Events。本機計算及工作區寫入可繼續；Unix socket 保留供 LibreOffice 等應用在本機通訊。
- **Engram 0.7.5 修正**：以完整非 Git 工作區路徑建立識別，工具依呼叫會話選擇專案資料庫，自動攝取寫入專案範圍。跨專案偏好須明確指定 user 範圍。
- **Office 預覽**：使用獨立安裝的 LibreOffice 與 macOS 系統字型，將文件轉成 PDF 和逐頁 PNG，避免中文字型缺失未被發現。
- **相容性修正記錄**：包含 Verified Search patch，以及未通過實機驗收的 computer-use 實驗 patch。後者不會由本套件安裝或啟用。

Mac 輸入遇到連續兩次已知介面錯誤，或單輪達到 20 次輸入後，工具層會拒絕本輪後續操作；仍可觀察畫面，新的使用者輪次才會重置。重新觀察或更換輸入工具不能清除失敗次數。此限制不等於模型費用上限。

## 安裝防護插件

需求：macOS 14 以上、Node 24、DSH 0.1.5-rc.2，以及既有的 workspace-write／ask 權限模式。先在獨立測試 profile 驗證。

```sh
git clone https://github.com/f0909172434/dsh-second-agent-kit.git
cd dsh-second-agent-kit
npm ci
npm test
npm pack
mkdir -p "$HOME/.dsh/packages/dsh-second-agent-kit-0.1.4"
tar -xzf dsh-second-agent-kit-0.1.4.tgz -C "$HOME/.dsh/packages/dsh-second-agent-kit-0.1.4"
dsh plugin --profile YOUR_TEST_PROFILE add "file:$HOME/.dsh/packages/dsh-second-agent-kit-0.1.4/package"
```

套件會停用上游 `sandbox` 入口，加入 `second-agent-sandbox` 與 `second-agent-approval`。前者繼承上游檔案政策；不是改用無限制 shell。若已有本機 `daily-approval`，驗證成功後再停用重複入口。保留 DSH 自己的批准插件。

不支援的沙箱執行器會明確失敗；不會偷偷改成未受限執行。此版本僅支援 macOS，Linux CI 只驗證可攜邏輯，不代表 Linux 部署已受支援。不要永久啟用 `danger-full-access`；該模式本來就不經宿主的程序限制。網路命令需要宿主既有的逐次提權與使用者批准。

## 記憶修正與驗證

取得官方 `@kenz1117/dsh-engram@0.7.5` npm 封裝並解開，再執行：

```sh
python3 scripts/patch-engram.py /path/to/pristine-package /path/to/new-package
# 在測試 profile 安裝修正版及其依賴之後：
DSH_ENGRAM_MODULE=/path/to/installed/patched/lib/index.js node tests/memory-runtime.mjs
```

此測試以可丟棄的資料庫呼叫真實記憶工具，檢查並行專案隔離、更新、忘記及明確的 user 範圍共享；不呼叫付費模型。需要插件自己的本機嵌入模型；`DSH_EMBEDDING_CACHE` 可指定既有快取。

相同 Git origin 的工作區刻意共享專案記憶。舊資料庫不會自動遷移，設定介面的專案視圖仍受宿主工作目錄影響。升級或搬移正式記憶前，先備份並測試。

## 文件轉檔

從 [LibreOffice 官方網站](https://www.libreoffice.org/) 安裝應用程式，並在獨立 Python 環境安裝 PyMuPDF：

```sh
python scripts/render-office.py input.docx new-preview-directory --png
```

支援 DOCX、XLSX、PPTX、ODT、ODS、ODP。工具使用隔離的暫存 profile，保留來源文件，拒絕覆蓋既有 PDF。省略 `--png` 時不需要 PyMuPDF。`--soffice` 可指定 LibreOffice 執行檔。

每頁 PNG 都要實際查看，不能只抽取文字就宣稱版面正常。LibreOffice 排版不保證與 Microsoft Word 完全一致；試算表重算、簡報動畫仍須在目標應用驗證。

## Computer-use 與搜尋 patch

`patches/` 保存修正及對應的上游 commit、授權。computer-use 必須在記錄的原始碼版本上套用，並執行上游 `pnpm run build`，同時重建 JavaScript 與原生 helper。

**目前的 computer-use patch 沒有解決 Word 檔案面板問題。** 它只作失敗實驗紀錄，不應當成正式修復安裝。編譯和單元測試成功不等於 Mac 畫面操作成功。

## 驗證與限制

`npm test` 驗證批准政策、宿主配置組合、上游 provider 整合，以及 macOS 核心實際允許工作區寫入、拒絕越界寫入／TCP 連線、允許本機 Unix socket。

這不是所有工具共用的完整安全邊界。命令樣式比對只是補充；瀏覽器、MCP、GUI 與其他插件各有權限。本機 IPC 可能連到具有額外權限的服務或代理，因此不能宣稱完全阻止所有對外副作用。允許寫入的檔案也可能被其他程序讀取。

完整實測、失敗與尚未驗證事項見 [VALIDATION.md](VALIDATION.md)。公開倉庫不得包含 API 金鑰、使用者文件、對話紀錄或正式記憶資料庫。

## 回復

停止 DSH，從目標 profile 的套件與 bundles 移除本插件，確認上游 `sandbox` 已恢復且只有一個有效 provider，再重新啟動。若先前停用重複的本機批准插件，可在核對後恢復。不要只停用新的 provider，卻保留原 provider 的停用狀態。

移除插件會失去額外的 IP 網路與 Apple Events 限制。記憶 patch、文件技能與 provider 憑證是獨立配置，不會因移除防護套件自動回復。

## 授權

工具組採 [MIT](LICENSE)。各上游 patch 的原授權另存於 `patches/`。本專案不是 DeepSeek 官方產品，不改變其他軟體的授權或服務條款。

桌面 0.15.6 會把本機壓縮包誤判為遺失的資料夾並在啟動時移除，因此請保留上述解壓目錄。Mac 操作每輪連續兩次已知失敗或累積 20 次輸入後，工具層會拒絕繼續輸入；重新觀察畫面不會重置限制。這不等於模型費用的硬性上限。
