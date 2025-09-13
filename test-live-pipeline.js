#!/usr/bin/env node

const crypto = require('crypto');
const fetch = require('node-fetch');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/quickbooks';
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'test-secret-key';
const COMPANY_ID = process.env.TEST_COMPANY_ID || 'test_company_123';

function generateSignature(body) {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
}

const testData = {
  accounts_sync: {
    type: 'accounts_sync',
    companyId: COMPANY_ID,
    accounts: [
      {
        Id: '1',
        Name: 'Checking Account',
        FullyQualifiedName: 'Assets:Bank:Checking Account',
        AccountType: 'Bank',
        AccountSubType: 'Checking',
        Classification: 'Asset',
        Active: true,
        SubAccount: false,
        CurrentBalance: { value: 50000 },
        CurrentBalanceWithSubAccounts: { value: 50000 },
        CurrencyRef: { value: 'USD' },
        Level: 2
      },
      {
        Id: '2',
        Name: 'Accounts Receivable',
        FullyQualifiedName: 'Assets:Accounts Receivable',
        AccountType: 'Accounts Receivable',
        Classification: 'Asset',
        Active: true,
        SubAccount: false,
        CurrentBalance: { value: 15000 },
        CurrentBalanceWithSubAccounts: { value: 15000 },
        CurrencyRef: { value: 'USD' },
        Level: 1
      }
    ]
  },
  
  invoices_sync: {
    type: 'invoices_sync',
    companyId: COMPANY_ID,
    invoices: [
      {
        Id: 'INV-001',
        DocNumber: 'INV-001',
        CustomerRef: { value: 'CUST-001', name: 'Acme Corp' },
        TxnDate: '2024-01-15',
        DueDate: '2024-02-15',
        TotalAmt: 5000,
        Balance: 5000,
        CurrencyRef: { value: 'USD' },
        Line: [
          {
            Description: 'Consulting Services',
            Amount: 5000,
            SalesItemLineDetail: {
              Qty: 10,
              UnitPrice: 500,
              ItemRef: { value: 'ITEM-001' }
            }
          }
        ]
      }
    ]
  },
  
  customers_sync: {
    type: 'customers_sync',
    companyId: COMPANY_ID,
    customers: [
      {
        Id: 'CUST-001',
        DisplayName: 'Acme Corp',
        CompanyName: 'Acme Corporation',
        Active: true,
        Taxable: true,
        Balance: 5000,
        CurrencyRef: { value: 'USD' },
        PrimaryEmailAddr: { Address: 'billing@acme.com' },
        PrimaryPhone: { FreeFormNumber: '555-0100' },
        BillAddr: {
          Line1: '123 Main St',
          City: 'San Francisco',
          CountrySubDivisionCode: 'CA',
          PostalCode: '94105',
          Country: 'USA'
        }
      }
    ]
  },
  
  full_sync: {
    type: 'full_sync',
    companyId: COMPANY_ID,
    accounts: [
      {
        Id: '1',
        Name: 'Checking Account',
        FullyQualifiedName: 'Assets:Bank:Checking Account',
        AccountType: 'Bank',
        AccountSubType: 'Checking',
        Classification: 'Asset',
        Active: true,
        SubAccount: false,
        CurrentBalance: { value: 50000 },
        CurrentBalanceWithSubAccounts: { value: 50000 },
        CurrencyRef: { value: 'USD' },
        Level: 2
      }
    ],
    invoices: [
      {
        Id: 'INV-002',
        DocNumber: 'INV-002',
        CustomerRef: { value: 'CUST-001', name: 'Acme Corp' },
        TxnDate: '2024-01-20',
        DueDate: '2024-02-20',
        TotalAmt: 7500,
        Balance: 0,
        CurrencyRef: { value: 'USD' }
      }
    ],
    customers: [
      {
        Id: 'CUST-002',
        DisplayName: 'TechStart Inc',
        CompanyName: 'TechStart Inc',
        Active: true,
        Balance: 0,
        CurrencyRef: { value: 'USD' }
      }
    ]
  }
};

async function testWebhook(testName, data) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('📦 Payload size:', JSON.stringify(data).length, 'bytes');
  
  const signature = generateSignature(data);
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-signature': signature
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result.message);
      if (result.results) {
        console.log('📊 Sync results:');
        result.results.forEach(r => {
          console.log(`   - ${r.entity}: ${r.status}`);
        });
      }
    } else {
      console.error('❌ Error:', response.status, result.error);
    }
    
    return response.ok;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 FinHelm.ai Live Pipeline Test Suite');
  console.log('=====================================');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('Company ID:', COMPANY_ID);
  
  const results = [];
  
  // Test individual sync endpoints
  for (const [name, data] of Object.entries(testData)) {
    const success = await testWebhook(name, data);
    results.push({ name, success });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
  });
  
  console.log(`\n${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);