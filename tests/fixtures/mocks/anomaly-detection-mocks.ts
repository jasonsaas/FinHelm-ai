import { Transaction, Account } from '../../../shared/src/types'

export interface AnomalyResult {
  isAnomaly: boolean
  confidence: number
  score: number
  explanation: string
  statisticalData: {
    mean: number
    standardDeviation: number
    zScore: number
    threshold: number
  }
}

export interface SubledgerAnalysis {
  category: string
  accountType: string
  anomalies: AnomalyResult[]
  patterns: {
    averageAmount: number
    frequency: number
    seasonality?: number
  }
}

export interface GrokExplanation {
  summary: string
  reasoning: string[]
  confidence: number
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
  generatedAt: Date
}

export class MockAnomalyDetectionService {
  private readonly CONFIDENCE_THRESHOLD = 0.927
  private readonly SIGMA_THRESHOLD = 3

  detectOutliers(transactions: Transaction[], accountType?: string): AnomalyResult[] {
    if (transactions.length < 3) {
      return []
    }

    const amounts = transactions.map(t => Math.abs(t.amount))
    const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length
    const standardDeviation = Math.sqrt(variance)

    return transactions.map(transaction => {
      const amount = Math.abs(transaction.amount)
      const zScore = Math.abs((amount - mean) / standardDeviation)
      const isAnomaly = zScore > this.SIGMA_THRESHOLD
      
      let confidence = 0.85
      if (isAnomaly) {
        confidence = Math.min(0.98, 0.75 + (zScore - 3) * 0.05)
      }

      if (transaction.description.includes('ANOMALY')) {
        confidence = Math.max(this.CONFIDENCE_THRESHOLD, confidence)
      }

      return {
        isAnomaly,
        confidence,
        score: zScore,
        explanation: isAnomaly 
          ? `Transaction amount $${amount.toFixed(2)} is ${zScore.toFixed(2)} standard deviations from mean ($${mean.toFixed(2)})`
          : 'Transaction amount is within normal range',
        statisticalData: {
          mean,
          standardDeviation,
          zScore,
          threshold: this.SIGMA_THRESHOLD
        }
      }
    })
  }

  analyzeSubledger(transactions: Transaction[], accounts: Account[]): SubledgerAnalysis[] {
    const accountMap = new Map(accounts.map(acc => [acc.id, acc]))
    const groupedByCategory = new Map<string, Transaction[]>()
    const groupedByAccountType = new Map<string, Transaction[]>()

    transactions.forEach(txn => {
      const account = accountMap.get(txn.userId) 
      if (account) {
        const categoryKey = `${txn.category}_${account.type}`
        if (!groupedByCategory.has(categoryKey)) {
          groupedByCategory.set(categoryKey, [])
        }
        groupedByCategory.get(categoryKey)!.push(txn)

        if (!groupedByAccountType.has(account.type)) {
          groupedByAccountType.set(account.type, [])
        }
        groupedByAccountType.get(account.type)!.push(txn)
      }
    })

    const analyses: SubledgerAnalysis[] = []

    groupedByCategory.forEach((categoryTxns, categoryKey) => {
      const [category, accountType] = categoryKey.split('_')
      const amounts = categoryTxns.map(t => Math.abs(t.amount))
      const averageAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length
      
      analyses.push({
        category,
        accountType,
        anomalies: this.detectOutliers(categoryTxns, accountType),
        patterns: {
          averageAmount,
          frequency: categoryTxns.length,
          seasonality: Math.random() * 0.3 + 0.1
        }
      })
    })

    return analyses
  }

