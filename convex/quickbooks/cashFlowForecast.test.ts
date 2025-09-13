/**
 * Unit tests for 13-week cash flow forecast
 */
import { expect, describe, test, beforeEach } from '@jest/globals';
import { ConvexTestingHelper } from 'convex/testing';
import { api } from '../_generated/api';

let t: ConvexTestingHelper<typeof api>;
let userId: string;

beforeEach(async () => {
  t = new ConvexTestingHelper(api);
  // Create sample user & company & accounts
  const createdUserId = await t.mutation(api['sampleData:createSampleUser'], {});
  userId = createdUserId as unknown as string;
  const company = await t.mutation(api['sampleData:createSampleCompany'], { userId: createdUserId });
  await t.mutation(api['sampleData:createSampleAccounts'], { companyId: company });
});

describe('CashFlowForecast (Convex query)', () => {
  test('calculates 13-week projection accurately', async () => {
    // Seed a couple of unpaid invoices and bills via n8n mutations
    await t.mutation(api['quickbooks/n8nMutations:storeInvoices'], {
      invoices: [
        {
          Id: 'INV-1001',
          CustomerRef: { value: 'CUST-1', name: 'Acme Co' },
          TxnDate: new Date().toISOString(),
          DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          TotalAmt: 5000,
          Balance: 5000,
          Line: [],
        },
      ],
      timestamp: new Date().toISOString(),
      syncSource: 'quickbooks',
    });

    await t.mutation(api['quickbooks/dataSync:syncBills'], {
      userId,
      bills: [
        {
          billId: 'BILL-2001',
          vendorId: 'VEND-1',
          vendorName: 'Vendor A',
          txnDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          totalAmt: 2000,
          balance: 2000,
          status: 'Open',
        },
      ],
    } as any);

    const result = await t.query(api['quickbooks/dataSync:calculate13WeekForecast'], { userId });
    expect(result.forecast).toHaveLength(13);
    expect(result.summary.endingCash).toBeGreaterThanOrEqual(0);
  });
});