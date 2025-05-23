# DocuFlow 前端專案：後端 API 需求規格

## 1. 專案概覽

DocuFlow 是一個文件管理系統，允許使用者創建、編輯、提交、審核和管理文件。它具有基於角色的訪問控制 (Admin, Editor, Reviewer, Viewer)，並包含文件版本控制和審核工作流程等功能。

此文件詳細說明了支持現有前端功能所需的後端 API。前端目前使用模擬數據 (`src/lib/mockData.ts`) 和模擬身份驗證。

## 2. 核心數據模型

以下是專案中的主要數據實體，定義於 `src/lib/types.ts`：

- **`User`**:
  - `id`: string (唯一標識符)
  - `email`: string
  - `name`: string
  - `avatarUrl?`: string (可選)
  - `role`: `Role` (枚舉類型)
- **`Role`**: (枚舉) `'viewer' | 'editor' | 'reviewer' | 'admin'`
- **`ReviewStatus`**: (枚舉) `'draft' | 'pending_review' | 'approved' | 'rejected'`
- **`Document`**:
  - `id`: string (唯一標識符)
  - `title`: string
  - `content`: string (Markdown 格式，可以包含圖片 URL)
  - `imageUrl?`: string (封面圖片 URL，可選)
  - `authorId`: string (關聯 `User.id`)
  - `authorName`: string
  - `reviewerId?`: string (關聯 `User.id`, 可選)
  - `reviewerName?`: string (可選)
  - `status`: `ReviewStatus`
  - `createdAt`: string (ISO 日期字符串)
  - `updatedAt`: string (ISO 日期字符串)
  - `submittedAt?`: string (ISO 日期字符串, 可選)
  - `reviewedAt?`: string (ISO 日期字符串, 可選)
  - `rejectionReason?`: string (可選)
  - `version`: number
- **`DocumentHistoryEntry`**:
  - `id`: string (唯一標識符)
  - `timestamp`: string (ISO 日期字符串)
  - `action`: string (例如："created", "submitted", "approved", "rejected", "edited")
  - `userId`: string (執行操作的 `User.id`)
  - `userName`: string
  - `details?`: Record<string, any> (例如，拒絕原因、新審閱者)

## 3. API 端點規格

### 3.1. 身份驗證 API (`/api/auth`)

- **`POST /register`**
  - 描述：註冊新使用者。
  - 請求主體：`{ email, password, name, role? (後端可決定預設角色) }`
  - 響應：`{ user: User, token: string }` 或錯誤。
- **`POST /login`**
  - 描述：使用者登入。
  - 請求主體：`{ email, password }`
  - 響應：`{ user: User, token: string }` 或錯誤。
    - 注意：前端也支援模擬的 OAuth (Google, GitHub)。後端應能處理這些 OAuth 提供者的登入回調，並創建/關聯使用者帳戶。
- **`POST /logout`**
  - 描述：使用者登出。
  - 請求主體：(無，或包含 token 以使其失效)
  - 響應：成功/失敗狀態碼。
- **`GET /me`**
  - 描述：獲取當前已驗證使用者的詳細資訊 (需要授權 token)。
  - 響應：`User` 物件或 401 未授權。

### 3.2. 使用者 API (`/api/users`)

- **`GET /users`**
  - 描述：獲取所有使用者列表 (僅限 Admin)。
  - 查詢參數 (可選)：`role` (用於篩選)
  - 響應：`User[]`
- **`GET /users/reviewers`**
  - 描述：獲取所有具有 'reviewer' 或 'admin' 角色的使用者列表 (用於文件表單中的審閱者選擇)。
  - 響應：`User[]`
- **`PUT /users/{userId}/role`**
  - 描述：更新指定使用者的角色 (僅限 Admin)。
  - 請求主體：`{ role: Role }`
  - 響應：更新後的 `User` 物件。

### 3.3. 文件 API (`/api/documents`)

- **`POST /documents`**
  - 描述：創建一個新文件。
  - 請求主體：`{ title: string, content: string, imageUrl?: string, reviewerId?: string, action: 'save_draft' | 'submit_for_review' }`
    - 如果 `action` 是 `submit_for_review`，`reviewerId` 應為必填。
    - 後端應根據 `action` 和 `reviewerId` 設定初始 `status` (`draft` 或 `pending_review`)、`authorId`、`authorName`、`createdAt`、`updatedAt`、`version` (初始為 1)。如果提交，也設定 `submittedAt`。
  - 響應：創建的 `Document` 物件。
