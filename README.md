# Equivest Hedera

A React-based project built with Vite, TypeScript, Tailwind CSS, and shadcn-ui. The `main` branch is deployed on **Lovable**: **URL**: [https://equivest-hedera.lovable.app/](https://equivest-hedera.lovable.app/)

---

## Table of Contents
1. [Project Overview](#project-overview)  
2. [Technologies](#technologies)  
3. [Getting Started](#getting-started)  
4. [Configuration](#configuration)  
5. [Available Scripts](#available-scripts)  
6. [Dependencies](#dependencies)  
7. [Deployment](#deployment)  
8. [Notes for Testers / Judges](#notes-for-testers--judges)  

---

## Project Overview

This project implements [brief description of your project purpose/functionality].  

The `mvp-dev` branch is used for ongoing development, while `main` is the production branch currently deployed to Lovable.

---

## Technologies

- **Frontend:** React, TypeScript, Vite  
- **UI Components:** shadcn-ui, Tailwind CSS  
- **Hosting:** Lovable  
- **Version Control:** Git / GitHub  

---

## Getting Started

### Prerequisites

- **Node.js:** v20.x (recommended via [nvm](https://github.com/nvm-sh/nvm))  
- **npm:** v10.x (comes with Node.js)  

---

### Steps to Run Locally

# Equivest Hedera

A React-based project built with Vite, TypeScript, Tailwind CSS, and shadcn-ui. The `main` branch is deployed on **Lovable**: **URL**: [https://equivest-hedera.lovable.app/](https://equivest-hedera.lovable.app/)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technologies](#technologies)
3. [Getting Started](#getting-started)
4. [Configuration](#configuration)
5. [Available Scripts](#available-scripts)
6. [Dependencies](#dependencies)
7. [Deployment](#deployment)
8. [Notes for Testers / Judges](#notes-for-testers--judges)

---

## Project Overview

This project implements [brief description of your project purpose/functionality].

The `mvp-dev` branch is used for ongoing development, while `main` is the production branch currently deployed to Lovable.

---

## Technologies

* **Frontend:** React, TypeScript, Vite
* **UI Components:** shadcn-ui, Tailwind CSS
* **Hosting:** Lovable
* **Version Control:** Git / GitHub

---

## Getting Started

### Prerequisites

* **Node.js:** v20.x (recommended via [nvm](https://github.com/nvm-sh/nvm))
* **npm:** v10.x (comes with Node.js)

---

### Steps to Run Locally

1. **Clone the repository**

```bash
git clone https://github.com/elyestalenzy-glitch/equivest-hedera.git
cd equivest-hedera
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file at the root of the project with the following variables:

```env
VITE_WALLETCONNECT_PROJECT_ID=<your_walletconnect_project_id>
VITE_HEDERA_LEDGER=<your_ledger_environment>
```

> **Do not commit `.env.local`.** Keep it private. These variables are required for the app to connect to the Hedera network and WalletConnect.

4. **Start the development server**

```bash
npm run dev
```

Open the browser at the address shown in the terminal (commonly `http://localhost:5173` or `http://localhost:8080`) to view the project locally. The app supports hot reloading on file changes.

---

## Available Scripts

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start development server with hot reload |
| `npm run build`   | Build the app for production             |
| `npm run preview` | Preview production build locally         |

---

## Dependencies & Versions

* `react` v18.x
* `react-dom` v18.x
* `vite` v4.x
* `typescript` v5.x
* `tailwindcss` v3.x
* `shadcn-ui` latest

*(All versions can be checked in `package.json`)*

---

## Deployment

* The `main` branch is automatically deployed on Lovable.
* To update the live site, merge stable features from `mvp-dev` into `main`.
* Lovable automatically rebuilds the app using environment variables configured in the project settings.
* **Live URL:** [https://equivest-hedera.lovable.app/](https://equivest-hedera.lovable.app/)

---

## Notes for Testers / Judges

1. Use `mvp-dev` branch for latest development features.
2. Use `main` branch for a stable, production-ready version.
3. Ensure `.env.local` is configured correctly before running locally.
4. Node.js and npm versions matter for consistent builds; use the versions specified above.
5. The local development server port may vary depending on your machine. Check the terminal output to know the correct URL.

---
