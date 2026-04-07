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

