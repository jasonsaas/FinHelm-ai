#!/usr/bin/env node

/**
 * Test script for n8n webhook endpoint
 * Tests all four data types: customers, invoices, accounts, payments
 */

const https = require('https');

const WEBHOOK_URL = 'https://ardent-dog-632.convex.site/webhook/n8n';

// Sample test data for each type
const testPayloads = {
  customers: {
    dataType: 'customers',
    timestamp: new Date().toISOString(),
    syncSource: 'quickbooks',
    count: 2,
    data: [
      {
        Id: 'CUST001',
        DisplayName: 'Acme Corporation',
        CompanyName: 'Acme Corp',
        Active: true,
        Balance: '5000.00',
        PrimaryEmailAddr: { Address: 'contact@acme.com' },
        PrimaryPhone: { FreeFormNumber: '555-0100' },
        BillAddr: {
          Line1: '123 Main Street',
          City: 'San Francisco',
          CountrySubDivisionCode: 'CA',
          PostalCode: '94105',
          Country: 'US'
        }
      },
      {
        Id: 'CUST002',
        DisplayName: 'Tech Solutions Inc',
        CompanyName: 'Tech Solutions',
        Active: true,
        Balance: '12500.00',
        PrimaryEmailAddr: { Address: 'info@techsolutions.com' },
        PrimaryPhone: { FreeFormNumber: '555-0200' }
      }
    ],
    summary: {
      totalRecords: 2,
      processed: 2,
      failed: 0
    }
  },
  
  invoices: {
    dataType: 'invoices',
    timestamp: new Date().toISOString(),
    syncSource: 'quickbooks',
    count: 2,
    data: [
      {
        Id: 'INV001',
        DocNumber: '1001',
        CustomerRef: { value: 'CUST001', name: 'Acme Corporation' },
        TxnDate: '2024-01-15',
        DueDate: '2024-02-15',
        TotalAmt: '5000.00',
        Balance: '2500.00',
        Line: [
          {
            DetailType: 'SalesItemLineDetail',
            Amount: '5000.00',
            Description: 'Consulting Services',
            SalesItemLineDetail: {
              Qty: 10,
              UnitPrice: 500
            }
          }
        ]
      },
      {
        Id: 'INV002',
        DocNumber: '1002',
        CustomerRef: { value: 'CUST002', name: 'Tech Solutions Inc' },
        TxnDate: '2024-01-20',
        DueDate: '2024-02-20',
        TotalAmt: '12500.00',
        Balance: '12500.00'
      }
    ],
    summary: {
      totalRecords: 2,
      processed: 2,
      failed: 0
    }
  },
  
  accounts: {
    dataType: 'accounts',
    timestamp: new Date().toISOString(),
    syncSource: 'quickbooks',
    count: 3,
    data: [
      {
        Id: 'ACC001',
        Name: 'Checking Account',
        FullyQualifiedName: 'Bank Accounts:Checking Account',
        AccountType: 'Bank',
        AccountSubType: 'Checking',
        Active: true,
        CurrentBalance: '50000.00',
        CurrencyRef: { value: 'USD' }
      },
      {
        Id: 'ACC002',
        Name: 'Accounts Receivable',
        FullyQualifiedName: 'Accounts Receivable',
        AccountType: 'Accounts Receivable',
        Active: true,
        CurrentBalance: '17500.00',
        CurrencyRef: { value: 'USD' }
      },
      {
        Id: 'ACC003',
        Name: 'Sales Revenue',
        FullyQualifiedName: 'Revenue:Sales Revenue',
        AccountType: 'Income',
        Active: true,
        CurrentBalance: '125000.00',
        CurrencyRef: { value: 'USD' }
      }
    ],
    summary: {
      totalRecords: 3,
      processed: 3,
      failed: 0
    }
  },
  
  payments: {
    dataType: 'payments',
    timestamp: new Date().toISOString(),
    syncSource: 'quickbooks',
    count: 2,
    data: [
      {
        Id: 'PAY001',
        TxnDate: '2024-01-25',
        CustomerRef: { value: 'CUST001', name: 'Acme Corporation' },
        TotalAmt: '2500.00',
        PaymentMethodRef: { name: 'Check' },
        PaymentRefNum: 'CHK-1234',
        Line: [
          {
            Amount: '2500.00',
            LinkedTxn: [
              {
                TxnId: 'INV001',
                TxnType: 'Invoice'
              }
            ]
          }
        ],
        UnappliedAmt: '0.00',
        DepositToAccountRef: { value: 'ACC001' }
      },
      {
        Id: 'PAY002',
        TxnDate: '2024-01-26',
        CustomerRef: { value: 'CUST002', name: 'Tech Solutions Inc' },
        TotalAmt: '5000.00',
        PaymentMethodRef: { name: 'Electronic Transfer' },
        PaymentRefNum: 'EFT-5678',
        PrivateNote: 'Partial payment received'
      }
    ],
    summary: {
      totalRecords: 2,
      processed: 2,
      failed: 0
    }
  }
};

// Function to send HTTP request
function sendWebhookRequest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    console.log(`\n📤 Sending ${payload.dataType} data...`);
    console.log(`   Records: ${payload.count}`);
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
        
        try {
          const response = JSON.parse(responseData);
          if (res.statusCode === 200) {
            console.log(`   ✅ Success:`, {
              processed: response.recordsProcessed,
              failed: response.recordsFailed,
              time: response.processingTime
            });
          } else {
            console.log(`   ❌ Error:`, response.error || response);
          }
        } catch (e) {
          console.log(`   Response:`, responseData);
        }
        
        resolve({ status: res.statusCode, data: responseData });
      });
    });
    
    req.on('error', (error) => {
      console.error(`   ❌ Request failed:`, error.message);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log('🧪 Testing n8n Webhook Endpoint');
  console.log('================================');
  console.log(`URL: ${WEBHOOK_URL}`);
  
  const testOrder = ['customers', 'accounts', 'invoices', 'payments'];
  
  for (const dataType of testOrder) {
    try {
      await sendWebhookRequest(testPayloads[dataType]);
      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to test ${dataType}:`, error);
    }
  }
  
  console.log('\n✨ All tests completed!');
  console.log('\nYou can check the data in your Convex dashboard:');
  console.log('https://dashboard.convex.dev/d/ardent-dog-632/data');
}

// Run the tests
runTests().catch(console.error);