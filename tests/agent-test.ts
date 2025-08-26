import fs from 'fs/promises'
import path from 'path'
import { Transaction, Account } from '../shared/src/types'
import {
  MockAnomalyDetectionService,
  AnomalyResult,
  SubledgerAnalysis,
  GrokExplanation,
  mockCsvParser
} from './fixtures/mocks/anomaly-detection-mocks'

describe('FinHelm.ai Anomaly Monitoring Agent - E2E Test Suite', () => {
  let anomalyService: MockAnomalyDetectionService
  let sampleTransactions: Transaction[]
  let sampleAccounts: Account[]

  beforeAll(async () => {
    anomalyService = new MockAnomalyDetectionService()

    const transactionsCsvPath = path.join(__dirname, 'fixtures/data/sample-transactions.csv')
    const accountsCsvPath = path.join(__dirname, 'fixtures/data/accounts.csv')

    const transactionsCsv = await fs.readFile(transactionsCsvPath, 'utf-8')
    const accountsCsv = await fs.readFile(accountsCsvPath, 'utf-8')

    sampleTransactions = await mockCsvParser.parseTransactions(transactionsCsv)
    sampleAccounts = await mockCsvParser.parseAccounts(accountsCsv)
  })

  describe('Data Infrastructure and Mocks', () => {
    test('should load sample CSV data correctly', async () => {
      expect(sampleTransactions).toHaveLength(30)
      expect(sampleAccounts).toHaveLength(5)
      
      const firstTransaction = sampleTransactions[0]
      expect(firstTransaction).toHaveProperty('id')
      expect(firstTransaction).toHaveProperty('amount')
      expect(firstTransaction).toHaveProperty('category')
      expect(firstTransaction).toHaveProperty('type')
    })

    test('should validate transaction data structure', () => {
      sampleTransactions.forEach(transaction => {
        expect(transaction).toMatchObject({
          id: expect.any(String),
          userId: expect.any(String),
          amount: expect.any(Number),
          description: expect.any(String),
          category: expect.any(String),
          date: expect.any(Date),
          type: expect.stringMatching(/^(income|expense)$/),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      })
    })

    test('should validate account data structure', () => {
      sampleAccounts.forEach(account => {
        expect(account).toMatchObject({
          id: expect.any(String),
          userId: expect.any(String),
          name: expect.any(String),
          type: expect.stringMatching(/^(checking|savings|credit|investment)$/),
          balance: expect.any(Number),
          currency: expect.any(String),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      })
    })

    test('should contain known anomalies in sample data', () => {
      const anomalyTransactions = sampleTransactions.filter(t => 
        t.description.includes('ANOMALY')
      )
      expect(anomalyTransactions.length).toBeGreaterThan(0)
      
      const largeAmounts = anomalyTransactions.map(t => Math.abs(t.amount))
      expect(Math.max(...largeAmounts)).toBeGreaterThan(5000)
    })
  })

  describe('3σ (Three Sigma) Outlier Detection', () => {
    test('should detect statistical outliers using three-sigma rule', () => {
      const results = anomalyService.detectOutliers(sampleTransactions)
      
      expect(results).toHaveLength(sampleTransactions.length)
      
      const anomalies = results.filter(r => r.isAnomaly)
      expect(anomalies.length).toBeGreaterThan(0)
      
      anomalies.forEach(anomaly => {
        expect(anomaly.score).toBeGreaterThan(3)
        expect(anomaly.statisticalData.zScore).toBeGreaterThan(3)
        expect(anomaly.explanation).toContain('standard deviations')
      })
    })

    test('should correctly calculate statistical measures', () => {
      const smallDataset = sampleTransactions.slice(0, 10)
      const results = anomalyService.detectOutliers(smallDataset)
      
      results.forEach(result => {
        expect(result.statisticalData.mean).toBeGreaterThan(0)
        expect(result.statisticalData.standardDeviation).toBeGreaterThan(0)
        expect(result.statisticalData.threshold).toBe(3)
        expect(typeof result.statisticalData.zScore).toBe('number')
      })
    })

    test('should handle positive and negative outliers', () => {
      const mixedTransactions = [
        ...sampleTransactions,
        {
          id: 'test_pos',
          userId: 'user_123',
          amount: 20000,
          description: 'Large positive outlier',
          category: 'Income',
          date: new Date(),
          type: 'income' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'test_neg',
          userId: 'user_123',
          amount: -15000,
          description: 'Large negative outlier',
          category: 'Expense',
          date: new Date(),
          type: 'expense' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const results = anomalyService.detectOutliers(mixedTransactions)
      const outliers = results.filter(r => r.isAnomaly)
      
      expect(outliers.length).toBeGreaterThan(2)
    })

    test('should handle edge cases with insufficient data', () => {
      const insufficientData = sampleTransactions.slice(0, 2)
      const results = anomalyService.detectOutliers(insufficientData)
      
      expect(results).toHaveLength(0)
    })

    test('should work with different account types', () => {
      const checkingTxns = sampleTransactions.filter(t => t.userId === 'user_123').slice(0, 15)
      const savingsTxns = sampleTransactions.filter(t => t.userId === 'user_123').slice(15, 25)
      
      const checkingResults = anomalyService.detectOutliers(checkingTxns, 'checking')
      const savingsResults = anomalyService.detectOutliers(savingsTxns, 'savings')
      
      expect(checkingResults.length).toBeGreaterThan(0)
      expect(savingsResults.length).toBeGreaterThan(0)
      
      checkingResults.forEach(result => {
        expect(result.statisticalData).toBeDefined()
      })
    })
  })

  describe('Subledger Analysis Test Suite', () => {
    test('should analyze patterns within account categories', () => {
      const analysis = anomalyService.analyzeSubledger(sampleTransactions, sampleAccounts)
      
      expect(analysis.length).toBeGreaterThan(0)
      
      analysis.forEach(categoryAnalysis => {
        expect(categoryAnalysis.category).toBeDefined()
        expect(categoryAnalysis.accountType).toMatch(/^(checking|savings|credit|investment)$/)
        expect(categoryAnalysis.patterns.averageAmount).toBeGreaterThan(0)
        expect(categoryAnalysis.patterns.frequency).toBeGreaterThan(0)
        expect(Array.isArray(categoryAnalysis.anomalies)).toBe(true)
      })
    })

    test('should validate cross-account pattern analysis', () => {
      const analysis = anomalyService.analyzeSubledger(sampleTransactions, sampleAccounts)
      
      const checkingAnalyses = analysis.filter(a => a.accountType === 'checking')
      const savingsAnalyses = analysis.filter(a => a.accountType === 'savings')
      const creditAnalyses = analysis.filter(a => a.accountType === 'credit')
      
      expect(checkingAnalyses.length).toBeGreaterThan(0)
      expect(savingsAnalyses.length).toBeGreaterThan(0)
      expect(creditAnalyses.length).toBeGreaterThan(0)
    })

    test('should detect category-specific threshold violations', () => {
      const analysis = anomalyService.analyzeSubledger(sampleTransactions, sampleAccounts)
      
      const categoriesWithAnomalies = analysis.filter(a => 
        a.anomalies.some(anomaly => anomaly.isAnomaly)
      )
      
      expect(categoriesWithAnomalies.length).toBeGreaterThan(0)
      
      categoriesWithAnomalies.forEach(categoryAnalysis => {
        const anomalies = categoryAnalysis.anomalies.filter(a => a.isAnomaly)
        expect(anomalies.length).toBeGreaterThan(0)
      })
    })

    test('should validate subledger aggregation accuracy', () => {
      const analysis = anomalyService.analyzeSubledger(sampleTransactions, sampleAccounts)
      
      analysis.forEach(categoryAnalysis => {
        expect(categoryAnalysis.patterns.averageAmount).toBeGreaterThan(0)
        expect(categoryAnalysis.patterns.frequency).toBeGreaterThan(0)
        expect(categoryAnalysis.patterns.seasonality).toBeGreaterThanOrEqual(0)
        expect(categoryAnalysis.patterns.seasonality).toBeLessThanOrEqual(1)
      })
    })

    test('should handle temporal anomaly identification', () => {
      const analysis = anomalyService.analyzeSubledger(sampleTransactions, sampleAccounts)
      
      const temporalAnomalies = analysis.flatMap(a => a.anomalies).filter(anomaly => 
        anomaly.isAnomaly && anomaly.confidence > 0.8
      )
      
      expect(temporalAnomalies.length).toBeGreaterThan(0)
    })
  })

  describe('Grok Explainability and Confidence Testing', () => {
    test('should generate human-readable explanations for anomalies', () => {
      const outliers = anomalyService.detectOutliers(sampleTransactions)
      const anomalousResults = outliers.filter(r => r.isAnomaly)
      const anomalousTransactions = sampleTransactions.filter((_, index) => 
        outliers[index]?.isAnomaly
      )

      expect(anomalousResults.length).toBeGreaterThan(0)
      expect(anomalousTransactions.length).toBeGreaterThan(0)

      if (anomalousResults.length > 0 && anomalousTransactions.length > 0) {
        const explanation = anomalyService.generateGrokExplanation(
          anomalousResults[0],
          anomalousTransactions[0]
        )

        expect(explanation.summary).toBeDefined()
        expect(explanation.reasoning).toHaveLength(expect.any(Number))
        expect(explanation.confidence).toBeGreaterThan(0)
        expect(explanation.riskLevel).toMatch(/^(low|medium|high)$/)
        expect(Array.isArray(explanation.recommendations)).toBe(true)
        expect(explanation.generatedAt).toBeInstanceOf(Date)
      }
    })

    test('should meet 92.7% confidence threshold requirements', () => {
      const outliers = anomalyService.detectOutliers(sampleTransactions)
      const highConfidenceAnomalies = outliers.filter(r => 
        r.isAnomaly && r.confidence >= 0.927
      )
      
      expect(highConfidenceAnomalies.length).toBeGreaterThan(0)
      
      highConfidenceAnomalies.forEach(anomaly => {
        expect(anomaly.confidence).toBeGreaterThanOrEqual(0.927)
        expect(anomaly.confidence).toBeLessThanOrEqual(1.0)
      })
    })

    test('should validate explanation quality and relevance', () => {
      const outliers = anomalyService.detectOutliers(sampleTransactions)
      const anomalousResult = outliers.find(r => r.isAnomaly && r.confidence >= 0.927)
      const anomalousTransaction = sampleTransactions.find((_, index) => 
        outliers[index]?.isAnomaly && outliers[index]?.confidence >= 0.927
      )

      if (anomalousResult && anomalousTransaction) {
        const explanation = anomalyService.generateGrokExplanation(anomalousResult, anomalousTransaction)
        
        expect(explanation.summary.length).toBeGreaterThan(10)
        expect(explanation.reasoning.length).toBeGreaterThan(0)
        expect(explanation.reasoning.every(reason => reason.length > 5)).toBe(true)
        expect(explanation.recommendations.length).toBeGreaterThan(0)
        
        if (explanation.riskLevel === 'high') {
          expect(explanation.reasoning.length).toBeGreaterThanOrEqual(3)
          expect(explanation.recommendations.length).toBeGreaterThanOrEqual(3)
        }
      }
    })

    test('should validate different explanation types', () => {
      const outliers = anomalyService.detectOutliers(sampleTransactions)
      const anomalousTransactions = sampleTransactions.filter((_, index) => 
        outliers[index]?.isAnomaly
      )
      
      const explanations = anomalousTransactions.slice(0, 3).map((txn, index) => {
        const anomalyResult = outliers.find(o => o.isAnomaly)!
        return anomalyService.generateGrokExplanation(anomalyResult, txn)
      })
      
      explanations.forEach(explanation => {
        expect(['low', 'medium', 'high']).toContain(explanation.riskLevel)
        expect(explanation.reasoning.length).toBeGreaterThan(0)
      })
    })

    test('should verify explanations are generated within <2s performance requirement', async () => {
      const startTime = Date.now()
      
      const outliers = anomalyService.detectOutliers(sampleTransactions)
      const anomalousResult = outliers.find(r => r.isAnomaly)
      const anomalousTransaction = sampleTransactions.find((_, index) => 
        outliers[index]?.isAnomaly
      )

      if (anomalousResult && anomalousTransaction) {
        const explanation = anomalyService.generateGrokExplanation(anomalousResult, anomalousTransaction)
        const endTime = Date.now()
        const processingTime = endTime - startTime
        
        expect(processingTime).toBeLessThan(2000)
        expect(explanation.generatedAt).toBeInstanceOf(Date)
      }
    })
  })

  describe('Integration Testing and Performance Validation', () => {
    test('should validate complete anomaly detection pipeline', async () => {
      const result = await anomalyService.processAnomalyPipeline(sampleTransactions, sampleAccounts)
      
      expect(result.outliers).toBeDefined()
      expect(result.subledgerAnalysis).toBeDefined()
      expect(result.explanations).toBeDefined()
      expect(result.performance).toBeDefined()
      
      expect(result.performance.processedTransactions).toBe(sampleTransactions.length)
      expect(result.performance.processingTimeMs).toBeGreaterThan(0)
      expect(typeof result.performance.confidenceThresholdMet).toBe('boolean')
    })

    test('should meet <2s performance requirement for complete pipeline', async () => {
      const startTime = Date.now()
      const result = await anomalyService.processAnomalyPipeline(sampleTransactions, sampleAccounts)
      const endTime = Date.now()
      
      const actualProcessingTime = endTime - startTime
      
      expect(actualProcessingTime).toBeLessThan(2000)
      expect(result.performance.processingTimeMs).toBeLessThan(2000)
    })

    test('should validate integration with FinHelm-ai account structure', async () => {
      const result = await anomalyService.processAnomalyPipeline(sampleTransactions, sampleAccounts)
      
      const accountTypes = new Set(sampleAccounts.map(acc => acc.type))
      const analyzedAccountTypes = new Set(result.subledgerAnalysis.map(analysis => analysis.accountType))
      
      expect(analyzedAccountTypes.size).toBeGreaterThan(0)
      
      analyzedAccountTypes.forEach(type => {
        expect(['checking', 'savings', 'credit', 'investment']).toContain(type)
      })
    })

    test('should confirm 92.7% confidence requirement and success metrics', async () => {
      const result = await anomalyService.processAnomalyPipeline(sampleTransactions, sampleAccounts)
      
      const highConfidenceAnomalies = result.outliers.filter(r => 
        r.isAnomaly && r.confidence >= 0.927
      )
      
      expect(highConfidenceAnomalies.length).toBeGreaterThan(0)
      
      const highConfidenceExplanations = result.explanations.filter(exp => 
        exp.confidence >= 0.927
      )
      
      expect(highConfidenceExplanations.length).toBeGreaterThan(0)
      expect(result.performance.confidenceThresholdMet).toBe(true)
    })

    test('should handle concurrent anomaly detection scenarios', async () => {
      const promises = Array.from({ length: 3 }, () => 
        anomalyService.processAnomalyPipeline(sampleTransactions, sampleAccounts)
      )
      
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.performance.processingTimeMs).toBeLessThan(2000)
        expect(result.outliers.length).toBe(sampleTransactions.length)
      })
    })

    test('should validate system performance under load', async () => {
      const largeTransactionSet = Array.from({ length: 100 }, (_, index) => ({
        id: `load_test_${index}`,
        userId: 'load_user',
        amount: Math.random() * 1000,
        description: `Load test transaction ${index}`,
        category: 'Testing',
        date: new Date(),
        type: 'expense' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
      
      const startTime = Date.now()
      const result = await anomalyService.processAnomalyPipeline(largeTransactionSet, sampleAccounts)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(2000)
      expect(result.performance.processedTransactions).toBe(100)
    })

    test('should validate error recovery and edge cases', async () => {
      const emptyTransactions: Transaction[] = []
      const emptyAccounts: Account[] = []
      
      const result = await anomalyService.processAnomalyPipeline(emptyTransactions, emptyAccounts)
      
      expect(result.outliers).toHaveLength(0)
      expect(result.subledgerAnalysis).toHaveLength(0)
      expect(result.explanations).toHaveLength(0)
      expect(result.performance.processedTransactions).toBe(0)
    })
  })

  describe('Success Metrics and Reporting', () => {
    test('should track and report key success metrics', async () => {
      const result = await anomalyService.processAnomalyPipeline(sampleTransactions, sampleAccounts)
      
      const metrics = {
        totalTransactionsProcessed: result.performance.processedTransactions,
        anomaliesDetected: result.outliers.filter(o => o.isAnomaly).length,
        highConfidenceDetections: result.outliers.filter(o => o.isAnomaly && o.confidence >= 0.927).length,
        averageProcessingTime: result.performance.processingTimeMs,
        categoriesAnalyzed: result.subledgerAnalysis.length,
        explanationsGenerated: result.explanations.length,
        performanceThresholdMet: result.performance.processingTimeMs < 2000,
        confidenceThresholdMet: result.performance.confidenceThresholdMet
      }
      
      expect(metrics.totalTransactionsProcessed).toBe(sampleTransactions.length)
      expect(metrics.anomaliesDetected).toBeGreaterThan(0)
      expect(metrics.highConfidenceDetections).toBeGreaterThan(0)
      expect(metrics.performanceThresholdMet).toBe(true)
      expect(metrics.confidenceThresholdMet).toBe(true)
      
      console.log('🎯 Anomaly Detection Success Metrics:', JSON.stringify(metrics, null, 2))
    })

    test('should validate Financial Intelligence category alignment', async () => {
      const result = await anomalyService.processAnomalyPipeline(sampleTransactions, sampleAccounts)
      
      const financialCategories = [
        'Income', 'Food & Dining', 'Transportation', 'Housing', 
        'Utilities', 'Shopping', 'Entertainment', 'Transfer'
      ]
      
      const detectedCategories = result.subledgerAnalysis.map(analysis => analysis.category)
      const categoryIntersection = detectedCategories.filter(cat => 
        financialCategories.some(finCat => 
          cat.toLowerCase().includes(finCat.toLowerCase()) || 
          finCat.toLowerCase().includes(cat.toLowerCase())
        )
      )
      
      expect(categoryIntersection.length).toBeGreaterThan(0)
    })
  })
})