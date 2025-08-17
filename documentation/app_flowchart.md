flowchart TD
    A[User visits site] --> B[Landing Page]
    B --> C{Has account}
    C -->|No| D[Sign Up]
    C -->|Yes| E[Login]
    D --> F[Registration Form]
    F --> G[Send Verification Email]
    G --> H{Email verified}
    H -->|Yes| I[Welcome Screen]
    H -->|No| J[Resend Verification Email]
    I --> E
    E --> K{Forgot Password}
    K -->|Yes| L[Password Reset Request]
    K -->|No| M[Dashboard]
    L --> N[Send Reset Link]
    N --> O[Reset Password Form]
    O --> E
    M --> P[Dashboard View]
    P --> Q[AI Chat Input]
    Q --> R[Finance Agent Processing]
    R --> S[Display Insights]
    P --> T[Navigate to Accounts]
    T --> U[Accounts List]
    U --> V{Connect Service}
    V -->|Yes| W[OAuth Flow]
    V -->|No| U
    W --> X{Auth Success}
    X -->|Yes| Y[Sync Data]
    X -->|No| Z[Show Connection Error]
    Y --> U
    Z --> U
    U --> P
    P --> AA[Reports Section]
    AA --> AB[Select Report]
    AB --> AC[Set Date Range]
    AC --> AD{Export or Preview}
    AD -->|Preview| AE[Show Report]
    AD -->|Export| AF[Export CSV]
    AF --> AG[Download CSV]
    AE --> AA
    P --> AH[Settings Section]
    AH --> AI{Settings Tab}
    AI -->|Profile| AJ[Edit Profile]
    AI -->|Notifications| AK[Toggle Alerts]
    AJ --> AL[Save Profile]
    AL --> AM[Profile Updated]
    AK --> AN[Save Settings]
    AN --> AO[Settings Updated]
    AH --> AP[API Keys]
    AP --> AQ{Key Action}
    AQ -->|Generate| AR[Generate New Key]
    AQ -->|Revoke| AS[Revoke Key]
    AR --> AT[Show New Key]
    AS --> AU[Key Revoked]
    AM --> AH
    AO --> AH
    AG --> AA