- **`GET /documents`**
  - 描述：獲取文件列表，支援篩選、排序和分頁。
  - 查詢參數 (可選)：
    - `authorId`: string (篩選特定作者的文件)
    - `reviewerId`: string (篩選特定審閱者的文件，例如 "pending_my_review")
    - `status`: `ReviewStatus` (篩選特定狀態的文件)
    - `view`: string (例如 'pending_my_review'，後端需解析此意圖)
    - `searchTerm`: string (在 title 和 content 中搜索)
    - `sortBy`: string (例如 'updatedAt_desc', 'title_asc')
    - `page`: number (用於分頁)
    - `limit`: number (每頁數量，用於分頁)
  - 響應：`{ documents: Document[], totalPages: number, currentPage: number }`
- **`GET /documents/{documentId}`**
  - 描述：獲取特定文件的詳細資訊。
  - 響應：`Document` 物件。
- **`PUT /documents/{documentId}`**
  - 描述：更新現有文件。
  - 請求主體：`{ title?: string, content?: string, imageUrl?: string, reviewerId?: string, action: 'save_draft' | 'resubmit_for_review' }`
    - 後端應處理版本控制 (例如，如果從 `approved` 狀態編輯，則增加 `version`)。
    - 更新 `updatedAt`。如果重新提交，更新 `submittedAt` 和狀態。
  - 響應：更新後的 `Document` 物件。
- **`DELETE /documents/{documentId}`**
  - 描述：刪除特定文件 (通常只有作者可以刪除草稿，或 Admin 可以刪除任何文件)。
  - 響應：成功/失敗狀態碼。
- **`POST /documents/{documentId}/approve`**
  - 描述：批准文件 (通常由審閱者或 Admin 執行)。
  - 請求主體：(無)
  - 響應：更新後的 `Document` 物件 (`status` 變為 'approved', 更新 `reviewedAt`)。
- **`POST /documents/{documentId}/reject`**
  - 描述：拒絕文件 (通常由審閱者或 Admin 執行)。
  - 請求主體：`{ reason: string }`
  - 響應：更新後的 `Document` 物件 (`status` 變為 'rejected', 設定 `rejectionReason`, 更新 `reviewedAt`)。
- **`POST /documents/{documentId}/reassign`**
  - 描述：重新指派文件的審閱者 (僅限 Admin)。
  - 請求主體：`{ newReviewerId: string }`
  - 響應：更新後的 `Document` 物件 (更新 `reviewerId`, `reviewerName`)。

### 3.4. 文件歷史 API (`/api/documents/{documentId}/history`)

- **`GET /documents/{documentId}/history`**
  - 描述：獲取特定文件的操作歷史記錄。
  - 響應：`DocumentHistoryEntry[]` (按時間戳降序排列)。
  - 注意：後端應在文件創建、狀態變更、編輯、審閱者指派等關鍵操作時自動創建歷史條目。

### 3.5. 圖片上傳 API (`/api/images`)

- **`POST /upload`**
  - 描述：上傳單個圖片檔案。
  - 請求主體：`multipart/form-data`，包含一個名為 `image` (或其他約定名稱) 的檔案欄位。
  - 響應：`{ imageUrl: string }` (返回上傳後圖片的可公開訪問 URL)。
  - 後端負責將檔案儲存到檔案系統或雲儲存服務。

## 4. 關鍵後端考量

- **安全性與授權 (RBAC)**：
  - 所有 API 端點都必須根據使用者的角色 (`admin`, `editor`, `reviewer`, `viewer`) 和文件所有權/指派關係來實施嚴格的權限檢查。
  - 例如，只有文件的作者或 Admin 才能編輯處於 `draft` 或 `rejected` 狀態的文件。
  - 只有指定的審閱者或 Admin 才能批准/拒絕 `pending_review` 狀態的文件。
- **數據驗證**：
  - 對所有傳入的請求主體進行嚴格的數據驗證 (例如，必填欄位、數據類型、格式)。
