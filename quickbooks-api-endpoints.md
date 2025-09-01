# QuickBooks Online API v3 - Complete Endpoints Documentation

## Base URLs
- **Sandbox (Development)**: `https://sandbox-quickbooks.api.intuit.com`
- **Production**: `https://quickbooks.api.intuit.com`

## API Structure
- **Endpoint Pattern**: `/v3/company/{realmID}/{entity}`
- **Current API Version**: v3 (Minor version 70 as of December 2023)
- **Authentication**: OAuth 2.0
- **Response Format**: JSON
- **HTTP Methods**: GET, POST, PUT, DELETE

## API Scopes
- `com.intuit.quickbooks.accounting` - Access to all accounting API entities and endpoints
- `com.intuit.quickbooks.payment` - Access to QuickBooks Payments API

## Core Transaction Endpoints

### Invoice
- **GET** `/v3/company/{realmID}/invoice/{id}` - Read invoice
- **POST** `/v3/company/{realmID}/invoice` - Create invoice
- **POST** `/v3/company/{realmID}/invoice/{id}` - Update invoice
- **GET** `/v3/company/{realmID}/query?query=SELECT * FROM Invoice` - Query invoices

### Bill
- **GET** `/v3/company/{realmID}/bill/{id}` - Read bill
- **POST** `/v3/company/{realmID}/bill` - Create bill
- **POST** `/v3/company/{realmID}/bill/{id}` - Update bill
- **GET** `/v3/company/{realmID}/query?query=SELECT * FROM Bill` - Query bills

### Payment
- **GET** `/v3/company/{realmID}/payment/{id}` - Read payment
- **POST** `/v3/company/{realmID}/payment` - Create payment
- **POST** `/v3/company/{realmID}/payment/{id}` - Update payment

### Credit Memo
- **GET** `/v3/company/{realmID}/creditmemo/{id}` - Read credit memo
- **POST** `/v3/company/{realmID}/creditmemo` - Create credit memo
- **POST** `/v3/company/{realmID}/creditmemo/{id}` - Update credit memo

### Sales Receipt
- **GET** `/v3/company/{realmID}/salesreceipt/{id}` - Read sales receipt
- **POST** `/v3/company/{realmID}/salesreceipt` - Create sales receipt
- **POST** `/v3/company/{realmID}/salesreceipt/{id}` - Update sales receipt

### Estimate
- **GET** `/v3/company/{realmID}/estimate/{id}` - Read estimate
- **POST** `/v3/company/{realmID}/estimate` - Create estimate
- **POST** `/v3/company/{realmID}/estimate/{id}` - Update estimate

### Journal Entry
- **GET** `/v3/company/{realmID}/journalentry/{id}` - Read journal entry
- **POST** `/v3/company/{realmID}/journalentry` - Create journal entry
- **POST** `/v3/company/{realmID}/journalentry/{id}` - Update journal entry

### Deposit
- **GET** `/v3/company/{realmID}/deposit/{id}` - Read deposit
- **POST** `/v3/company/{realmID}/deposit` - Create deposit
- **POST** `/v3/company/{realmID}/deposit/{id}` - Update deposit

### Vendor Credit
- **GET** `/v3/company/{realmID}/vendorcredit/{id}` - Read vendor credit
- **POST** `/v3/company/{realmID}/vendorcredit` - Create vendor credit
- **POST** `/v3/company/{realmID}/vendorcredit/{id}` - Update vendor credit

## Master Data Endpoints

### Account
- **GET** `/v3/company/{realmID}/account/{id}` - Read account
- **POST** `/v3/company/{realmID}/account` - Create account
- **POST** `/v3/company/{realmID}/account/{id}` - Update account
- **GET** `/v3/company/{realmID}/query?query=SELECT * FROM Account` - Query accounts

