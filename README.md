# 🏠 HomeBilling — Shared Property Expense & Bill Splitting System

A modern full-stack web application built to streamline shared building utility tracking, automated recurring contracts, transparent expense splitting among 5+ property owners, and digital payment tracking.

---

## ✨ Features

- **Multi-Method Owner Authentication**: Secure registration and sign-in via Email/Password or Continue with Google.
- **Dynamic Utility Logging**: Add and manage variable building costs across key sectors (Electricity, Water & Sewerage, Gas, Lift Maintenance, Caretaker & Security, Waste Management, Cleaning, and Miscellaneous).
- **Automated Recurring Expenses**: Setup predictable fixed expenses (e.g., caretaker wages, lift AMC, internet contracts) with one-click cycle auto-population to prevent repetitive entry.
- **Precise 5+ Owner Split Engine**: Real-time aggregation of total building costs and exact share calculation across all registered flat units with strict two-decimal rounding.
- **Payment Status Tracking**:
  - **Online Payments**: Integrated Stripe Checkout for card settlements.
  - **Offline Payments**: Manual transaction reference logging (bKash TrxID, Bank Ref, Cash handover).
  - **Admin Approval**: Direct toggle between _Paid_ and _Pending_ statuses.
- **Receipt Transparency**: Attach and view physical bill images and invoice receipts in a built-in image preview modal.
- **Monthly Cycle Switcher & Historical Archive**: Filter, view, and navigate past months without mixing ledger records, with the ability to initialize new billing cycles.
- **One-Click PDF / Print Statement**: Clean, high-contrast, printable 1-page financial reports for community meetings and offline archiving.
- **Interactive Visual Analytics**: Interactive sector breakdowns and percentage distribution charts powered by Recharts.
- **Modern Responsive UI**: Built with Tailwind CSS and fluid entrance animations via Framer Motion.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, JavaScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Backend / Database**: [Firebase Cloud Firestore](https://firebase.google.com/docs/firestore) & [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Payment Processing**: [Stripe](https://stripe.com/)
- **Image Hosting (Optional)**: [ImgBB API](https://api.imgbb.com/)

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js (v18.17.0 or later)
- npm, yarn, or pnpm
- A Firebase project with **Authentication** and **Firestore Database** enabled.
- A Stripe account for API test keys.

### 2. Clone Repository & Install Dependencies

```bash
git clone [https://github.com/Mridu0w0/HomeBilling.git]
cd home-billing-client
npm install
```
