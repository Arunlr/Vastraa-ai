# VastraAI — Luxury Indian Fashion, Curated by AI

VastraAI is a full-featured, luxury Indian fashion platform powered by artificial intelligence and built with state-of-the-art web performance standards. The application features personalized AI stylist curation, catalog recommendations, real-time tracking, administrative backoffice control, and integrated Supabase authentication & database operations.

## 🚀 Features

- **Personalized AI Stylist**: Dynamic style matching, occasion pairing, and confidence scoring based on Gemini-powered insights.
- **Unified Catalog**: Premium handpicked Indian ethnics (Lehengas, Sarees, Anarkalis, Kurtas, Sherwanis) with detailed sizing models.
- **Cart & Wishlist Engine**: High-performance local and synced persistence.
- **Admin Dashboard**: Real-time sales telemetry, customer analytics, product catalog management, and setting parameters.
- **Secure Authentication**: Built-in flow for authenticated users, preserving preferences and synchronization state.

---

## 🛠️ Tech Stack & Framework

- **Frontend**: React 19, TypeScript
- **Meta-Framework**: [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (with file-system routing and robust SSR capabilities)
- **Vite & Bundler**: Vite 7 & Tailwind CSS v4
- **Database / Auth**: Supabase JS Client & Postgres
- **Icons & Theme**: Lucide Icons & Tailwind CSS Custom Themes

---

## 📁 Project Structure

```text
├── .env.example            # Environment variables template
├── .gitignore              # Files ignored by git
├── components.json         # Component tagging utility configuration
├── package.json            # Manifest file (dependencies & run commands)
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration with TanStack Start setup
├── supabase_schema.sql     # Complete Postgres DB migrations and schema seed SQL
│
├── supabase/               # Local Supabase initialization files
│   └── migrations/         # Seed files and tables structure (Profiles, Orders, Products, etc.)
│
└── src/
    ├── main.tsx            # Traditional client entry (if fallback used)
    ├── start.ts            # TanStack Start Server & Request Middleware configs
    ├── router.tsx          # TanStack Router registration instance
    ├── routeTree.gen.ts    # Auto-generated Route Schema Tree 
    ├── server.ts           # SSR and Edge Runtime wraps
    ├── styles.css          # Core CSS stylesheet importing Tailwind CSS
    │
    ├── assets/             # Brand logos, stock imagery and illustrations
    ├── hooks/              # Custom functional React Hooks
    ├── lib/                # Modular client-side helper libraries
    │   ├── ai-stylist.ts   # Client wrappers for styling engine
    │   ├── orders.ts       # Central local + Supabase order mappings & states
    │   └── products.ts     # Client product definitions & details
    │
    ├── components/         # Shared React elements
    │   ├── AIChatWidget.tsx
    │   ├── Navbar.tsx
    │   ├── Footer.tsx
    │   └── ui/             # Preconfigured visual component atoms (shadcn/ui)
    │
    └── routes/             # File-system router pages & endpoints
        ├── __root.tsx      # Core root layout structure with Navigation & Footer
        ├── index.tsx       # Landing Home Page
        ├── shop.tsx        # Searchable Products Hub
        ├── auth.tsx        # Authentication Portal
        ├── track-order.tsx # Live parcel tracking widget
        ├── order.$id.tsx   # Detailed specific Order overview 
        ├── admin.tsx       # Admin sidebar & checks
        └── admin/          # Subroutes for administrative dashboards
```

---

## 🏃 Local Setup & Installation

To run this project on your system, follow these simple steps:

### 1. Clone the Codebase
Make sure you have exported this workspace to your computer via ZIP or through the GitHub Export facility (accessible from the workspace settings in the top right menu).

### 2. Install Dependencies
Navigate to the root folder of the project in your terminal and run:
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to a new `.env` file:
```bash
cp .env.example .env
```
Fill in the credentials:
- `GEMINI_API_KEY`: Required for the AI stylist chatbot/pairings to generate recommendations.
- `VITE_SUPABASE_URL` & `VITE_SUPABASE_PUBLISHABLE_KEY`: Obtain these from your Supabase Dashboard settings to hook up the Postgres tables and auth services.

### 4. Create and Migrate Supabase Database Tables (Optional but Recommended)
To initialize the Postgres tables, custom enum types, row level security (RLS) policies, and the catalog seed, execution of `supabase_schema.sql` is recommended. You can run this directly in the **Supabase SQL Editor** on your Supabase dashboard or using CLI tracking.

### 5. Launch the Development Server
```bash
npm run dev
```

Your server will boot and serve the site at:
**[http://localhost:3000](http://localhost:3000)** (or the port shown in your terminal).

---

## 🏗️ Production Build

To test production compiling, execute:
```bash
npm run build
```
The application will bundle optimized client scripts and server entry codes under the `.output` / `dist` directories.
