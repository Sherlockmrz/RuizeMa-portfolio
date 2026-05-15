# DESIGN.md — Ruize Ma Portfolio

## Design Direction

Build a premium AI systems portfolio website with a Linear-inspired visual style.

The interface should feel refined, calm, precise, product-like, dashboard-oriented, and technically elegant.

This website should not look like a student homework page or a generic resume template. It should look like a polished AI agent systems portfolio.

## Visual Style

Use a dark, elegant dashboard interface inspired by Linear, Vercel, and modern AI product websites.

Core feeling:
- dark surface
- soft purple glow
- quiet gradients
- glass cards
- polished spacing
- thin borders
- subtle motion
- high readability

## Color Palette

Background:
- #080A12
- #0B0D17

Surface:
- #11131F
- #161927
- #1B1E2E

Border:
- rgba(255, 255, 255, 0.08)
- rgba(167, 139, 250, 0.18)

Text:
- Primary: #F8FAFC
- Secondary: #A1A1AA
- Muted: #71717A

Accents:
- Purple: #A78BFA
- Violet: #8B5CF6
- Indigo: #6366F1
- Cyan: #22D3EE
- Green: #34D399

## Typography

Use a modern sans-serif font.

Headlines should be large, clean, confident, and tightly spaced.

Body text should be readable, calm, and not too small.

Use monospace only for:
- tool names
- pipeline labels
- model names
- metrics
- code-like tags

## Layout

Desktop:
- 12-column grid
- max-width container
- spacious sections
- project dashboard cards

Mobile:
- single-column layout
- no horizontal scroll
- large tap targets
- pipeline becomes vertical timeline

## Components

### Hero

Should feel premium and calm.

Include:
- Ruize Ma
- AI Agent Systems Portfolio
- short positioning statement
- buttons
- small status badges

Use a soft purple radial glow behind the headline.

### Project Cards

Each project card should include:
- title
- one-line description
- category
- tags
- mini metrics
- View Project button
- Run Demo button

Cards should have:
- rounded corners
- subtle border
- dark glass surface
- hover lift
- purple glow on hover

### Pipeline Viewer

Should look like an agent trace or system execution timeline.

Each step includes:
- step number
- status
- tool/model name
- input
- output
- explanation

### Demo Runner

Should be interactive.

User clicks Run Demo.
Steps reveal one by one.
Final result is shown clearly.

### Insurance Predictor

Should feel like a model dashboard.

Inputs on the left.
Prediction result on the right.
Feature contribution cards below.

## Motion

Use Framer Motion.

Motion should be subtle and expensive-looking:
- fade in
- slight vertical movement
- card hover lift
- pipeline step reveal

Do not use childish animations.

## Do

- Make it look like a serious AI systems portfolio.
- Make every project understandable.
- Show pipeline, tools, model logic, and results.
- Make the UI beautiful on both mobile and desktop.
- Be honest about limitations.

## Do Not

- Do not use Streamlit.
- Do not use bright random colors.
- Do not create a generic resume page.
- Do not fake live backend execution.
- Do not overclaim project results.