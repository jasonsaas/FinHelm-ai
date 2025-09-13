/**
 * Integration test for n8n webhook -> Convex mutations
 */
import { expect, describe, test, beforeEach } from '@jest/globals';
import { ConvexTestingHelper } from 'convex/testing';
import { api } from '../../convex/_generated/api';

let t: ConvexTestingHelper<typeof api>;

beforeEach(async () => {
  t = new ConvexTestingHelper(api);
});

describe('QuickBooks Data Pipeline', () => {
  test('n8n webhook updates Convex correctly (storeInvoices)', async () => {
    // Arrange: create a user & company so downstream code can attach data
    const userId = (await t.mutation(api['sampleData:createSampleUser'], {})) as unknown as string;
    await t.mutation(api['sampleData:createSampleCompany'], { userId });

    // Act: call the mutation directly that webhook would call
    const result = await t.mutation(api['quickbooks/n8nMutations:storeInvoices'], {
      invoices: [
        {
          Id: 'INV-9001',
          CustomerRef: { value: 'CUST-1', name: 'Acme Co' },
          TxnDate: new Date().toISOString(),
          DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          TotalAmt: 1200,
          Balance: 1200,
          Line: [],
        },
      ],
      timestamp: new Date().toISOString(),
      syncSource: 'quickbooks',
    });

    // Assert
    expect(result.processed).toBeGreaterThan(0);

    // Verify it is queryable by dataSync (13-week forecast)
    const forecast = await t.query(api['quickbooks/dataSync:calculate13WeekForecast'], { userId });
    expect(forecast.forecast).toHaveLength(13);
  });
});