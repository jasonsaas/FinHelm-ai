# Frontend Guideline Document

This document explains how the FinHelm.ai frontend is built, styled, and organized. It uses everyday language so anyone—technical or not—can understand how the user interface works and why certain tools were chosen.

## 1. Frontend Architecture

We build the FinHelm.ai frontend as a single-page application (SPA) using React and TypeScript. Here’s how it all fits together:

•  **React 18 + TypeScript**  
   - React gives us a component-based way to build screens.  
   - TypeScript adds clear typing so we catch errors early.

•  **Data Fetching / Server State**  
   - **React Query** manages requests to our FastAPI backend, caches results, and keeps UI updates smooth.  
   - We use **Axios** under the hood for HTTP calls (you could swap in `fetch` if you prefer).

•  **Styling**  
   - **Tailwind CSS** provides utility-first classes for consistent, responsive layouts with minimal custom CSS.

•  **Charting**  
   - **Recharts** (or Chart.js) draws our cash-flow graphs and expense breakdowns.

•  **Routing**  
   - **React Router v6** handles navigation between Dashboard, Accounts, Reports, and Settings.

**Scalability, Maintainability, Performance**  
This architecture supports growth:

1.  Component-based code means independent, reusable pieces.  
2.  TypeScript and React Query reduce runtime bugs and simplify data handling.  
3.  Code splitting and lazy loading (see Performance) keep initial load times fast.

## 2. Design Principles

Our guiding principles ensure the UI is easy and pleasant to use:

•  **Usability**  
  - Clear calls to action (buttons labeled “Connect QuickBooks,” “Export CSV”).  
  - Simple page layouts: sidebar + header + main content.

•  **Accessibility**  
  - Semantic HTML elements (`<button>`, `<nav>`, `<table>`, etc.).  
  - ARIA labels on dynamic widgets (like the AI chat input).  
  - Keyboard navigation throughout (tab order, focus states).

•  **Responsiveness**  
  - Mobile-first styling with Tailwind’s breakpoints.  
  - Sidebar collapses on narrow screens; charts adapt to available width.

## 3. Styling and Theming

### Approach
We use Tailwind CSS, a utility-first framework, so there’s no long custom CSS files—just small, composable classes on each element.

### Theming
•  **Tailwind config (`tailwind.config.js`)** holds our color palette and design tokens.  
•  To support light or dark mode, we toggle a `dark` class on `<html>` and use Tailwind’s `dark:` variants.

### Visual Style
- **Style:** Modern, flat design—clean edges, minimal shadows, emphasis on white space.  
- **Glassmorphism:** Subtle semi-transparent panels (e.g., AI chat widget) with soft blur.

### Color Palette
Primary and secondary colors reflect trust and growth:

| Name           | Hex     | Usage                          |
| -------------- | ------- | ------------------------------ |
| Primary Blue   | #1E3A8A | Buttons, links, active states  |
| Accent Green   | #10B981 | Success messages, accents      |
| Neutral Dark   | #374151 | Text headers, sidebar bg       |
| Neutral Light  | #F3F4F6 | Page backgrounds, cards        |
| Warning Amber  | #F59E0B | Alerts, warnings               |
| Error Red      | #EF4444 | Error messages, invalid inputs |

### Typography
- **Font Family:** Inter (sans-serif) for clarity and readability.  
- **Weights:** 400 for body, 600 for headings, 700 for buttons and strong text.

## 4. Component Structure

We organize code under `src/` into folders by role:

src/
  ├─ components/    # Reusable UI pieces (buttons, form fields, modals)
  ├─ layouts/       # Page shells (MainLayout with sidebar + header)
  ├─ pages/         # Route targets (DashboardPage, AccountsPage, etc.)
  ├─ hooks/         # Custom React hooks (useAuth, useChat)
  ├─ services/      # API clients (axios instances, endpoints)
  ├─ context/       # App-wide contexts (ThemeContext, AuthContext)
  └─ assets/        # Icons, images, fonts

**Why component-based?**  
- Encourages reuse: a `<TransactionTable>` can appear on Dashboard and Reports.  
- Speeds development: new screens assemble existing pieces.  
- Improves maintainability: fix a bug in one component and it updates everywhere.

## 5. State Management

### Server State (Data from backend)
- **React Query** caches and synchronizes data (transactions, accounts, AI insights).  
- It handles loading, error, and caching logic so components stay clean.

### Client State (UI state)
- **Context API** for theme (light/dark) and authentication status.  
- Local `useState` or `useReducer` for form inputs, modal open/close flags.

Redux Toolkit is an option if global state grows more complex in later phases, but React Query + Context covers version 1.0 needs.

## 6. Routing and Navigation

•  **React Router v6** defines a set of routes under a `BrowserRouter`:

```jsx
<Routes>
  <Route element={<MainLayout/>}>
    <Route path="/" element={<DashboardPage/>} />
    <Route path="/accounts" element={<AccountsPage/>} />
    <Route path="/reports" element={<ReportsPage/>} />
    <Route path="/settings" element={<SettingsPage/>} />
  </Route>
  <Route path="/login" element={<LoginPage/>} />
  <Route path="/signup" element={<SignupPage/>} />
</Routes>
```

•  **Protected Routes** wrap pages that require a logged-in user, redirecting to `/login` if not authenticated.

•  **Layout** (sidebar + header) remains consistent across main sections, letting users switch areas in one click.

## 7. Performance Optimization

1.  **Code Splitting & Lazy Loading**  
    - Use `React.lazy()` and `<Suspense>` to load page components (e.g., ReportsPage) only when needed.  
2.  **Tree Shaking**  
    - Our bundler (Webpack or Vite) removes unused code from the final build.  
3.  **Tailwind Purge**  
    - Unused CSS classes are stripped out at build time, keeping CSS bundles small.  
4.  **Image & Asset Optimization**  
    - Compress SVGs and raster images, serve optimized file formats.  
5.  **React Query Caching**  
    - Avoids unnecessary network calls by reusing cached data for lists and charts.

Together these strategies keep the initial page load under 2 seconds and interactions snappy.

## 8. Testing and Quality Assurance

### 1. Unit & Integration Tests
- **Jest** for running tests.  
- **React Testing Library** to render components and assert on user-facing behavior.

Examples:
- Test that `<Button>` calls its `onClick` handler.  
- Test that DashboardPage shows a loading spinner while data is fetching.

### 2. End-to-End (E2E)
- **Cypress** for critical user flows:
  - Sign-up/login.  
  - Connecting QuickBooks via OAuth (mocked).  
  - Asking AI a question and seeing results.

### 3. Linting & Formatting
- **ESLint** enforces code style and catches common mistakes.  
- **Prettier** auto-formats code so everyone follows the same style.

### 4. Continuous Integration
- **GitHub Actions** runs lint, type checks, and tests on every pull request to catch issues early.

## 9. Conclusion and Overall Frontend Summary

FinHelm.ai’s frontend combines modern tools—React, TypeScript, React Query, Tailwind CSS, and Recharts—to deliver a fast, scalable, and user-friendly interface. We follow clear design principles (usability, accessibility, responsiveness) and organize code into well-defined components. State is managed with a mix of React Query and Context API, while routing is handled by React Router. Performance optimizations (lazy loading, tree shaking, CSS purge) keep the app snappy, and a robust test suite ensures reliability. Together, these guidelines make it easy for any developer or stakeholder to understand, maintain, and grow the FinHelm.ai frontend over time.