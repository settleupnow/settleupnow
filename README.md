# SettleUp

SettleUp is a modern web application designed to help freelancers and small businesses manage their invoicing, keep track of clients, and send payment reminders. This project was initially scaffolded using Lovable and customized heavily to provide a seamless billing experience.

## Features

- **Invoice Management**: Create, view, and manage invoices easily.
- **Business Profile setup**: Store your business name, upload your logo, and add banking details to auto-populate invoices.
- **Customizable Reminders**: Create dynamic WhatsApp and Email templates with smart variables (e.g., `{{client_name}}`, `{{invoice_amount}}`, `{{due_date}}`) for effortless follow-ups.
- **PDF Export**: Generate professional PDF invoices (utilizing `jspdf` and `jspdf-autotable`).
- **Backend Sync**: Powered by Supabase for real-time database, robust authentication, and media storage.

## Technology Stack

- **Frontend Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Data Fetching**: [React Query](https://tanstack.com/query/latest)
- **Backend & Auth**: [Supabase](https://supabase.com/)

## Getting Started

To get a local copy up and running, follow these steps:

### Prerequisites
Ensure you have [Node.js](https://nodejs.org/) and npm installed on your local machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   *The server will start with auto-reloading enabled.*

## Editing & Deployment

- **Using Lovable**: You can continue iterating on the design by visiting your Lovable project dashboard. Any changes made there will be committed to this repository automatically.
- **Deployment**: Because this is a standard Vite React application, you can deploy it on platforms like Vercel, Netlify, or Cloudflare Pages. Alternatively, if using Lovable, simply click on Share -> Publish.
