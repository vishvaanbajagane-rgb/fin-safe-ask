# FinSafe AI

📋 LOVABLE PROMPT (FULLY INTEGRATED – COPY-PASTE THIS)

PROJECT NAME: FinSafe AI — Smart Expense Affordability Agent

PROJECT TYPE: Full-stack web application (React + Supabase + Python backend integration)

PURPOSE: An AI-powered financial agent platform that analyzes a user's complete financial situation — balance, income, recurring expenses, pending payments, and even information extracted from messages/images — to decide whether they can safely afford a requested purchase. It outputs a detailed recommendation that matches the exact schema and format of the uploaded CSV, and also allows download in multiple file formats (CSV, Excel, JSON, PDF) while defaulting to CSV.

🎯 CORE FEATURES

1. CSV Upload Center — Upload requests.csv, users.csv, transactions.csv

2. Media Upload — Upload images (receipts, screenshots, messages)

3. AI Processing Engine — Backend agent analyzes data using LLM + VLM

4. Results Dashboard — View all recommendations in a beautiful, filterable table

5. Request Detail View — Click any request to see full breakdown

6. Export Center — Download output in the exact format of the uploaded CSV, plus optional Excel, JSON, PDF

7. Chat Transcript Logger — Auto-saves log.txt of all AI interactions

8. Admin Panel — View processing stats, user profiles, transaction history

📄 PAGE-BY-PAGE BREAKDOWN

PAGE 1: Landing / Home (/)

Purpose: Introduction + Quick Start

Layout:

