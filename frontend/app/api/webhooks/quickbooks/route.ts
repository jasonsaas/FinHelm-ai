import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import crypto from 'crypto';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function validateWebhookSignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get('x-n8n-signature');
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!signature || !secret) {
    console.error('Missing signature or secret');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    if (!validateWebhookSignature(request, body)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);
    
    const webhookType = data.type || 'data_sync';
    const companyId = data.companyId as Id<"companies">;
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    switch (webhookType) {
      case 'accounts_sync':
        if (data.accounts && Array.isArray(data.accounts)) {
          await Promise.all(
            data.accounts.map(async (account: any) => {
              await convex.mutation(api.quickbooks.dataSync.syncAccount, {
                companyId,
                accountData: {
                  erpAccountId: account.Id,
                  name: account.Name,
                  fullyQualifiedName: account.FullyQualifiedName,
                  accountType: account.AccountType,
                  accountSubType: account.AccountSubType,
                  classification: mapAccountClassification(account.Classification),
                  isActive: account.Active,
                  isSubAccount: account.SubAccount,
                  currentBalance: account.CurrentBalance?.value || 0,
                  currentBalanceWithSubAccounts: account.CurrentBalanceWithSubAccounts?.value || 0,
                  currency: account.CurrencyRef?.value || 'USD',
                  parentErpAccountId: account.ParentRef?.value,
                  level: account.Level || 0,
                  path: account.FullyQualifiedName?.replace(/:/, '/') || account.Name,
                },
              });
            })
          );
        }
        break;

      case 'invoices_sync':
        if (data.invoices && Array.isArray(data.invoices)) {
          await Promise.all(
            data.invoices.map(async (invoice: any) => {
              await convex.mutation(api.quickbooks.dataSync.syncInvoice, {
                companyId,
                invoiceData: {
                  erpInvoiceId: invoice.Id,
                  docNumber: invoice.DocNumber,
                  customerId: invoice.CustomerRef?.value,
                  customerName: invoice.CustomerRef?.name,
                  txnDate: new Date(invoice.TxnDate).getTime(),
                  dueDate: invoice.DueDate ? new Date(invoice.DueDate).getTime() : undefined,
                  totalAmount: invoice.TotalAmt || 0,
                  balance: invoice.Balance || 0,
                  status: mapInvoiceStatus(invoice),
                  currency: invoice.CurrencyRef?.value || 'USD',
                  lineItems: invoice.Line?.map((line: any) => ({
                    description: line.Description || '',
                    amount: line.Amount || 0,
                    quantity: line.SalesItemLineDetail?.Qty || 1,
                    rate: line.SalesItemLineDetail?.UnitPrice || 0,
                    itemRef: line.SalesItemLineDetail?.ItemRef?.value,
                  })) || [],
                },
              });
            })
          );
        }
        break;

      case 'customers_sync':
        if (data.customers && Array.isArray(data.customers)) {
          await Promise.all(
            data.customers.map(async (customer: any) => {
              await convex.mutation(api.quickbooks.dataSync.syncCustomer, {
                companyId,
                customerData: {
                  erpCustomerId: customer.Id,
                  displayName: customer.DisplayName,
                  companyName: customer.CompanyName,
                  givenName: customer.GivenName,
                  familyName: customer.FamilyName,
                  email: customer.PrimaryEmailAddr?.Address,
                  phone: customer.PrimaryPhone?.FreeFormNumber,
                  balance: customer.Balance || 0,
                  isActive: customer.Active,
                  taxable: customer.Taxable,
                  currencyRef: customer.CurrencyRef?.value || 'USD',
                  billingAddress: customer.BillAddr ? {
                    line1: customer.BillAddr.Line1,
                    city: customer.BillAddr.City,
                    state: customer.BillAddr.CountrySubDivisionCode,
                    postalCode: customer.BillAddr.PostalCode,
                    country: customer.BillAddr.Country,
                  } : undefined,
                },
              });
            })
          );
        }
        break;

      case 'bills_sync':
        if (data.bills && Array.isArray(data.bills)) {
          await Promise.all(
            data.bills.map(async (bill: any) => {
              await convex.mutation(api.quickbooks.dataSync.syncBill, {
                companyId,
                billData: {
                  erpBillId: bill.Id,
                  docNumber: bill.DocNumber,
                  vendorId: bill.VendorRef?.value,
                  vendorName: bill.VendorRef?.name,
                  txnDate: new Date(bill.TxnDate).getTime(),
                  dueDate: bill.DueDate ? new Date(bill.DueDate).getTime() : undefined,
                  totalAmount: bill.TotalAmt || 0,
                  balance: bill.Balance || 0,
                  status: bill.Balance > 0 ? 'open' : 'paid',
                  currency: bill.CurrencyRef?.value || 'USD',
                  lineItems: bill.Line?.filter((line: any) => line.DetailType === 'AccountBasedExpenseLineDetail')
                    .map((line: any) => ({
                      description: line.Description || '',
                      amount: line.Amount || 0,
                      accountRef: line.AccountBasedExpenseLineDetail?.AccountRef?.value,
                    })) || [],
                },
              });
            })
          );
        }
        break;

      case 'vendors_sync':
        if (data.vendors && Array.isArray(data.vendors)) {
          await Promise.all(
            data.vendors.map(async (vendor: any) => {
              await convex.mutation(api.quickbooks.dataSync.syncVendor, {
                companyId,
                vendorData: {
                  erpVendorId: vendor.Id,
                  displayName: vendor.DisplayName,
                  companyName: vendor.CompanyName,
                  givenName: vendor.GivenName,
                  familyName: vendor.FamilyName,
                  email: vendor.PrimaryEmailAddr?.Address,
                  phone: vendor.PrimaryPhone?.FreeFormNumber,
                  balance: vendor.Balance || 0,
                  isActive: vendor.Active,
                  taxIdentifier: vendor.TaxIdentifier,
                  currencyRef: vendor.CurrencyRef?.value || 'USD',
                  billingAddress: vendor.BillAddr ? {
                    line1: vendor.BillAddr.Line1,
                    city: vendor.BillAddr.City,
                    state: vendor.BillAddr.CountrySubDivisionCode,
                    postalCode: vendor.BillAddr.PostalCode,
                    country: vendor.BillAddr.Country,
                  } : undefined,
                },
              });
            })
          );
        }
        break;

      case 'full_sync':
        await convex.mutation(api.quickbooks.dataSync.updateSyncStatus, {
          companyId,
          status: 'syncing',
        });

        const syncResults = await Promise.allSettled([
          data.accounts && processAccounts(data.accounts, companyId),
          data.invoices && processInvoices(data.invoices, companyId),
          data.customers && processCustomers(data.customers, companyId),
          data.bills && processBills(data.bills, companyId),
          data.vendors && processVendors(data.vendors, companyId),
        ]);

        const hasErrors = syncResults.some(result => result.status === 'rejected');
        
        await convex.mutation(api.quickbooks.dataSync.updateSyncStatus, {
          companyId,
          status: hasErrors ? 'error' : 'connected',
          lastSyncAt: Date.now(),
        });

        return NextResponse.json({
          success: true,
          message: 'Full sync completed',
          results: syncResults.map((result, index) => ({
            entity: ['accounts', 'invoices', 'customers', 'bills', 'vendors'][index],
            status: result.status,
            error: result.status === 'rejected' ? result.reason : undefined,
          })),
        });

      default:
        return NextResponse.json(
          { error: `Unknown webhook type: ${webhookType}` },
          { status: 400 }
        );
    }

    await convex.mutation(api.quickbooks.dataSync.updateSyncStatus, {
      companyId,
      status: 'connected',
      lastSyncAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${webhookType}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function mapAccountClassification(classification: string): "Asset" | "Liability" | "Equity" | "Revenue" | "Expense" {
  const classificationMap: Record<string, "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"> = {
    'Asset': 'Asset',
    'Liability': 'Liability',
    'Equity': 'Equity',
    'Revenue': 'Revenue',
    'Income': 'Revenue',
    'Expense': 'Expense',
    'Cost of Goods Sold': 'Expense',
  };
  
  return classificationMap[classification] || 'Asset';
}

function mapInvoiceStatus(invoice: any): "draft" | "sent" | "paid" | "overdue" | "cancelled" {
  if (invoice.Void) return 'cancelled';
  if (invoice.Balance === 0) return 'paid';
  if (invoice.DueDate && new Date(invoice.DueDate) < new Date()) return 'overdue';
  if (invoice.EmailStatus === 'EmailSent') return 'sent';
  return 'draft';
}

async function processAccounts(accounts: any[], companyId: Id<"companies">) {
  return Promise.all(
    accounts.map(account =>
      convex.mutation(api.quickbooks.dataSync.syncAccount, {
        companyId,
        accountData: {
          erpAccountId: account.Id,
          name: account.Name,
          fullyQualifiedName: account.FullyQualifiedName,
          accountType: account.AccountType,
          accountSubType: account.AccountSubType,
          classification: mapAccountClassification(account.Classification),
          isActive: account.Active,
          isSubAccount: account.SubAccount,
          currentBalance: account.CurrentBalance?.value || 0,
          currentBalanceWithSubAccounts: account.CurrentBalanceWithSubAccounts?.value || 0,
          currency: account.CurrencyRef?.value || 'USD',
          parentErpAccountId: account.ParentRef?.value,
          level: account.Level || 0,
          path: account.FullyQualifiedName?.replace(/:/, '/') || account.Name,
        },
      })
    )
  );
}

async function processInvoices(invoices: any[], companyId: Id<"companies">) {
  return Promise.all(
    invoices.map(invoice =>
      convex.mutation(api.quickbooks.dataSync.syncInvoice, {
        companyId,
        invoiceData: {
          erpInvoiceId: invoice.Id,
          docNumber: invoice.DocNumber,
          customerId: invoice.CustomerRef?.value,
          customerName: invoice.CustomerRef?.name,
          txnDate: new Date(invoice.TxnDate).getTime(),
          dueDate: invoice.DueDate ? new Date(invoice.DueDate).getTime() : undefined,
          totalAmount: invoice.TotalAmt || 0,
          balance: invoice.Balance || 0,
          status: mapInvoiceStatus(invoice),
          currency: invoice.CurrencyRef?.value || 'USD',
          lineItems: invoice.Line?.map((line: any) => ({
            description: line.Description || '',
            amount: line.Amount || 0,
            quantity: line.SalesItemLineDetail?.Qty || 1,
            rate: line.SalesItemLineDetail?.UnitPrice || 0,
            itemRef: line.SalesItemLineDetail?.ItemRef?.value,
          })) || [],
        },
      })
    )
  );
}

async function processCustomers(customers: any[], companyId: Id<"companies">) {
  return Promise.all(
    customers.map(customer =>
      convex.mutation(api.quickbooks.dataSync.syncCustomer, {
        companyId,
        customerData: {
          erpCustomerId: customer.Id,
          displayName: customer.DisplayName,
          companyName: customer.CompanyName,
          givenName: customer.GivenName,
          familyName: customer.FamilyName,
          email: customer.PrimaryEmailAddr?.Address,
          phone: customer.PrimaryPhone?.FreeFormNumber,
          balance: customer.Balance || 0,
          isActive: customer.Active,
          taxable: customer.Taxable,
          currencyRef: customer.CurrencyRef?.value || 'USD',
          billingAddress: customer.BillAddr ? {
            line1: customer.BillAddr.Line1,
            city: customer.BillAddr.City,
            state: customer.BillAddr.CountrySubDivisionCode,
            postalCode: customer.BillAddr.PostalCode,
            country: customer.BillAddr.Country,
          } : undefined,
        },
      })
    )
  );
}

async function processBills(bills: any[], companyId: Id<"companies">) {
  return Promise.all(
    bills.map(bill =>
      convex.mutation(api.quickbooks.dataSync.syncBill, {
        companyId,
        billData: {
          erpBillId: bill.Id,
          docNumber: bill.DocNumber,
          vendorId: bill.VendorRef?.value,
          vendorName: bill.VendorRef?.name,
          txnDate: new Date(bill.TxnDate).getTime(),
          dueDate: bill.DueDate ? new Date(bill.DueDate).getTime() : undefined,
          totalAmount: bill.TotalAmt || 0,
          balance: bill.Balance || 0,
          status: bill.Balance > 0 ? 'open' : 'paid',
          currency: bill.CurrencyRef?.value || 'USD',
          lineItems: bill.Line?.filter((line: any) => line.DetailType === 'AccountBasedExpenseLineDetail')
            .map((line: any) => ({
              description: line.Description || '',
              amount: line.Amount || 0,
              accountRef: line.AccountBasedExpenseLineDetail?.AccountRef?.value,
            })) || [],
        },
      })
    )
  );
}

async function processVendors(vendors: any[], companyId: Id<"companies">) {
  return Promise.all(
    vendors.map(vendor =>
      convex.mutation(api.quickbooks.dataSync.syncVendor, {
        companyId,
        vendorData: {
          erpVendorId: vendor.Id,
          displayName: vendor.DisplayName,
          companyName: vendor.CompanyName,
          givenName: vendor.GivenName,
          familyName: vendor.FamilyName,
          email: vendor.PrimaryEmailAddr?.Address,
          phone: vendor.PrimaryPhone?.FreeFormNumber,
          balance: vendor.Balance || 0,
          isActive: vendor.Active,
          taxIdentifier: vendor.TaxIdentifier,
          currencyRef: vendor.CurrencyRef?.value || 'USD',
          billingAddress: vendor.BillAddr ? {
            line1: vendor.BillAddr.Line1,
            city: vendor.BillAddr.City,
            state: vendor.BillAddr.CountrySubDivisionCode,
            postalCode: vendor.BillAddr.PostalCode,
            country: vendor.BillAddr.Country,
          } : undefined,
        },
      })
    )
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'QuickBooks webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}