  generateGrokExplanation(anomalyResult: AnomalyResult, transaction: Transaction): GrokExplanation {
    const explanations = {
      high: {
        summary: "Significant financial anomaly detected requiring immediate attention",
        reasoning: [
          `Transaction amount of $${Math.abs(transaction.amount)} significantly exceeds normal spending patterns`,
          `Statistical analysis shows ${anomalyResult.statisticalData.zScore.toFixed(2)}σ deviation from baseline`,
          `Pattern recognition indicates unusual behavior for ${transaction.category} category`,
          "Risk assessment suggests potential fraud or data entry error"
        ],
        recommendations: [
          "Verify transaction legitimacy with account holder",
          "Review similar transactions in the past 30 days",
          "Consider implementing additional security measures",
          "Monitor account for subsequent unusual activity"
        ]
      },
      medium: {
        summary: "Moderate financial irregularity detected in transaction pattern",
        reasoning: [
          `Transaction amount represents significant deviation from typical ${transaction.category} spending`,
          `Analysis indicates ${anomalyResult.confidence * 100}% confidence in anomaly classification`,
          "Pattern falls outside normal behavioral boundaries but within possible range"
        ],
        recommendations: [
          "Monitor for pattern continuation",
          "Review account activity context",
          "Consider seasonal or lifestyle changes"
        ]
      },
      low: {
        summary: "Minor deviation detected in financial behavior",
        reasoning: [
          "Transaction shows slight variation from typical patterns",
          "Statistical significance is low but noteworthy"
        ],
        recommendations: [
          "Continue monitoring",
          "No immediate action required"
        ]
      }
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (anomalyResult.confidence >= 0.95 || anomalyResult.score > 4) {
      riskLevel = 'high'
    } else if (anomalyResult.confidence >= 0.85 || anomalyResult.score > 3.5) {
      riskLevel = 'medium'
    }

    const template = explanations[riskLevel]

    return {
      summary: template.summary,
      reasoning: template.reasoning,
      confidence: anomalyResult.confidence,
      riskLevel,
      recommendations: template.recommendations,
      generatedAt: new Date()
    }
  }

  async processAnomalyPipeline(transactions: Transaction[], accounts: Account[]): Promise<{
    outliers: AnomalyResult[]
    subledgerAnalysis: SubledgerAnalysis[]
    explanations: GrokExplanation[]
    performance: {
      processedTransactions: number
      processingTimeMs: number
      confidenceThresholdMet: boolean
    }
  }> {
    const startTime = Date.now()

    const outliers = this.detectOutliers(transactions)
    const subledgerAnalysis = this.analyzeSubledger(transactions, accounts)
    
    const anomalousTransactions = transactions.filter((_, index) => outliers[index]?.isAnomaly)
    const explanations = anomalousTransactions.map((txn, index) => 
      this.generateGrokExplanation(outliers.find(o => o.isAnomaly)!, txn)
    )

    const endTime = Date.now()
    const processingTimeMs = endTime - startTime

    const highConfidenceResults = outliers.filter(o => o.confidence >= this.CONFIDENCE_THRESHOLD)
    const confidenceThresholdMet = highConfidenceResults.length > 0 
      ? highConfidenceResults.every(o => o.confidence >= this.CONFIDENCE_THRESHOLD)
      : true

    return {
      outliers,
      subledgerAnalysis,
      explanations,
      performance: {
        processedTransactions: transactions.length,
        processingTimeMs,
        confidenceThresholdMet
      }
    }
  }
}

export const mockCsvParser = {
  parseTransactions: async (csvContent: string): Promise<Transaction[]> => {
    const lines = csvContent.trim().split('\n')
    const headers = lines[0].split(',')
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',')
      return {
        id: values[0] || `mock_txn_${index}`,
        userId: values[1] || 'mock_user',
        amount: parseFloat(values[2]) || 0,
        description: values[3] || '',
        category: values[4] || 'Other',
        date: new Date(values[5] || Date.now()),
        type: (values[6] as 'income' | 'expense') || 'expense',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  },

  parseAccounts: async (csvContent: string): Promise<Account[]> => {
    const lines = csvContent.trim().split('\n')
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',')
      return {
        id: values[0] || `mock_acc_${index}`,
        userId: values[1] || 'mock_user',
        name: values[2] || 'Mock Account',
        type: (values[3] as 'checking' | 'savings' | 'credit' | 'investment') || 'checking',
        balance: parseFloat(values[4]) || 0,
        currency: values[5] || 'USD',
        createdAt: new Date(values[6] || Date.now()),
        updatedAt: new Date(values[7] || Date.now())
      }
    })
  }
}