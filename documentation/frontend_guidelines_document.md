# Frontend Guideline Document for FinHelm-ai

This document describes how the frontend of FinHelm-ai is built, styled, and organized. It’s written in plain language so anyone—technical or not—can understand how we set up the user interface.

## 1. Frontend Architecture

**What we use:**  
- React.js (with TypeScript) for building interactive screens.  
- React Router for moving between pages without full reloads.  
- CSS Modules (and plain CSS) for styling components in isolation.  
- A build tool (Create React App, Vite, or Webpack) to bundle code, optimize assets, and run local servers.

**How it works:**  
Our app is a single-page application (SPA). When you open the site, React loads a root component that stays in the browser. As users click navigation links, React Router swaps in different page components. We use TypeScript throughout to catch errors early and keep code consistent.

**Why it scales and stays maintainable:**  
- Component-based design keeps features self-contained.  
- TypeScript interfaces define clear contracts between parts of the app.  
- A modular folder layout (pages, components, hooks, assets) makes it easy to add new features without tangled code.
- Build-time optimizations (minification, tree shaking) deliver fast load times.

## 2. Design Principles

1. **Usability:** Forms and buttons are clear and labeled. Actions (like “Add Account”) are placed where users expect them.  
2. **Accessibility:** We follow WCAG guidelines—use semantic HTML (buttons, links, headings), provide keyboard focus states, and include `aria-label` where needed. Color contrast meets at least AA standards.  
3. **Responsiveness:** Layouts adapt from mobile (320px) up to large desktop (1920px) using flexible grids and CSS media queries.  
4. **Consistency:** Reusable components (buttons, inputs, tables) share the same look and behavior across the app.  
5. **Clarity:** Error messages appear near the problematic fields. Loading states (spinners or skeletons) show when data is being fetched.

We apply these principles by:  
- Using shared UI components (Button, Input, Modal) rather than custom code each time.  
- Building mobile-first with CSS flex and grid.  
- Testing keyboard navigation and screen reader announcements for interactive elements.

## 3. Styling and Theming

### 3.1 Styling Approach
- **CSS Modules:** Each component has its own `*.module.css` file. Class names are scoped locally, preventing clashes.  
- **BEM Naming (within modules):** We use a simple Block__Element–Modifier pattern for clarity, even in modules.  
- **Pre-processor:** We keep styling plain CSS, but SASS can be added if nested rules are needed.

### 3.2 Theming
- We define CSS variables in `:root` for colors, spacing, and typography.  
- A `ThemeContext` provides runtime switching (e.g., light/dark) by toggling a class on `<body>`.  

### 3.3 Design Style
- **Overall Style:** Modern flat design with subtle shadows and rounded corners—clean and professional for financial data.  
- **Glassmorphism Accents:** On modals and summary cards, we apply a semi-transparent backdrop blur for a premium feel.

### 3.4 Color Palette
:root {
  --color-primary: #1E88E5;        /* Blue for calls to action */
  --color-secondary: #43A047;      /* Green for positive balances */
  --color-accent: #FFC107;         /* Amber for highlights */
  --color-bg: #F5F5F5;             /* Light gray background */
  --color-surface: #FFFFFF;        /* White for cards and modals */
  --color-error: #D32F2F;          /* Red for errors */
  --color-on-primary: #FFFFFF;     /* Text on primary buttons */
  --color-on-surface: #000000;     /* Default text color */
}

### 3.5 Typography
- **Font Family:** “Inter”, a modern, highly legible sans-serif (loaded via Google Fonts).  
- **Font Sizes:**  
  • h1: 2rem (32px)  
  • h2: 1.5rem (24px)  
  • body: 1rem (16px)  
  • captions: 0.875rem (14px)

## 4. Component Structure

**Folder layout (example):**
```
src/
├─ components/        # Reusable building blocks
│   ├─ Button/
│   │   ├─ Button.tsx
│   │   ├─ Button.module.css
│   ├─ Input/
│   │   ├─ Input.tsx
│   │   ├─ Input.module.css
├─ pages/             # Screen-level components for routes
│   ├─ Dashboard/
│   ├─ Accounts/
│   ├─ Transactions/
│   └─ Profile/
├─ hooks/             # Custom React hooks (e.g., useAuth, useFetch)
├─ contexts/          # React Contexts (ThemeContext, AuthContext)
├─ assets/            # Images, icons, fonts
├─ App.tsx            # Root component with Router
└─ index.tsx          # App entry point
```

