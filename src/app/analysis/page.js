"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Brain, Loader2, AlertTriangle, CheckCircle, ArrowLeft, Copy, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

const IngredientAnalysisPage = () => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [originalText, setOriginalText] = useState('');
  const [selectedModel, setSelectedModel] = useState('mistral:7b');
  const [manualText, setManualText] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Get OCR text from URL parameters
    const ocrText = searchParams.get('text');
    console.log('Raw URL parameter:', ocrText);
    
    if (ocrText && ocrText.trim() !== '') {
      try {
        // First, try to decode the parameter safely
        let decodedText;
        try {
          decodedText = decodeURIComponent(ocrText);
        } catch (decodeError) {
          console.error('decodeURIComponent failed, trying alternative decoding:', decodeError);
          // Fallback: try to decode with replace for invalid characters
          decodedText = decodeURIComponent(ocrText.replace(/[^\w\-._~:/?#[\]@!$&'()*+,;=%]/g, ''));
        }
        
        console.log('Decoded text:', decodedText);
        console.log('Text length:', decodedText.length);
        
        if (decodedText && decodedText.length > 0) {
          setOriginalText(decodedText);
          analyzeIngredients(decodedText);
        } else {
          console.error('Decoded text is empty');
          setError('No text content found in URL parameter');
        }
      } catch (error) {
        console.error('Error processing URL parameter:', error);
        console.error('Original parameter:', ocrText);
        
        // Try to extract text even if decoding fails
        if (ocrText && ocrText.length > 0) {
          console.log('Attempting to use raw parameter as fallback');
          setOriginalText(ocrText);
          analyzeIngredients(ocrText);
        } else {
          setError('Unable to process text parameter from URL');
        }
      }
    } else {
      console.log('No text parameter found in URL');
      // Don't set error here, just show the empty state
    }
  }, [searchParams]);

  const analyzeIngredients = async (text) => {
    if (!text || text.trim() === '') {
      setError('No text provided for analysis');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const prompt = `Please analyze these ingredients and provide detailed information about them in about 10 lines. Focus on:

1. What these ingredients are commonly used for
2. Any potential health benefits or concerns
3. Whether they are natural or artificial
4. Any allergens or sensitivities they might cause
5. Nutritional value or impact
6. Which Ingredients effect health and which are safe

Ingredients to analyze:
${text}

Please provide a comprehensive analysis in about 10 lines:`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 500
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.response) {
        setAnalysis(result.response);
      } else {
        throw new Error('No response from LLM model');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.message || 'Failed to analyze ingredients');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const goBack = () => {
    router.push('/home');
  };

  const retryAnalysis = () => {
    if (originalText) {
      console.log('Retrying analysis with text:', originalText);
      analyzeIngredients(originalText);
    } else {
      console.log('No original text to retry');
      setError('No text available to analyze');
    }
  };

  const testOllamaConnection = async () => {
    try {
      console.log('Testing Ollama connection...');
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        console.log('Available models:', data);
        alert(`Ollama is running! Available models: ${data.models?.map(m => m.name).join(', ') || 'None'}`);
      } else {
        alert('Ollama is not responding. Please start Ollama service.');
      }
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      alert('Cannot connect to Ollama. Please make sure it is running on http://localhost:11434/');
    }
  };

  const analyzeManualText = () => {
    if (manualText && manualText.trim() !== '') {
      setOriginalText(manualText);
      analyzeIngredients(manualText);
    } else {
      setError('Please enter some text to analyze');
    }
  };

  // Function to detect and highlight warning sentences
  const highlightWarnings = (text) => {
    if (!text) return [];
    
    // Keywords that indicate warnings or concerns
    const warningKeywords = [
      'warning', 'dangerous', 'harmful', 'toxic', 'cancer', 'carcinogen',
      'allergen', 'allergic', 'sensitivity', 'intolerance', 'avoid',
      'risk', 'hazard', 'unsafe', 'contaminated', 'artificial',
      'preservative', 'additive', 'chemical', 'processed', 'refined',
      'high sodium', 'high sugar', 'high fat', 'trans fat', 'saturated fat',
      'cholesterol', 'diabetes', 'obesity', 'heart disease', 'hypertension',
      'inflammation', 'digestive', 'stomach', 'nausea', 'headache',
      'migraine', 'dizziness', 'fatigue', 'weakness', 'drowsiness',
      'irritation', 'rash', 'itching', 'swelling', 'breathing',
      'asthma', 'bronchitis', 'cough', 'sneeze', 'runny nose',
      'blood pressure', 'heart rate', 'palpitation', 'chest pain',
      'liver', 'kidney', 'damage', 'failure', 'disease',
      'cancer', 'tumor', 'malignant', 'benign', 'growth',
      'mutation', 'genetic', 'dna', 'chromosome', 'cell',
      'free radical', 'oxidation', 'inflammation', 'swelling',
      'ulcer', 'gastritis', 'colitis', 'irritable bowel',
      'constipation', 'diarrhea', 'bloating', 'gas', 'acid reflux',
      'heartburn', 'indigestion', 'nausea', 'vomiting', 'loss of appetite',
      'weight loss', 'weight gain', 'metabolism', 'thyroid', 'hormone',
      'insulin', 'glucose', 'blood sugar', 'diabetes', 'prediabetes',
      'metabolic syndrome', 'polycystic ovary', 'pcos', 'infertility',
      'pregnancy', 'breastfeeding', 'infant', 'child', 'elderly',
      'medication', 'drug', 'interaction', 'side effect', 'adverse',
      'contraindication', 'precaution', 'caution', 'careful', 'monitor',
      'consult', 'doctor', 'physician', 'healthcare', 'medical',
      'emergency', 'urgent', 'immediate', 'severe', 'serious',
      'life-threatening', 'fatal', 'death', 'mortality', 'morbidity'
    ];

    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    
    return sentences.map(sentence => {
      const sentenceLower = sentence.toLowerCase();
      const hasWarning = warningKeywords.some(keyword => 
        sentenceLower.includes(keyword.toLowerCase())
      );
      
      return {
        text: sentence.trim(),
        isWarning: hasWarning
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={goBack}
                className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ingredient Analysis</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  AI-powered analysis of food ingredients
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="text-blue-600 dark:text-blue-400" size={24} />
              <span className="text-sm text-gray-600 dark:text-gray-400">Local LLM</span>
            </div>
          </div>
        </div>

        {/* Original Text Section */}
        {originalText && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Original Ingredients Text</h3>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-sans">
                  {originalText}
                </pre>
              </div>
            </div>
          </div>
        )}

                 {/* Model Info */}
         <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
           <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20">
             <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Model</h3>
           </div>
           <div className="p-6">
             <div className="flex items-center space-x-4">
               <div className="flex items-center space-x-2">
                 <Brain className="text-purple-600 dark:text-purple-400" size={20} />
                 <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                   Using: {selectedModel}
                 </span>
               </div>
             </div>
                           <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Make sure your Ollama service is running on http://localhost:11434/
              </p>
              <button
                onClick={testOllamaConnection}
                className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Test Ollama Connection
              </button>
           </div>
         </div>

        {/* Analysis Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Analysis</h3>
              {originalText && (
                <button
                  onClick={retryAnalysis}
                  disabled={loading}
                  className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`mr-1 ${loading ? 'animate-spin' : ''}`} size={14} />
                  Retry
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="animate-spin text-blue-600 dark:text-blue-400 mb-4" size={32} />
                <p className="text-gray-600 dark:text-gray-400 text-lg">Analyzing ingredients...</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                  This may take a few moments
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="text-red-600 dark:text-red-400 mr-3" size={24} />
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-200">Analysis Error</h4>
                    <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                      {error}
                    </p>
                  </div>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4">
                  <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">Troubleshooting:</h5>
                                     <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                     <li>• Make sure your local LLM model is running on http://localhost:11434/</li>
                     <li>• Check if the model name is correct (currently set to '{selectedModel}')</li>
                     <li>• Verify that the Ollama service is running</li>
                     <li>• Try refreshing the page or clicking 'Retry'</li>
                   </ul>
                </div>
              </div>
            )}

            {analysis && !loading && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="text-green-600 dark:text-green-400 mr-3" size={24} />
                    <h4 className="font-semibold text-green-800 dark:text-green-200">Analysis Complete</h4>
                  </div>
                  <button
                    onClick={() => copyToClipboard(analysis)}
                    className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                  >
                    <Copy className="mr-1" size={14} />
                    Copy
                  </button>
                </div>
                                 <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                   <div className="prose prose-gray dark:prose-invert max-w-none">
                     <div className="text-gray-900 dark:text-white leading-relaxed">
                                               {highlightWarnings(analysis).map((sentence, index) => (
                          <p 
                            key={index} 
                            className={`mb-3 last:mb-0 ${
                              sentence.isWarning 
                                ? 'text-red-600 dark:text-red-400 font-medium' 
                                : ''
                            }`}
                          >
                            {sentence.text}
                          </p>
                        ))}
                     </div>
                   </div>
                 </div>
              </div>
            )}

            {!originalText && !loading && !error && (
              <div className="text-center py-12">
                <Brain className="text-gray-400 dark:text-gray-600 mx-auto mb-4" size={48} />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Ingredients to Analyze
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Please scan an image with ingredients text first to get started, or enter text manually below.
                </p>
                
                {/* Manual Text Input */}
                <div className="max-w-md mx-auto mb-6">
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Enter ingredients text manually here..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    rows={4}
                  />
                  <button
                    onClick={analyzeManualText}
                    disabled={!manualText.trim()}
                    className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Analyze Manual Text
                  </button>
                </div>
                <button
                  onClick={goBack}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Scanner
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AnalysisPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Ingredient Analysis">
        <IngredientAnalysisPage />
      </AppShell>
    </ProtectedRoute>
  );
}