flowchart TD
  Welcome[Welcome Page]
  SignUp[Sign Up]
  Login[Log In]
  ForgotPwd[Forgot Password]
  Reset[Password Reset]
  Confirm[Confirmation]
  Dashboard[Dashboard]
  Logout[Logout]
  AccountsPage[Accounts Page]
  AddAccount[Add Account]
  AccountForm[Account Form]
  EditAccount[Edit Account]
  TransactionsPage[Transactions Page]
  NewTransaction[New Transaction]
  TransactionForm[Transaction Form]
  DeleteTransaction[Delete Transaction]
  ProfilePage[Profile Page]
  EditProfile[Edit Profile]
  ChangePwd[Change Password]
  PwdForm[Password Form]
  Welcome --> SignUp
  Welcome --> Login
  SignUp --> Confirm
  Confirm --> Dashboard
  Login --> Dashboard
  Login --> ForgotPwd
  ForgotPwd --> Reset
  Reset --> Login
  Dashboard --> Logout
  Logout --> Welcome
  Dashboard --> AccountsPage
  Dashboard --> TransactionsPage
  Dashboard --> ProfilePage
  AccountsPage --> AddAccount
  AddAccount --> AccountForm
  AccountForm --> AccountsPage
  AccountsPage --> EditAccount
  EditAccount --> AccountForm
  TransactionsPage --> NewTransaction
  NewTransaction --> TransactionForm
  TransactionForm --> TransactionsPage
  TransactionsPage --> DeleteTransaction
  DeleteTransaction --> TransactionsPage
  ProfilePage --> EditProfile
  ProfilePage --> ChangePwd
  EditProfile --> ProfilePage
  ChangePwd --> PwdForm
  PwdForm --> ProfilePage