**Why components matter:**  
- Reusability: Write once, use everywhere.  
- Testability: Each component can be tested in isolation.  
- Maintainability: Updates to a component (e.g., button style) propagate throughout the app.

## 5. State Management

We keep state in two layers:

1. **Local state:** Using `useState` and `useReducer` inside individual components for form inputs, toggles, and UI state.  
2. **Global state:**  
   - **AuthContext:** Holds the current user session and token.  
   - **ThemeContext:** Manages light/dark mode.  
   - (Optional) **Data Context or React Query:** For shared data like account lists, transactions. React Query can handle caching, background refresh, and error states smoothly.

By limiting global state to critical data, we avoid unnecessary re-renders and keep most components simple.

## 6. Routing and Navigation

- **Library:** React Router v6.  
- **Configuration:**  
  • `BrowserRouter` wraps our app in `index.tsx`.  
  • Define routes in `App.tsx` or a separate `Routes.tsx`:
    / → Dashboard  
    /accounts → Accounts List  
    /accounts/new → New Account Form  
    /transactions → Transactions List  
    /profile → User Profile  
    /* → 404 Not Found

- **Protected Routes:** A `RequireAuth` wrapper checks if a user is logged in. If not, it redirects to `/login`.

- **Navigation UI:**  
  • A sidebar (or top nav on mobile) uses `NavLink` components to highlight the active page.  
  • Breadcrumbs or back buttons are optional on deeper pages.

## 7. Performance Optimization

1. **Code Splitting & Lazy Loading:**  
   - Use `React.lazy` and `Suspense` to load page components only when needed.  
   - Split large third-party libraries into separate bundles.  
2. **Asset Optimization:**  
   - Compress and cache images (PNG, SVG).  
   - Use modern image formats (WebP) when possible.  
3. **Memoization:**  
   - Wrap pure components in `React.memo`.  
   - Use `useMemo`/`useCallback` for expensive calculations and stable callbacks.  
4. **Tree Shaking:**  
   - Build tool removes unused code at compile time.  
5. **Bundle Analysis:**  
   - Periodically check bundle size (e.g., with `source-map-explorer`) and prune or lazy-load large dependencies.

These steps ensure fast initial loads and snappy interactions as users navigate between pages.

## 8. Testing and Quality Assurance

**1. Unit Tests:**  
- **Tools:** Jest and React Testing Library.  
- Coverage: Individual components, custom hooks, and utility functions.  
- Examples:  
  • Button renders with correct label.  
  • Input calls `onChange` when typed into.

**2. Integration Tests:**  
- **Tools:** React Testing Library.  
- Coverage: Component interactions and context providers.  
- Examples:  
  • Login form submits and updates AuthContext.  
  • Adding an account updates the accounts list.

**3. End-to-End (E2E) Tests:**  
- **Tools:** Cypress (or Playwright).  
- Coverage: Critical user flows in a real browser.  
- Examples:  
  • Sign up, log in, add account, add transaction, verify dashboard updates.  
  • Handling of network failures (mock server down).

**4. Linting & Formatting:**  
- **ESLint:** Enforce code style, catch errors early.  
- **Prettier:** Auto-format code on save or pre-commit.  
- **Pre-commit Hooks:** `husky` and `lint-staged` ensure only clean code is committed.

**5. Continuous Integration:**  
- **GitHub Actions (or similar):**  
  • Run lint, type-check, and tests on every pull request.  
  • Block merges if any checks fail.

## 9. Conclusion and Overall Frontend Summary

FinHelm-ai’s frontend is built to be **scalable**, **maintainable**, and **performant**. By using React with TypeScript, a clear component hierarchy, CSS Modules, and a consistent design system, we ensure that:

- **Developers** can quickly onboard, find code, and add features without confusion.  
- **Users** enjoy a fast, responsive interface that works on any device.  
- **Design** remains consistent and accessible, reinforcing trust in a financial tool.  

Together, these guidelines form a solid foundation. Future enhancements—such as advanced theming, richer data caching with React Query, or deeper test coverage—can slot in cleanly under this architecture. With these practices, FinHelm-ai will continue to grow without sacrificing quality or user experience.