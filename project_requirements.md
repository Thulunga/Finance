# Personal Expense, Budget & Split Tracker App

## Tech Stack
- Frontend & Backend: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide-react icons, shadcn/ui.
- Database: Supabase (PostgreSQL) with Row-Level Security (RLS).

## Core Data Schema
1. budgets:
   - id (uuid, PK)
   - category (e.g., Food & Groceries, Rent & Utilities, Car/Fuel, Lifestyle, Discretionary)
   - allocated_amount (numeric)
   - month_year (e.g., '2026-09')

2. expenses:
   - id (uuid, PK)
   - date (date)
   - description (text)
   - total_amount (numeric)
   - category (references budget category)
   - is_shared (boolean, default false)
   - my_share (numeric)

3. split_receivables:
   - id (uuid, PK)
   - expense_id (references expenses)
   - friend_name (text)
   - amount_owed (numeric)
   - is_settled (boolean, default false)
   - settled_date (date, nullable)

## Key Rules & Calculations
- Net Expense = Total Amount - (Total Amount Owed by Friends).
- Remaining Budget = Allocated Amount - Net Expense for that category in the given month.
- Friends Balances: Total pending receivables grouped by friend_name.
