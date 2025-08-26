import React, { useState } from 'react';
import { Send, FileText, Mail, BarChart, Presentation, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface TextEnhancementResult {
  originalText: string;
  enhancedText: string;
  enhancementType: string;
  suggestions: string[];
  wordCount: {
    original: number;
    enhanced: number;
  };
}

const ENHANCEMENT_TYPES = {
  email: { label: 'Email', icon: Mail, description: 'Professional business email' },
  document: { label: 'Document', icon: FileText, description: 'Structured business document' },
  summary: { label: 'Summary', icon: BarChart, description: 'Executive summary' },
  analysis: { label: 'Analysis', icon: BarChart, description: 'Financial analysis report' },
  presentation: { label: 'Presentation', icon: Presentation, description: 'Slide presentation' },
};

export function TextEnhancer() {
  const [inputText, setInputText] = useState('');
  const [enhancementType, setEnhancementType] = useState<keyof typeof ENHANCEMENT_TYPES>('email');
  const [result, setResult] = useState<TextEnhancementResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnhance = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call - in production, this would call the Convex action
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResult: TextEnhancementResult = {
        originalText: inputText,
        enhancedText: await mockEnhanceText(inputText, enhancementType),
        enhancementType,
        suggestions: [
          'Added professional formatting and structure',
          'Improved financial terminology and clarity',
          'Enhanced readability for target audience',
        ],
        wordCount: {
          original: inputText.split(' ').length,
          enhanced: inputText.split(' ').length + Math.floor(Math.random() * 20),
        },
      };

      setResult(mockResult);
    } catch (err) {
      setError('Failed to enhance text. Please try again.');
      console.error('Enhancement error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">FinHelm AI Text Enhancer</h1>
        <p className="text-gray-600">Transform your financial communications with AI-powered writing assistance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enhancement Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ENHANCEMENT_TYPES).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setEnhancementType(key as keyof typeof ENHANCEMENT_TYPES)}
                    className={clsx(
                      'flex items-center space-x-2 p-3 rounded-lg border transition-colors text-sm',
                      enhancementType === key
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">{config.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="inputText" className="block text-sm font-medium text-gray-700 mb-2">
              Your Text
            </label>
            <textarea
              id="inputText"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter your financial communication text here..."
              className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            onClick={handleEnhance}
            disabled={!inputText.trim() || isLoading}
            className="w-full btn-primary flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Enhancing...' : 'Enhance Text'}</span>
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Enhanced Text</h3>
                <div className="text-sm text-gray-500">
                  {result.wordCount.original} → {result.wordCount.enhanced} words
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-800 font-medium text-sm">Enhanced Version</span>
                  <button
                    onClick={() => copyToClipboard(result.enhancedText)}
                    className="text-green-600 hover:text-green-800 text-sm"
                  >
                    Copy
                  </button>
                </div>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {result.enhancedText}
                  </pre>
                </div>
              </div>

              <div className="card">
                <h4 className="font-medium text-gray-900 mb-2">Improvements Made</h4>
                <ul className="space-y-1">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium text-sm">Original Text</span>
                  <button
                    onClick={() => copyToClipboard(result.originalText)}
                    className="text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Copy
                  </button>
                </div>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-600">
                    {result.originalText}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Enhanced text will appear here</p>
                <p className="text-sm mt-1">Enter text and click "Enhance Text" to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mock function for text enhancement (replace with actual Convex integration)
async function mockEnhanceText(text: string, type: keyof typeof ENHANCEMENT_TYPES): Promise<string> {
  const enhancements = {
    email: (text: string) => {
      let enhanced = text;
      if (!text.toLowerCase().includes('dear')) {
        enhanced = `Dear Valued Stakeholder,\n\n${enhanced}`;
      }
      if (!text.toLowerCase().includes('regards')) {
        enhanced += `\n\nBest regards,\nFinHelm AI Team`;
      }
      return enhanced.replace(/\$(\d+)/g, (match, number) => {
        const num = parseInt(number);
        return num > 1000 ? `$${(num/1000).toFixed(1)}K` : match;
      });
    },
    
    document: (text: string) => {
      let enhanced = text;
      if (text.length > 200 && !text.includes('Executive Summary')) {
        enhanced = `## Executive Summary\n\nThis document provides key insights and recommendations based on comprehensive financial analysis.\n\n## Analysis\n\n${enhanced}`;
      }
      return enhanced;
    },
    
    summary: (text: string) => {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const key = sentences.slice(0, 3).join('. ') + '.';
      return `### Key Highlights\n\n${key}\n\n**Recommendation:** Immediate strategic review recommended based on these findings.`;
    },
    
    analysis: (text: string) => {
      return `# Financial Analysis Report\n\n## Key Findings\n\n${text}\n\n## Recommendations\n\n• Implement data-driven decision making processes\n• Monitor key performance indicators closely\n• Consider strategic adjustments based on analysis results`;
    },
    
    presentation: (text: string) => {
      const points = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      return `# Financial Overview\n\n${points.map(p => `• ${p.trim()}`).join('\n')}\n\n## Key Takeaways\n\n• Data supports strategic business decisions\n• Opportunities identified for optimization\n• Continued monitoring recommended`;
    },
  };

  return enhancements[type](text);
}

export default TextEnhancer;