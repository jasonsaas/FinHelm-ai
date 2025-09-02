# Company Creation Guide - Fix Convex Document Errors

## 🚨 **Current Error Analysis**

The error shows you're trying to create a company document with missing required fields:

```json
{
  "createdAt": 1756134232605.0,
  "erpCompanyId": "", // ❌ Empty string - needs value
  "erpSystem": "quickbooks", // ✅ Valid
  "isActive": true, // ✅ Valid
  "name": "", // ❌ Empty string - needs value
  "updatedAt": 1756134232605.0
  // ❌ MISSING: userId (required)
  // ❌ MISSING: syncStatus (required)
}
```

## ✅ **Solution 1: Use Sample Data Functions**

### Step 1: Create a User First

```javascript
// Run this mutation to create a valid user
createSampleUser();
```

This returns:

```json
{
  "userId": "j57abc123..."
}
```

### Step 2: Create Company with Valid User ID

```javascript
// Use the userId from Step 1
createSampleCompany({ userId: "j57abc123..." });
```

## ✅ **Solution 2: Manual Company Creation**

If creating manually, here's the correct structure:

### **Minimum Required Fields:**

```json
{
  "userId": "VALID_USER_CONVEX_ID", // ✅ Required - must be valid user ID
  "name": "My Company Inc.", // ✅ Required - company name
  "erpSystem": "quickbooks", // ✅ Required - must be: quickbooks, sage_intacct, or grok
  "erpCompanyId": "QB_COMP_001", // ✅ Required - ERP system company ID
  "isActive": true, // ✅ Required - boolean
  "syncStatus": "connected", // ✅ Required - must be: connected, syncing, error, or disconnected
  "createdAt": 1756134232605, // ✅ Required - timestamp
  "updatedAt": 1756134232605 // ✅ Required - timestamp
}
```

### **Complete Company Document Example:**

```json
{
  "userId": "j57abc123...",
  "name": "Demo Company LLC",
  "erpSystem": "quickbooks",
  "erpCompanyId": "QB_DEMO_001",
  "erpCompanyName": "Demo Company LLC",
  "accessToken": "sample_access_token",
  "refreshToken": "sample_refresh_token",
  "tokenExpiry": 1756137832605,
  "realmId": "123456789",
  "baseUrl": "https://sandbox-quickbooks.api.intuit.com",
  "isActive": true,
  "lastSyncAt": 1756134232605,
  "syncStatus": "connected",
  "metadata": {
    "fiscalYearStart": "01-01",
    "baseCurrency": "USD",
    "countryCode": "US",
    "industry": "Technology"
  },
  "createdAt": 1756134232605,
  "updatedAt": 1756134232605
}
```

## 🔧 **Required Fields Checklist**

### **Always Required:**

- ✅ `userId` - Valid Convex ID of existing user
- ✅ `name` - Company name (string, not empty)
- ✅ `erpSystem` - Must be exactly: `"quickbooks"`, `"sage_intacct"`, or `"grok"`
- ✅ `erpCompanyId` - ERP system company identifier (string, not empty)
- ✅ `isActive` - Boolean (true/false)
- ✅ `syncStatus` - Must be exactly: `"connected"`, `"syncing"`, `"error"`, or `"disconnected"`
- ✅ `createdAt` - Number (timestamp)
- ✅ `updatedAt` - Number (timestamp)

### **Optional Fields:**

- `erpCompanyName` - Display name in ERP system
- `accessToken` - OAuth access token
- `refreshToken` - OAuth refresh token
- `tokenExpiry` - Token expiration timestamp
- `realmId` - QuickBooks specific realm ID
- `baseUrl` - API base URL
- `lastSyncAt` - Last synchronization timestamp
- `metadata` - Additional company information

## 🎯 **Quick Fix Steps**

1. **Go to Convex Dashboard**: https://dashboard.convex.dev/d/ardent-dog-632

2. **First, create a user** (if you don't have one):

   ```javascript
   createSampleUser();
   ```

3. **Copy the returned userId**

4. **Create company with valid data**:

   ```javascript
   createSampleCompany({ userId: "YOUR_USER_ID_HERE" });
   ```

5. **Or create manually** with this structure:
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

## 📝 **Valid Values Reference**

### **erpSystem** (must be exact):

- `"quickbooks"`
- `"sage_intacct"`
- `"grok"`

### **syncStatus** (must be exact):

- `"connected"` - Successfully connected to ERP
- `"syncing"` - Currently synchronizing data
- `"error"` - Connection or sync error
- `"disconnected"` - Not connected to ERP

## 🚨 **Common Mistakes to Avoid**

1. **Empty Strings**: Don't use `""` for required string fields
2. **Missing userId**: Every company must belong to a user
3. **Invalid erpSystem**: Must be exactly one of the three allowed values
4. **Missing syncStatus**: This field is required, not optional
5. **Wrong Data Types**:
   - `isActive` must be boolean, not string
   - `createdAt`/`updatedAt` must be numbers (timestamps)
   - `userId` must be a valid Convex ID

## 🔍 **Validation Errors Explained**

- **"Object is missing the required field"** = You forgot a required field
- **"does not match the schema"** = Wrong data type or invalid value
- **"v.union"** errors = You used an invalid value for a field with limited options

## 🚀 **After Creating Company**

Once you have a valid company, you can:

1. Create accounts using `createSampleAccounts({ companyId: "YOUR_COMPANY_ID" })`
2. Add transactions, customers, vendors
3. Generate insights and reports

---

**Quick Fix**: Use `createSampleUser()` then `createSampleCompany({ userId: "..." })` for immediate success!
