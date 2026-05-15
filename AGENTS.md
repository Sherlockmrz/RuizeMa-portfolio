# AGENTS.md

You are building Ruize Ma's personal portfolio website.

## Project Name

ruizema-portfolio

## Website Display Name

Ruize Ma Portfolio

## Goal

Create a polished, production-quality personal website that showcases Ruize Ma's AI agent systems, biomedical reasoning system, and insurance cost prediction project.

The website should feel like a premium Linear-inspired AI systems dashboard.

## Tech Stack

Use:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- lucide-react

Do not use:
- Streamlit
- backend server
- database
- live API calls in the first version

## Deployment Target

Cloudflare Pages.

Use static export if needed.

## Required Pages

1. Home page
2. Projects page
3. Project detail page using `/projects/[slug]`
4. About page

## Featured Projects

1. NBA Roster Upgrade Agent
2. Plan–Act–Verify Biomedical Reasoning
3. Insurance Cost Predictor

## Demo Philosophy

Each project must have a small interactive demo.

The demo does not need to run the real Python backend in version 1.
Use local static TypeScript data and client-side interactions.

Each demo should clearly show:
- input scenario
- pipeline/model steps
- intermediate results
- final output
- limitations

## UI Style

Follow DESIGN.md strictly.

The style should be:
- refined
- calm
- dark
- purple-highlighted
- product-like
- dashboard-like
- mobile responsive

## Code Quality

- Use reusable components.
- Keep project content in `src/data/projects.ts`.
- Keep demo traces in separate files.
- Make all pages responsive.
- Avoid hardcoded repeated UI.
- Make `npm run build` pass.