### Customer
- **GET** `/v3/company/{realmID}/customer/{id}` - Read customer
- **POST** `/v3/company/{realmID}/customer` - Create customer
- **POST** `/v3/company/{realmID}/customer/{id}` - Update customer
- **GET** `/v3/company/{realmID}/query?query=SELECT * FROM Customer` - Query customers

### Item
- **GET** `/v3/company/{realmID}/item/{id}` - Read item
- **POST** `/v3/company/{realmID}/item` - Create item
- **POST** `/v3/company/{realmID}/item/{id}` - Update item
- **GET** `/v3/company/{realmID}/query?query=SELECT * FROM Item` - Query items

### Vendor
- **GET** `/v3/company/{realmID}/vendor/{id}` - Read vendor
- **POST** `/v3/company/{realmID}/vendor` - Create vendor
- **POST** `/v3/company/{realmID}/vendor/{id}` - Update vendor
- **GET** `/v3/company/{realmID}/query?query=SELECT * FROM Vendor` - Query vendors

### Employee
- **GET** `/v3/company/{realmID}/employee/{id}` - Read employee
- **POST** `/v3/company/{realmID}/employee` - Create employee
- **POST** `/v3/company/{realmID}/employee/{id}` - Update employee

### Department
- **GET** `/v3/company/{realmID}/department/{id}` - Read department
- **POST** `/v3/company/{realmID}/department` - Create department
- **POST** `/v3/company/{realmID}/department/{id}` - Update department

## Reports Endpoints

### Balance Sheet
- **GET** `/v3/company/{realmID}/reports/BalanceSheet` - Get balance sheet report

### Profit & Loss
- **GET** `/v3/company/{realmID}/reports/ProfitAndLoss` - Get profit & loss report

### Cash Flow
- **GET** `/v3/company/{realmID}/reports/CashFlow` - Get cash flow report

### Trial Balance
- **GET** `/v3/company/{realmID}/reports/TrialBalance` - Get trial balance report

### General Ledger
- **GET** `/v3/company/{realmID}/reports/GeneralLedger` - Get general ledger report

## Company Information Endpoints

### Company Info
- **GET** `/v3/company/{realmID}/companyinfo/{id}` - Get company information
- **POST** `/v3/company/{realmID}/companyinfo/{id}` - Update company information

### Preferences
- **GET** `/v3/company/{realmID}/preferences` - Get company preferences
- **POST** `/v3/company/{realmID}/preferences` - Update company preferences

## Additional Utility Endpoints

### Time Activity
- **GET** `/v3/company/{realmID}/timeactivity/{id}` - Read time activity
- **POST** `/v3/company/{realmID}/timeactivity` - Create time activity
- **POST** `/v3/company/{realmID}/timeactivity/{id}` - Update time activity

### Payment Method
- **GET** `/v3/company/{realmID}/paymentmethod/{id}` - Read payment method
- **POST** `/v3/company/{realmID}/paymentmethod` - Create payment method

### Budget
- **GET** `/v3/company/{realmID}/budget/{id}` - Read budget
- **POST** `/v3/company/{realmID}/budget` - Create budget

## Query Operations
All entities support SQL-like queries using the following pattern:
- **GET** `/v3/company/{realmID}/query?query={SELECT_STATEMENT}`

Examples:
- `SELECT * FROM Customer WHERE Active = true`
- `SELECT * FROM Invoice WHERE TotalAmt > '1000'`
- `SELECT * FROM Item WHERE Type = 'Inventory'`

## Version Parameters
- Use `minorversion` parameter to access newer API features
- Current minor version: 70 (as of December 2023)
- Example: `/v3/company/{realmID}/invoice/{id}?minorversion=70`

## Important Notes
- All endpoints require authentication via OAuth 2.0
- Rate limiting applies (500 requests per minute per realm ID)
- Sandbox environment has additional restrictions (40 emails/day per realm)
- Production environment limits concurrent requests to 10 per realm ID and app
- Bank transactions endpoint is not available for security reasons
- Tags cannot be created/updated via API (read-only access)
- Custom fields have limited API support