# 🚨 Convex Document Creation Error Fixes

## **Immediate Solutions for Your Current Errors**

### **Error 1: Account Creation Failed**

**Problem**: Missing required fields in accounts table
**Solution**: Use the sample data functions I created

### **Error 2: Company Creation Failed**

**Problem**: Missing `syncStatus` and other required fields
**Solution**: Use proper document structure with all required fields

---

## 🎯 **Quick Fix - 3 Simple Steps**

### **Step 1: Create User**

Go to your Convex Dashboard Functions tab and run:

```javascript
createSampleUser();
```

**Result**: Returns `{ "userId": "j57abc123..." }`

### **Step 2: Create Company**

Use the userId from Step 1:

```javascript
createSampleCompany({ userId: "j57abc123..." });
```

**Result**: Returns `{ "companyId": "k89def456..." }`

### **Step 3: Create Accounts**

Use the companyId from Step 2:

```javascript
createSampleAccounts({ companyId: "k89def456..." });
```

**Result**: Creates complete chart of accounts with proper hierarchy

---

## 📋 **What Was Wrong & How It's Fixed**

### **Account Creation Issues:**

❌ **Before** (Your broken document):

```json
{
  "accountType": "", // Empty string
  "companyId": "", // Empty string
  "erpAccountId": "", // Empty string
  "name": "", // Empty string
  "path": "" // Empty string
}
```

✅ **After** (Fixed with sample functions):

```json
{
  "companyId": "k89def456...", // Valid Convex ID
  "erpAccountId": "1000", // Account number
  "name": "Assets", // Account name
  "accountType": "Other Current Asset",
  "classification": "Asset", // Valid enum value
  "level": 0, // Hierarchy level
  "path": "1000", // Hierarchical path
  "isActive": true,
  "isSubAccount": false,
  "createdAt": 1756134232605,
  "updatedAt": 1756134232605
}
```

### **Company Creation Issues:**

❌ **Before** (Your broken document):

```json
{
  "erpCompanyId": "", // Empty string
  "name": "" // Empty string
  // Missing: userId (required)
  // Missing: syncStatus (required)
}
```

✅ **After** (Fixed with sample functions):

```json
{
  "userId": "j57abc123...", // Valid user reference
  "name": "Demo Company LLC", // Company name
  "erpSystem": "quickbooks", // Valid enum value
  "erpCompanyId": "QB_DEMO_001", // ERP identifier
  "isActive": true,
  "syncStatus": "connected", // Required field
  "createdAt": 1756134232605,
  "updatedAt": 1756134232605
}
```

---

## 🔧 **Alternative: Manual Creation Templates**

If you prefer to create documents manually, use these exact templates:

### **User Document:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "passwordHash": "$2b$10$example.hash",
  "isVerified": true,
  "isActive": true,
  "createdAt": 1756134232605,
  "updatedAt": 1756134232605
}
```

### **Company Document:**

```json
{
  "userId": "YOUR_USER_ID_HERE",
  "name": "Your Company Name",
  "erpSystem": "quickbooks",
  "erpCompanyId": "QB_001",
  "isActive": true,
  "syncStatus": "connected",
  "createdAt": 1756134232605,
  "updatedAt": 1756134232605
}
```

### **Account Document:**

```json
{
  "companyId": "YOUR_COMPANY_ID_HERE",
  "erpAccountId": "1000",
  "name": "Assets",
  "accountType": "Other Current Asset",
  "classification": "Asset",
  "level": 0,
  "path": "1000",
  "isActive": true,
  "isSubAccount": false,
  "createdAt": 1756134232605,
  "updatedAt": 1756134232605
}
```

---

## ✅ **Validation Checklist**

Before creating any document, verify:

### **For Users:**

- ✅ `email` is unique and valid format
- ✅ `name` is not empty
- ✅ `isVerified` and `isActive` are booleans
- ✅ `createdAt` and `updatedAt` are timestamps

### **For Companies:**

- ✅ `userId` is valid Convex ID of existing user
- ✅ `name` is not empty string
- ✅ `erpSystem` is exactly: "quickbooks", "sage_intacct", or "grok"
- ✅ `erpCompanyId` is not empty string
- ✅ `syncStatus` is exactly: "connected", "syncing", "error", or "disconnected"
- ✅ `isActive` is boolean

### **For Accounts:**

- ✅ `companyId` is valid Convex ID of existing company
- ✅ `name` is not empty string
- ✅ `erpAccountId` is not empty string
- ✅ `accountType` is not empty string
- ✅ `classification` is exactly: "Asset", "Liability", "Equity", "Revenue", or "Expense"
- ✅ `path` is not empty string
- ✅ `level` is number (0 for root accounts)
- ✅ `isActive` and `isSubAccount` are booleans

---

## 🚀 **Success Indicators**

After running the sample functions, you should see:

1. **User Created**: Returns userId starting with letters (e.g., "j57abc123...")
2. **Company Created**: Returns companyId starting with letters (e.g., "k89def456...")
3. **Accounts Created**: Returns array of 8 accounts with proper hierarchy:
   - Assets (root)
   - Current Assets (child of Assets)
   - Cash (child of Current Assets)
   - Accounts Receivable (child of Current Assets)
   - Liabilities (root)
   - Accounts Payable (child of Liabilities)
   - Revenue (root)
   - Expenses (root)

---

## 🎉 **You're Done!**

Once you run these three functions successfully, you'll have:

- ✅ Valid user account
- ✅ Valid company with ERP connection
- ✅ Complete chart of accounts with proper nesting
- ✅ All required fields populated correctly
- ✅ No more Convex validation errors

**Dashboard Link**: https://dashboard.convex.dev/d/ardent-dog-632

**Next Steps**: You can now create transactions, customers, vendors, and start building your ERP integration!
