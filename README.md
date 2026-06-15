# 🛒 PNB POS - Modern Point of Sale System

PNB POS is a modern, fast, and feature-rich Point of Sale (POS) and Inventory Management web application built with **Next.js 15**, **React 19**, and **Supabase**. It is designed to streamline transactions, manage product stock in real-time, and provide insightful analytics. 

This project is built as a Progressive Web App (PWA) with a premium UI/UX, capable of being installed on desktops and mobile devices.

## ✨ Key Features

- **🛍️ Point of Sale (POS) Terminal**: Fast and intuitive checkout process with cart management, dynamic discounts, and automatic subtotal/tax calculations.
- **📦 Inventory Management**: Full CRUD capabilities for products. Track stock levels, set categories, and get visual indicators for low stock.
- **📊 Dashboard & Analytics**: Interactive charts (Recharts) displaying daily/monthly revenue, transaction counts, and best-selling products.
- **🎟️ Voucher & Discount System**: Manage promo codes with dynamic discounts (percentage or fixed amount) and usage limits.
- **🖨️ Bluetooth Thermal Printer Support**: Native integration with Web Bluetooth API for seamless receipt printing directly from the browser.
- **📄 Export & Reports**: Generate and download transaction history and sales reports in **Excel (.xlsx)** or **PDF** formats.
- **🔐 Role-Based Authentication**: Secure login system via **Supabase Auth** with defined roles (Owner vs. Kasir).
- **🌗 Dark / Light Mode**: Premium UI built with **Tailwind CSS** and **Shadcn UI** supporting modern aesthetic themes.
- **📱 PWA Ready**: Installable on Android, iOS, and Desktop for a native app-like experience.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI, Framer Motion
- **State Management**: Zustand
- **Backend & Database**: Supabase (PostgreSQL, Auth, RLS)
- **Icons & Visuals**: Lucide React, Recharts
- **Utilities**: `xlsx`, `jspdf`, `jspdf-autotable`, `date-fns`

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm installed.
- A [Supabase](https://supabase.com/) project.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Radityaaa04/pnb-pos.git
   cd pnb-pos
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Database Setup:**
   Run the SQL scripts located in the `supabase/migrations/` folder within your Supabase project's SQL Editor to generate the required tables (`profiles`, `products`, `transactions`, `vouchers`, etc.).

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔑 Demo Access

For portfolio evaluation, you can try logging in with the following roles (assuming you have registered them in your Supabase project):

- **Owner / Admin**
  - Email: `admin@pnb.com`
  - Password: `Ceper123`

- **Kasir (Cashier)**
  - Email: `kasir@pnb.com`
  - Password: `Ceper123`

## 👨‍💻 Developer

Developed by **Raditya** ([@Radityaaa04](https://github.com/Radityaaa04))

## 📄 License

This project is open-source and available under the MIT License.
