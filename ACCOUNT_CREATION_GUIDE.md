# Account Creation Guide - Fix Convex Document Errors

## 🚨 **Issue Identified**

The error occurs because the document you're trying to create has invalid or missing required fields:

```json
{
  "accountType": "", // ❌ Empty string - needs value
  "classification": "Asset", // ✅ Valid
  "companyId": "", // ❌ Empty string - needs valid Convex ID
  "erpAccountId": "", // ❌ Empty string - needs value
  "name": "", // ❌ Empty string - needs value
  "path": "" // ❌ Empty string - needs value
  // ... other fields
}
```

## ✅ **Solution 1: Use Sample Data Functions**

I've created helper functions to generate valid sample data. In the Convex dashboard:

### Step 1: Create Sample Dataset

```javascript
// Run this mutation first to create user and company
createSampleDataset();
```

This will return:

```json
{
  "userId": "j57abc123...",
  "companyId": "k89def456...",
  "message": "Sample dataset created successfully"
}
```

### Step 2: Create Sample Accounts

```javascript
// Use the companyId from Step 1
createSampleAccounts({ companyId: "k89def456..." });
```

This will create a complete chart of accounts with proper hierarchy.

## ✅ **Solution 2: Manual Document Creation**

If you want to create documents manually, here's the correct structure:

### **Root Asset Account**

```json
{
  "companyId": "YOUR_COMPANY_ID_HERE",
  "erpAccountId": "1000",
  "name": "Assets",
  "fullyQualifiedName": "Assets",
  "accountType": "Other Current Asset",
  "classification": "Asset",
  "level": 0,
  "path": "1000",
  "isActive": true,
  "isSubAccount": false,
  "currentBalance": 100000.0,
  "currency": "USD",
  "description": "Total Assets",
  "createdAt": 1704067200000,
  "updatedAt": 1704067200000
}
```

### **Child Account (Cash)**

```json
{
  "companyId": "YOUR_COMPANY_ID_HERE",
  "erpAccountId": "1110",
  "name": "Cash",
  "fullyQualifiedName": "Assets:Current Assets:Cash",
  "accountType": "Bank",
  "classification": "Asset",
  "parentAccountId": "PARENT_ACCOUNT_CONVEX_ID",
  "parentErpAccountId": "1100",
  "level": 2,
  "path": "1000/1100/1110",
  "isActive": true,
  "isSubAccount": true,
  "currentBalance": 25000.0,
  "currency": "USD",
  "description": "Primary Cash Account",
  "metadata": {
    "bankAccountNumber": "****1234",
    "routingNumber": "123456789",
    "openingBalance": 10000.0,
    "openingBalanceDate": 1701475200000
  },
  "createdAt": 1704067200000,
  "updatedAt": 1704067200000
}
```

## 🔧 **Required Fields Checklist**

Before creating any account document, ensure these fields are properly filled:

### **Always Required:**

- ✅ `companyId` - Valid Convex ID (starts with letters like "j57...")
- ✅ `erpAccountId` - String (e.g., "1000", "1110")
- ✅ `name` - String (e.g., "Cash", "Assets")
- ✅ `accountType` - String (e.g., "Bank", "Other Current Asset")
- ✅ `classification` - Must be one of: "Asset", "Liability", "Equity", "Revenue", "Expense"
- ✅ `level` - Number (0 for root, 1+ for children)
- ✅ `path` - String (e.g., "1000" or "1000/1100/1110")
- ✅ `isActive` - Boolean (true/false)
- ✅ `isSubAccount` - Boolean (false for root, true for children)
- ✅ `createdAt` - Number (timestamp)
- ✅ `updatedAt` - Number (timestamp)

### **For Child Accounts:**

- ✅ `parentAccountId` - Valid Convex ID of parent account
- ✅ `parentErpAccountId` - String ERP ID of parent

## 🎯 **Quick Fix Steps**

1. **Go to Convex Dashboard**: https://dashboard.convex.dev/d/ardent-dog-632
2. **Navigate to Functions tab**
3. **Run `createSampleDataset()` mutation**
4. **Copy the returned `companyId`**
5. **Run `createSampleAccounts({ companyId: "YOUR_ID" })` mutation**
6. **View the created accounts in the Data tab**

## 📝 **Valid Classification Values**

Only these values are allowed for `classification`:

- `"Asset"`
- `"Liability"`
- `"Equity"`
- `"Revenue"`
- `"Expense"`

## 🔍 **Common Account Types**

Valid examples for `accountType`:

- `"Bank"`
- `"Accounts Receivable"`
- `"Other Current Asset"`
- `"Fixed Asset"`
- `"Accounts Payable"`
- `"Other Current Liability"`
- `"Long Term Liability"`
- `"Equity"`
- `"Income"`
- `"Expense"`

## 🚀 **Next Steps**

After creating valid accounts, you can:

1. Create transactions that reference these accounts
2. Build account hierarchy queries
3. Implement balance calculations
4. Add anomaly detection logic

---

**Need Help?** The sample data functions will create a complete, valid chart of accounts that demonstrates proper nesting and all required fields.