- Hero section with a WARM OFF-WHITE background (#FDFBF7) and a subtle border-bottom (1px solid #E7E5E4). NO gradients. NO purple. Editorial, clean, calm.

- Headline (Satoshi, bold, tight tracking): "Know Before You Buy — AI-Powered Affordability Decisions"

- Subheadline (Switzer, regular, muted #78716C): "Upload your financial data. Our AI agent tells you if you can safely afford it — and how."

- Two CTA buttons: "Upload Data" (primary — muted red #C0392B, 6px radius, subtle shadow) and "View Demo" (secondary — 1px border #E7E5E4, transparent bg)

- Feature cards below using a BENTO BOX layout (varied card sizes, not a uniform 3-column grid). Each card uses 1px border instead of heavy shadows:

  🔒 "Privacy First — Your data stays local"

  ⚡ "Real-Time Analysis — Results in seconds"

  🧠 "AI-Powered — LLM + VLM reasoning"

- Footer with links: About, How It Works, GitHub, Contact

PAGE 2: Upload Center (/upload)

Purpose: Upload all necessary files

Layout:

- Header: "Step 1: Upload Your Financial Data" (Satoshi, 600)

- Progress indicator at top (Step 1 of 3: Upload → Process → Results). Use small uppercase letter-spaced labels, not big pills.

- Section A: CSV Uploads

  - Drag-and-drop zone for requests.csv (required)

  - Drag-and-drop zone for users.csv (optional)

  - Drag-and-drop zone for transactions.csv (optional)

  - Each zone shows: filename, file size, row count, ✅/❌ status. Use 1px #E7E5E4 borders, not dashed purple outlines.

- Section B: Media Uploads

  - Multi-file drag-and-drop for images (JPEG, PNG, PDF)

  - Preview thumbnails of uploaded images

  - Each image tagged with: filename, size, type

- Section C: Configuration

  - Toggle: "Use VLM for image analysis" (on/off)

  - Toggle: "Use LLM for decision explanation" (on/off)

  - Dropdown: "LLM Model" → Gemini 2.0 / GPT-4o / Claude 4

  - Input: "Forecast period (days)" → default 90

  - Checkbox: "Default output format matches uploaded CSV" (checked by default)

- Bottom: Large primary button "Start AI Analysis →" (muted red #C0392B, 6px radius)

Validation:

- requests.csv must be uploaded before proceeding

- Show error toast if file format is wrong — use plain language: "We couldn't read that file — is it a CSV?"

- Show success toast when files are parsed correctly

PAGE 3: Processing Screen (/processing)

Purpose: Show real-time progress while backend processes

Layout:

- Full-screen centered animation (pulsing icon, subtle — NOT a neon AI brain)

- Headline: "Analyzing Your Financial Data..." (Satoshi, 600)

- Progress bar (0–100%) with percentage. Thin, minimal, accent color #C0392B.

- Live log window (dark background #0D1117, muted green text #3FB950, font: IBM Plex Mono):

  [10:23:01] ✅ Loaded requests.csv — 250 requests found

  [10:23:02] ✅ Loaded users.csv — 50 users found

  [10:23:03] 🔍 Analyzing request_26...

  [10:23:04] 📸 Extracting text from image_01.png...

  [10:23:05] 🧠 LLM reasoning in progress...

  [10:23:06] ✅ request_26 complete → affordable_with_plan

  ...

- Stat cards updating live (bordered cards, not shadowed):

  - Requests Processed: 45 / 250

  - Images Analyzed: 12 / 30

  - Average Time per Request: 1.2s

  - Estimated Time Remaining: 4m 30s

- Cancel button (small, ghost style, bottom right)

PAGE 4: Results Dashboard (/results)

Purpose: Main output view — show all recommendations

Layout:

- Top Bar:

  - Title: "Analysis Results — 250 Requests" (Satoshi, 600)

  - Buttons: "Download output.csv" (primary — muted red #C0392B), "Download as..." (dropdown: CSV, Excel, JSON, PDF — secondary ghost button), "Re-run Analysis" (ghost button)

  - Filter dropdown: "All / Affordable Now / Affordable with Plan / Affordable Later / Not Affordable"

  - Search bar: "Search by request ID or user..."

- KPI Cards Row (4 cards, BENTO layout — varied widths, 1px borders, subtle shadows only):

  ✅ Affordable Now — 87

  📅 Affordable with Plan — 92

  ⏳ Affordable Later — 41

  ❌ Not Affordable — 30

- Main Table:

  Columns: Request ID, User ID, Amount Requested, Safe to Pay, Status (small uppercase letter-spaced badge — NOT big pills), Payment Method, Earliest Full Payment, Actions (👁️ View / 📋 Copy)

  Numbers right-aligned, using tabular figures (font-variant-numeric: tabular-nums)

  Row hover: background shifts 2% opacity (#FDFBF7 → #F5F2EC)

- Pagination: Bottom of table, 25 rows per page

- Click any row → opens Request Detail Modal (Page 5)

- Note: The "Download as..." dropdown defaults to CSV (matching uploaded schema) but allows Excel, JSON, PDF.

PAGE 5: Request Detail View (/results/:request_id)

Purpose: Deep-dive into a single request

Layout:

- Header:

  - Request ID + User ID (IBM Plex Mono for the IDs)

  - Status badge (small, uppercase, letter-spaced — NOT a big pill)

  - Button: "Back to Results" (ghost style)

- Left Column — Request Info (bordered card, no shadow):

  - Item being purchased: e.g. "MacBook Air M3"

  - Amount: ₹1,15,000 (tabular figures)

  - User's balance: ₹45,000

  - Monthly income: ₹65,000

  - Monthly essentials: ₹38,000

  - Preferred min balance: ₹10,000

  - Pending payments: ₹22,000

- Right Column — AI Recommendation (bordered card):

  - Amount Safe to Pay Today: ₹12,000 (large, bold, Satoshi)

  - Affordability Status: Affordable with Plan

  - Recommended Payment Method: Installments (6 months)

  - Payment Plan (table with tabular figures, right-aligned amounts):

    Date | Amount

    2026-10-01 | ₹20,000

    2026-11-01 | ₹20,000

    2026-12-01 | ₹20,000

    2027-01-01 | ₹20,000

    2027-02-01 | ₹20,000

    2027-03-01 | ₹15,000

  - Earliest Full Payment Date: 2027-03-01

  - Spending Changes Needed:

    ⚠️ Reduce dining out by ₹2,000/month

    ⚠️ Pause OTT subscriptions for 3 months

- Bottom — AI Explanation Panel:

  - Full-width card with dark background (#1A1A1A)

  - Heading: "Why This Recommendation?" (Satoshi, 600, off-white #FDFBF7)

  - Body: Multi-paragraph LLM-generated explanation (Switzer, #C9D1D9)

  - Button: "Copy Explanation" (ghost style)

- Bottom — Media Analysis (if images present):

  - Thumbnails of images

  - Extracted text from each image (IBM Plex Mono, muted bg)

  - Confidence score per extraction (tabular figures)

PAGE 6: Admin / Insights (/admin)

Purpose: Show aggregate data and system health

Layout:

- User Profiles Table — all users with their financial summary (bordered, editorial table)

- Transaction History — recent transactions across all users

- System Health (bordered cards, not shadowed):

  - LLM API calls made: 1,247 (tabular figures)

  - VLM API calls made: 89

  - Average response time: 1.4s

  - Error rate: 0.2%

- Export options:

  - Download output.csv (default)

  - Download as Excel / JSON / PDF

  - Download log.txt (chat transcript)

🔄 COMPLETE USER WORKFLOW

STEP 1: LANDING PAGE → User clicks "Upload Data"

STEP 2: UPLOAD CENTER → Uploads requests.csv, users.csv (optional), transactions.csv (optional), media files; configures settings; clicks "Start AI Analysis"

STEP 3: PROCESSING SCREEN → Progress bar animates, live log, stats update, redirects to Results

STEP 4: RESULTS DASHBOARD → KPI cards, table, filters, search, click row

STEP 5: REQUEST DETAIL VIEW → Full breakdown, AI recommendation, payment plan, explanation, media analysis

STEP 6: EXPORT → User clicks "Download output.csv" or chooses another format; default matches uploaded CSV schema and format.

🧠 BACKEND LOGIC (What the Python Agent Does)

For each request in requests.csv:

1. Parse Request — Extract: request_id, user_id, amount, item_description, context

2. Fetch User Profile — From users.csv: balance, income, essentials, min_balance, preferences; From transactions.csv: pending payments, recent spending, recurring bills

3. Analyze Media (if any) — Send image to VLM (Gemini 2.0 Flash / GPT-4V); Extract: amounts, dates, payment details, sender, purpose; Append extracted info to user's financial context

4. Calculate Safe Amount:

   safe_to_pay = balance - pending_payments - essential_expenses - preferred_min_balance

5. Forecast Future Balance — Project income and expenses over 90 days; Find earliest date when balance ≥ requested amount

6. Determine Status:

   - If safe_to_pay >= amount → affordable_now

   - If can pay in installments while maintaining safety → affordable_with_plan

   - If can pay later after saving → affordable_later

   - If never safe → not_affordable

7. Generate Payment Plan — If installments: split amount across months; Ensure each installment keeps balance safe

8. Identify Spending Changes — Find flexible expenses (dining, OTT, shopping); Suggest cuts if needed

9. Generate Explanation — Send all context to LLM; Prompt: "Explain in 2-3 sentences why this recommendation was made."

10. Output Row — Write to output.csv with exact schema.

   - Also generate optional Excel, JSON, PDF versions while keeping CSV as the default and primary output format.

🎨 UI/UX DESIGN SYSTEM (HUMAN-MADE, NOT AI-GENERATED)

DESIGN DIRECTION:

- Font Pair:

  - Headings: "Satoshi" (bold, 600–700) — from fontshare.com

  - Body: "Switzer" (regular, 400) — from fontshare.com

  - Monospace (logs, IDs, code): "IBM Plex Mono"

  - NEVER use Inter, Roboto, system fonts, or JetBrains Mono.

- Colors (Option A — "Financial Times" editorial palette):

  - Background: #FDFBF7 (warm off-white, NOT pure white)

  - Text: #1A1A1A (near-black, NOT pure black)

  - Accent (primary CTA only): #C0392B (muted red)

  - Secondary: #2C3E50 (slate blue)

  - Border: #E7E5E4

  - Muted text: #78716C

  - Success: #27AE60

  - Warning: #E67E22

  - Danger: #E74C3C

- Corner Radius: 6px for buttons, 8px for cards. NOT 16px+ pill shapes.

- Shadows: Only "0 1px 2px rgba(0,0,0,0.04)" — barely there, like Linear.

- Borders: Use 1px solid #E7E5E4 instead of heavy shadows. More editorial.

- Layout: Asymmetric where possible. Use BENTO BOX layouts with varied card sizes. AVOID uniform 3-column generic feature grids.

- Icons: Use Lucide React icons. NOT Font Awesome.

- Buttons: Slightly rounded (6px). Primary = solid muted red. Secondary = 1px border + transparent bg.

- Cards: Use borders instead of shadows. Cleaner, more editorial.

- Tables: Left-align text, right-align numbers, use tabular figures (font-variant-numeric: tabular-nums).

- Badges: Small, uppercase, letter-spaced. NOT big rounded pills.

- Inputs: Underline style or subtle border. NOT full rounded boxes.

- Empty States: Write helpful, plain-language copy — NOT generic illustrations.

- Error Messages: Write in friendly, human language. Use "We couldn't read that file" instead of "Error 422: Invalid format".

- Hover States: Subtle (background shifts 2% opacity).

- Focus States: 2px accent ring (#C0392B) for accessibility.

- Transitions: 150ms ease-out (NOT 300ms).

- Spacing: Consistent 4px grid — rhythm of 4, 8, 12, 16, 24, 32, 48, 64.

- Animations:

  - Progress bar: smooth width transition

  - Log window: auto-scroll with fade-in

  - Table rows: hover highlight (background shifts 2% opacity)

  - Status badges: subtle pulse for "Critical" only

REFERENCE VIBES (steal these):

- Linear.app — typography, spacing, subtle borders

- Notion.so — warm off-white, editorial feel

- Stripe.com — data tables, number formatting

- Financial Times — editorial color palette

- Arc Browser — sidebar layout, micro-interactions

- Height.app — bento-box cards, varied sizes

- Cron Calendar — typography hierarchy

- Ramp.com — fintech UI done right

THE ONE RULE: Every pixel should look like someone made a decision about it — not like a default. If it looks like a framework's default, it looks AI-made. If it looks chosen, it looks human.

🗄️ SUPABASE DATABASE SCHEMA

Table: requests — id (uuid PK), request_id (text), user_id (text), amount (numeric), item_description (text), context (text), created_at (timestamp)

Table: users — id (uuid PK), user_id (text), name (text), balance (numeric), monthly_income (numeric), monthly_essentials (numeric), preferred_min_balance (numeric), preferences (jsonb)

Table: transactions — id (uuid PK), user_id (text), amount (numeric), type (text income/expense), status (text completed/pending), category (text), date (date)

Table: results — id (uuid PK), request_id (text), amount_safe_to_pay (numeric), affordability_status (text), recommended_payment_method (text), payment_plan (text), earliest_date_for_full_payment (date), spending_changes_needed (text), decision_explanation (text), created_at (timestamp)

Table: media_analysis — id (uuid PK), request_id (text), filename (text), extracted_text (text), confidence (numeric), created_at (timestamp)

Table: chat_logs — id (uuid PK), timestamp (timestamp), role (text user/assistant), message (text), request_id (text)

🔌 API ENDPOINTS (Python Backend)

/api/upload — POST — Upload CSV + media files

/api/process — POST — Start AI analysis

/api/status/:job_id — GET — Poll processing status

/api/results — GET — Fetch all results

/api/results/:request_id — GET — Fetch single result

/api/export/csv — GET — Download output.csv (default)

/api/export/excel — GET — Download output as Excel

/api/export/json — GET — Download output as JSON

/api/export/pdf — GET — Download output as PDF

/api/export/log — GET — Download log.txt

/api/health — GET — System health check

📦 TECH STACK SUMMARY

Frontend: Lovable (React + Tailwind + shadcn/ui) — styled with the human-made design system above

Backend: Python (FastAPI) — deployed on Render/Railway

Database: Supabase (PostgreSQL)

LLM: Gemini 2.0 / GPT-4o

VLM: Gemini 2.0 Flash / GPT-4V

Hosting: Vercel (frontend) + Render (backend)

File Storage: Supabase Storage

🚀 LOVABLE-SPECIFIC INSTRUCTIONS

What Lovable Should Build:

✅ All 6 pages with routing

✅ Upload components with drag-and-drop

✅ Results table with filters + search + pagination

✅ Request detail modal/page

✅ Supabase integration for auth + database

✅ API calls to Python backend (use environment variables for backend URL)

✅ Download buttons for CSV + log.txt, plus a dropdown for Excel, JSON, PDF

✅ Toast notifications

✅ Loading states + skeletons that match the actual layout

✅ Responsive design (mobile + tablet + desktop)

✅ Default output download must match the exact schema and format of the uploaded CSV; additional formats available via optional dropdown.

✅ Apply the HUMAN-MADE design system — Satoshi + Switzer fonts, warm off-white background, muted red accent, editorial borders instead of shadows, bento layouts, tabular figures.

What Lovable Should NOT Build:

❌ The Python agent logic (that's separate)

❌ LLM/VLM API calls (those happen in backend)

❌ CSV parsing logic (backend handles it)

❌ Inter font, purple gradients, glassmorphism, big pill badges, or any "AI-default" UI patterns

Environment Variables Needed:

VITE_SUPABASE_URL=your_supabase_url

VITE_SUPABASE_ANON_KEY=your_supabase_key

VITE_BACKEND_URL=your_python_backend_url

💡 FINAL PROMPT FOR LOVABLE (Short Version)

"Build a full-stack web app called FinSafe AI. It should have: (1) Landing page with hero + features, (2) Upload center for CSV files and images with drag-and-drop, (3) Processing screen with live progress bar and log window, (4) Results dashboard with KPI cards + filterable table, (5) Request detail view showing AI recommendation, payment plan, and explanation, (6) Admin panel with system health. Connect to Supabase for database and auth. Call a Python backend API for AI processing. Include download buttons: default output.csv matching uploaded CSV schema, plus optional Excel, JSON, PDF.

IMPORTANT — Design direction: Use 'Satoshi' font for headings and 'Switzer' for body (from fontshare.com), 'IBM Plex Mono' for logs. Use warm off-white background (#FDFBF7), near-black text (#1A1A1A), muted red accent (#C0392B). Use 1px borders (#E7E5E4) instead of shadows. Use bento-box layouts, tabular figures for numbers, small uppercase letter-spaced badges. NO Inter font, NO purple gradients, NO glassmorphism, NO generic AI-generated look. The design should feel editorial and human-made — like Linear, Notion, or Financial Times. Make it responsive and modern."     hey from this prompt already somethings are ready can you work with that zip code of this project. so kindly analyze the zip code and continue with the next step and also add the code from the zip code

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://insight-spend-guard.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/196cd811-bef1-4f59-9251-7bb7d55a417b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
