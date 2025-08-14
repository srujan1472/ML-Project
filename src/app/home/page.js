"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Scan, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';

const NextjsScannerApp = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || 'User';
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [barcodeType, setBarcodeType] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [processingBarcode, setProcessingBarcode] = useState(false);
  const [productData, setProductData] = useState(null);
  const [productError, setProductError] = useState(null);
  const [analysisWarnings, setAnalysisWarnings] = useState([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const canvasRef = useRef(null);
  const codeReaderRef = useRef(null);
  const controlsRef = useRef(null);
  const videoElRef = useRef(null);
  const readerIdRef = useRef(`scanner-${Math.random().toString(36).slice(2)}`);
  const isScanningRef = useRef(false);
  const router = useRouter();

  const startScanner = async () => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setScannedBarcode(null);
    setBarcodeType(null);
    setProductData(null);
    setProductError(null);
    setAnalysisWarnings([]);
    try {
      if (!codeReaderRef.current) {
        const mods = await import('@zxing/browser');
        codeReaderRef.current = new mods.BrowserMultiFormatReader();
      }
      const target = document.getElementById(readerIdRef.current);
      if (!target) throw new Error('Scanner target not found');
      
      if (!videoElRef.current) {
        const video = document.createElement('video');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('playsinline', 'true');
        video.style.width = '100%';
        video.style.height = '100%';
        videoElRef.current = video;
        target.innerHTML = '';
        target.appendChild(video);
      }
      
      await codeReaderRef.current.decodeFromVideoDevice(
        null,
        videoElRef.current,
        async (result, err) => {
          if (result) {
            const text = result.getText();
            const format = result.getBarcodeFormat?.() || 'BARCODE';
            try {
              await stopScanner();
              setShowBarcodeScanner(false);
              setScannedBarcode(text);
              setBarcodeType(String(format));
              await processBarcodeData(text, String(format));
            } catch {}
          }
        }
      );
    } catch (error) {
      console.error('Scanner init error:', error);
      alert('Failed to start barcode scanner');
      setShowBarcodeScanner(false);
      isScanningRef.current = false;
      await stopScanner();
    }
  };

  const stopScanner = () => {
    return new Promise(async (resolve) => {
      try {
        try { codeReaderRef.current?.reset?.(); } catch {}
        if (videoElRef.current && videoElRef.current.srcObject) {
          try {
            const tracks = videoElRef.current.srcObject.getTracks?.() || [];
            tracks.forEach((t) => t.stop());
          } catch {}
        }
        if (videoElRef.current) {
          try { videoElRef.current.remove(); } catch {}
          videoElRef.current = null;
        }
      } finally {
        isScanningRef.current = false;
        resolve();
      }
    });
  };

  const handleOpenScanner = () => {
    setShowBarcodeScanner(true);
    setTimeout(() => {
      startScanner();
    }, 250);
  };

  const processBarcodeData = async (data, format) => {
    setProcessingBarcode(true);
    setProductData(null);
    setProductError(null);
    setAnalysisWarnings([]);
    try {
      const apiUrl = `https://testdeploy-kgh0.onrender.com/product/${data}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Product not found in database');
        throw new Error(`Error: ${response.status}`);
      }
      const productData = await response.json();
      setProductData(productData);
      
      const analyzeResponse = await fetch('https://testdeploy-kgh0.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: productData,
          profile: { id: 'user123', allergies: [], diseases: [] }
        }),
      });
      
      if (!analyzeResponse.ok) throw new Error(`Analysis error: ${analyzeResponse.status}`);
      const analysisResult = await analyzeResponse.json();
      
      const userAllergens = await fetchUserAllergens();
      const productAllergens = extractProductAllergens(productData);
      const ingredientsTokens = extractProductIngredientsTokens(productData);
      const matchedAllergens = matchAllergens(userAllergens, productAllergens);
      const matchedIngredients = matchAllergens(userAllergens, ingredientsTokens);
      
      const serverWarnings = Array.isArray(analysisResult.warnings) ? analysisResult.warnings : [];
      const allergenWarnings = matchedAllergens.map((a) => `Allergen alert: contains ${a}`);
      const ingredientWarnings = matchedIngredients.map((a) => `Allergen match in ingredients: ${a}`);
      const combined = dedupeWarnings([...serverWarnings, ...allergenWarnings, ...ingredientWarnings]);
      
      if (combined.length > 0) setAnalysisWarnings(combined);
    } catch (error) {
      console.error('Error fetching product data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setProductError(errorMessage);
      alert(`Could not find product information: ${errorMessage}`);
    } finally {
      setProcessingBarcode(false);
    }
  };

  const normalizeAllergen = (name) => {
    if (!name) return '';
    try {
      return String(name).toLowerCase().trim();
    } catch {
      return '';
    }
  };

  const extractProductAllergens = (product) => {
    const results = new Set();
    if (!product || typeof product !== 'object') return [];
    
    const pushTokens = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((v) => pushTokens(v));
        return;
      }
      const str = String(value);
      str.split(/[;,]/).forEach((part) => {
        const token = part.includes(':') ? part.split(':').pop() : part;
        const norm = normalizeAllergen(token);
        if (norm) results.add(norm);
      });
    };
    
    pushTokens(product.allergens);
    pushTokens(product.allergens_from_user);
    pushTokens(product.allergens_from_ingredients);
    
    if (Array.isArray(product.allergens_tags)) {
      product.allergens_tags.forEach((tag) => {
        const token = typeof tag === 'string' && tag.includes(':') ? tag.split(':').pop() : tag;
        const norm = normalizeAllergen(token);
        if (norm) results.add(norm);
      });
    }
    
    return Array.from(results);
  };

  const extractProductIngredientsTokens = (product) => {
    const results = new Set();
    if (!product || typeof product !== 'object') return [];
    
    const textCandidates = [];
    const maybePush = (v) => { if (v && typeof v === 'string') textCandidates.push(v); };
    
    maybePush(product.ingredients_text);
    maybePush(product.ingredients_text_en);
    maybePush(product.ingredients_text_fr);
    maybePush(product.ingredients_text_es);
    maybePush(product.ingredients_text_de);
    
    Object.keys(product).forEach((k) => {
      try {
        if (/^ingredients(_text)?(_[a-z]{2})?$/i.test(k) && typeof product[k] === 'string') {
          textCandidates.push(product[k]);
        }
      } catch {}
    });
    
    if (Array.isArray(product.ingredients)) {
      product.ingredients.forEach((ing) => {
        if (!ing) return;
        if (typeof ing === 'string') {
          textCandidates.push(ing);
          return;
        }
        if (typeof ing === 'object') {
          const possible = ing.text || ing.id || ing.name || '';
          if (possible) textCandidates.push(String(possible));
        }
      });
    }
    
    if (Array.isArray(product.ingredients_tags)) {
      product.ingredients_tags.forEach((tag) => {
        const token = typeof tag === 'string' && tag.includes(':') ? tag.split(':').pop() : tag;
        const norm = normalizeAllergen(token);
        if (norm) results.add(norm);
      });
    }
    
    const pushTokens = (value) => {
      if (!value) return;
      const str = String(value);
      str
        .split(/[,;()\[\]{}\n\r\t]/)
        .map((s) => s.replace(/[.:*/\\"'`~!@#$%^&+=<>?-]/g, ' '))
        .join(' ')
        .split(/\s+/)
        .forEach((part) => {
          const norm = normalizeAllergen(part);
          if (norm) results.add(norm);
        });
    };
    
    textCandidates.forEach((t) => pushTokens(t));
    return Array.from(results);
  };

  const fetchUserAllergens = async () => {
    try {
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('allergies')
          .eq('id', user.id)
          .maybeSingle();
        if (!error) {
          const text = data?.allergies || '';
          return parseAllergiesString(text);
        }
      }
    } catch {}
    
    try {
      const saved = JSON.parse(localStorage.getItem('onboardingData') || 'null');
      const text = saved?.allergies || '';
      return parseAllergiesString(text);
    } catch {
      return [];
    }
  };

  const parseAllergiesString = (text) => {
    if (!text) return [];
    const t = String(text).trim();
    if (!t || t.toLowerCase() === 'none') return [];
    return t.split(',').map((s) => normalizeAllergen(s)).filter(Boolean);
  };

  const matchAllergens = (userList, productList) => {
    if (!Array.isArray(userList) || !Array.isArray(productList)) return [];
    const matches = new Set();
    userList.forEach((ua) => {
      productList.forEach((pa) => {
        if (!ua || !pa) return;
        if (ua === pa || ua.includes(pa) || pa.includes(ua)) {
          matches.add(pa);
        }
      });
    });
    return Array.from(matches);
  };

  const dedupeWarnings = (arr) => {
    const seen = new Set();
    const result = [];
    for (const w of arr) {
      const key = String(w).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(w);
      }
    }
    return result;
  };

  const handleManualSubmit = async () => {
    const value = (manualBarcode || '').trim();
    if (!value) return;
    setScannedBarcode(value);
    setBarcodeType('MANUAL');
    await processBarcodeData(value, 'MANUAL');
  };

  const goToProductDetails = () => {
    if (!productData) return;
    try {
      sessionStorage.setItem('lastProduct', JSON.stringify(productData));
      sessionStorage.setItem('lastWarnings', JSON.stringify(analysisWarnings || []));
      router.push('/products');
    } catch (e) {
      console.error('Navigation error:', e);
      alert('Unable to open full product details.');
    }
  };

  const getWarningIcon = (warning) => {
    if (warning.toLowerCase().includes('allergen') || warning.toLowerCase().includes('allergy')) {
      return <AlertTriangle className="text-red-500" size={16} />;
    } else if (warning.toLowerCase().includes('high') || warning.toLowerCase().includes('excess')) {
      return <Info className="text-orange-500" size={16} />;
    }
    return <Info className="text-blue-500" size={16} />;
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell title="Scanner App">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-12 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                Welcome, <span className="text-blue-600 dark:text-blue-400">{userName}</span>!
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Scan product barcodes to get detailed nutritional information and personalized health analysis.
              </p>
            </div>

            {/* Scanner Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-10 transition-all duration-300 hover:shadow-2xl">
              <div className="p-6 md:p-8">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
                    <Scan className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Barcode Scanner</h3>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  Open the camera and place the barcode inside the frame. Detection starts automatically.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <button
                    onClick={handleOpenScanner}
                    disabled={processingBarcode}
                    className="flex-1 flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <Scan className="mr-2" size={20} />
                    {processingBarcode ? 'Processing...' : 'Open Scanner'}
                  </button>
                </div>
                
                {/* Manual Barcode Input */}
                <div className="mt-8">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Or enter barcode number manually
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                      placeholder="e.g. 8901234567890"
                    />
                    <button
                      onClick={handleManualSubmit}
                      disabled={processingBarcode || !manualBarcode.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {scannedBarcode && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-10">
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Scan Results</h3>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium">
                      {barcodeType}
                    </span>
                  </div>
                  
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Scanned Barcode</p>
                    <p className="font-mono text-lg text-gray-900 dark:text-white break-all">{scannedBarcode}</p>
                  </div>
                  
                  {processingBarcode && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                      <span className="text-gray-600 dark:text-gray-300">Fetching product information...</span>
                    </div>
                  )}
                  
                  {productData && (
                    <div className="mb-8">
                      <div className="flex items-center mb-6">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                          <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Product Information</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Product Name</p>
                            <p className="font-medium text-gray-900 dark:text-white">{productData.product_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Brand</p>
                            <p className="font-medium text-gray-900 dark:text-white">{productData.brands || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
                            <p className="font-medium text-gray-900 dark:text-white">{productData.quantity || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Categories</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {Array.isArray(productData.categories) ? productData.categories.join(', ') : productData.categories || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nutrition</p>
                            <div className="text-sm text-gray-900 dark:text-white space-y-1">
                              {productData.nutriments && (
                                <>
                                  <p>Energy: {productData.nutriments.energy_100g || 'N/A'} kJ</p>
                                  <p>Fat: {productData.nutriments.fat_100g || 'N/A'} g</p>
                                  <p>Carbs: {productData.nutriments.carbohydrates_100g || 'N/A'} g</p>
                                  <p>Protein: {productData.nutriments.proteins_100g || 'N/A'} g</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={goToProductDetails} 
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        View Full Details
                      </button>
                    </div>
                  )}
                  
                  {analysisWarnings && analysisWarnings.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-3">
                          <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />
                        </div>
                        <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Health Analysis</h4>
                      </div>
                      
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-5">
                        <div className="space-y-3">
                          {analysisWarnings.map((warning, index) => (
                            <div key={index} className="flex items-start space-x-3">
                              <div className="mt-0.5">
                                {getWarningIcon(warning)}
                              </div>
                              <span className="text-gray-700 dark:text-gray-300">{warning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {productError && (
                    <div>
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
                          <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
                        </div>
                        <h4 className="text-lg font-semibold text-red-800 dark:text-red-200">Error</h4>
                      </div>
                      
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
                        <p className="text-red-700 dark:text-red-300">{productError}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scanner Modal */}
        {showBarcodeScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl max-w-md w-full">
              <div className="relative">
                <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Barcode Scanner</h3>
                  <button 
                    onClick={() => { setShowBarcodeScanner(false); stopScanner(); }} 
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="relative w-full" style={{ height: '350px' }}>
                  <div id={readerIdRef.current} className="w-full h-full bg-black" />
                  
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-56 h-56 border-2 border-white rounded-lg relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    <p className="text-white text-sm bg-black bg-opacity-70 px-4 py-2 rounded-full">
                      Place the barcode within the frame to auto-scan
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
};

export default NextjsScannerApp;