- **文件儲存策略**：
  - 為上傳的圖片選擇一個儲存解決方案 (例如，本地檔案系統、AWS S3, Google Cloud Storage)。
- **自動歷史記錄**：
  - 在執行文件創建、狀態更改、更新等操作時，自動在後端記錄 `DocumentHistoryEntry`。
- **錯誤處理**：
  - 為所有 API 提供一致且有意義的錯誤響應格式 (例如，使用標準 HTTP 狀態碼和 JSON 錯誤訊息)。
- **事務性**：
  - 對於需要修改多個數據記錄的操作 (例如，更新文件狀態並創建歷史條目)，應使用資料庫事務以確保數據一致性。

## 5. 前端整合點 (需要修改的文件)

一旦上述後端 API 準備就緒，以下前端文件將需要修改，以替換模擬邏輯並呼叫真實的 API：

- **`src/contexts/AuthContext.tsx`**:
  - 修改 `login`, `logout` 函數以呼叫身份驗證 API。
  - 實現從本地儲存 (或 cookie) 加載和清除身份驗證 token 的邏輯。
  - 實現獲取當前使用者資訊 (`/api/auth/me`) 的邏輯。
- **`src/app/login/page.tsx`**:
  - 更新表單提交以使用 `AuthContext` 中的真實登入函數。
- **`src/app/page.tsx` (Dashboard)**:
  - 獲取真實的摘要統計數據 (例如，總文件數、待審核數) 和最近活動列表，而不是使用 `mockDocuments` 和靜態 `recentActivities`。
- **`src/app/documents/page.tsx` (文件列表頁)**:
  - 替換 `mockDocuments` 的使用，改為呼叫 `GET /api/documents` 來獲取和篩選文件。
  - 處理分頁邏輯 (如果後端支持)。
- **`src/app/documents/new/page.tsx` (創建新文件頁)**:
  - 修改 `handleSubmit` 以呼叫 `POST /api/documents`。
- **`src/app/documents/[id]/page.tsx` (文件詳情頁)**:
  - 獲取文件詳細資訊 (`GET /api/documents/{documentId}`)。
  - 獲取文件歷史記錄 (`GET /api/documents/{documentId}/history`)。
  - 更新 `handleFormSubmit` (用於編輯後保存/提交) 以呼叫 `PUT /api/documents/{documentId}`。
  - 更新 `handleApprove`, `handleReject` 以呼叫相應的 API。
- **`src/components/documents/DocumentForm.tsx`**:
  - 修改封面圖片上傳邏輯 (`handleCoverImageChange`) 以呼叫 `POST /api/images/upload` 並使用返回的 `imageUrl`。
  - 修改內容圖片插入邏輯 (`processContentImageFile`) 以呼叫 `POST /api/images/upload` 並使用返回的 `imageUrl` 插入 Markdown。
  - 修改審閱者選擇列表，使其從 `GET /api/users/reviewers` 獲取數據。
- **`src/components/documents/ReviewActions.tsx`**:
  - 確保 `onApprove`, `onReject` 道具正確觸發 `src/app/documents/[id]/page.tsx` 中的 API 呼叫。
- **`src/app/admin/page.tsx` (管理員儀表板/文件列表)**:
  - 替換 `mockDocuments`，改為呼叫 `GET /api/documents` (帶有管理員權限，可以查看所有文件)。
  - 更新 `handleReassignReviewer` 以呼叫 `POST /api/documents/{documentId}/reassign`。
- **`src/app/admin/users/page.tsx` (使用者管理頁)**:
  - 如果實施，將從 `GET /api/admin/users` 獲取使用者列表。
  - 實現更新使用者角色的功能 (呼叫 `PUT /api/users/{userId}/role`)。
- **`src/components/admin/AdminDocumentTable.tsx`**:
  - 確保其操作 (例如，重新指派審閱者、查看歷史) 正確觸發相應的 API 呼叫或導航。
- **移除 `src/lib/mockData.ts` 和 `mockUsers`, `mockDocuments` 的使用**：
  - 在所有相關文件中，逐步移除對模擬數據的依賴。

這份文件應該為語言模型生成 DocuFlow 的後端專案提供了充分的資訊。
