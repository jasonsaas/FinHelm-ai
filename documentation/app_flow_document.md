# FinHelm.ai App Flow Document

## Onboarding and Sign-In/Sign-Up

When a brand new user first arrives at FinHelm.ai, they land on a public landing page that briefly explains the platform’s purpose and invites them to create an account. On this page, the visitor can click a clear “Sign Up” button which opens a registration form requesting their email address and a chosen password. After submitting these details, the user receives an email with a verification link. Clicking that link confirms their email and returns them to a welcome screen inside the app. At any time prior to verification, the user may request to resend the verification email. If someone forgets their password, they click a “Forgot Password” link on the login page, enter their registered email, and receive a password reset link. Following that link allows them to set a new password and return directly to the login form.

Signing in requires the user to enter their verified email and password on the login page. Once the credentials are accepted, the user is securely redirected to the main dashboard. The top navigation or a profile menu always includes a “Sign Out” option so users can end their session. Throughout this process, clear feedback messages appear for successful sign-ups, logins, password resets, and any errors such as invalid credentials or network issues.

## Main Dashboard or Home Page

After logging in, the user arrives at the main dashboard. The page is laid out with a persistent sidebar on the left that lists sections labeled Dashboard, Accounts, Reports, and Settings. A header bar across the top displays the user’s name or company and a sign-out link. The main area shows summary cards that highlight key metrics such as total income, total expenses, and cash flow trends. Below the summary, a chart visualizes recent transaction trends over time, and a table lists the latest individual transactions.

Above the summary cards, there is an AI chat input field where users can type natural language questions like “Show me last month’s expense trends.” The sidebar navigation and header remain present on every page so users can quickly move to Accounts, Reports, or Settings with a single click or tap.

## Detailed Feature Flows and Page Transitions

On the Dashboard page, the user can click any summary card or chart to drill down into more detailed views. For example, clicking the cash flow card navigates to a full-screen chart view with date filter controls. Typing a question into the AI chat field and submitting it triggers a call to the finance agent endpoint. While the AI processes the request, a loading spinner appears within the chat widget. When the insights return, they display as text or simple charts directly beneath the input field.

Under the Accounts section, the user sees a list of connected services and a button labeled “Connect QuickBooks or Grok.” Clicking that button opens a modal window explaining the linking process. Choosing QuickBooks initiates an OAuth2 flow in a new browser tab, where the user logs in to QuickBooks, grants permissions, and is then redirected back to FinHelm.ai. A success message in the modal confirms the connection and displays the QuickBooks account name in the list. The same flow applies for Grok integration. Once services are linked, the app automatically synchronizes transactions in the background and notifies the user when new data is available.

In the Reports section, the user finds a list of predefined report types such as Transaction List and Category Summary. Each report row has options to select a date range, preview the data on screen, and export the results as a CSV file. Exporting displays a confirmation message and initiates a download. If the user clicks to view the report, they are shown a paginated table with sorting and filtering controls. A breadcrumb trail at the top indicates they can return to the main Reports list or go back to the Dashboard.

## Settings and Account Management

When the user navigates to Settings, they land on a page with two subtabs: Profile and Notification Settings. Under Profile, the user sees their name, email address, and an option to change their password. Editing the email or password requires entering the current password for security, and saving these changes shows a success message on the same page. Under Notification Settings, users can toggle email alerts such as daily summaries or threshold alerts. Each change is saved with a click of a “Save Preferences” button, and a toast notification confirms that settings are updated.

Should the user need to manage API keys for advanced workflows, a link in the Profile tab leads them to an API Keys section. Here they can generate a new key or revoke old ones. After generating a key, the new value is shown once with a warning to copy it before leaving the page.

From Settings, the user can return to the Dashboard or navigate to any other section using the sidebar. Their updated profile information and preferences take effect immediately across the app.

## Error States and Alternate Paths

If a user enters incorrect login credentials, the login form displays an inline error message explaining that the email or password is invalid and prompts them to try again. During account linking, if the OAuth flow fails or is canceled, the modal window shows an error state with a retry option. When network connectivity is lost, a banner appears at the top of the page warning the user that actions may not complete until the connection is restored. Any API call that returns an error triggers a notification area that explains what went wrong. For example, if fetching transactions fails, the transaction table shows a message and a “Retry” button. In the AI chat widget, if the AI endpoint times out or returns an error, the widget displays a friendly apology and invites the user to reformulate the question or try again later.

All forms throughout the app validate inputs on the client side first and then on the server side. Invalid form fields are highlighted with red borders and accompanied by brief error text. Password reset links expire after a configurable time, and expired links lead to a page that lets the user request another reset email.

## Conclusion and Overall App Journey

From the moment a user lands on the FinHelm.ai site to the point where they complete their first AI-driven insight or export a report, the experience is designed to be smooth and self-explanatory. A new user signs up with email and password, verifies their address, and immediately begins a guided onboarding flow that shows them how to link QuickBooks or Grok. Once their accounts are connected, the dashboard fills with real financial data, and they can use a simple chat interface to ask the AI for insights. Throughout daily use, they can review transactions, generate reports, and adjust settings without ever leaving the web interface. Whenever an error arises, clear messages and retry options help them recover quickly. This flow ensures that businesses of any size can manage, analyze, and act on their financial information in one unified place.