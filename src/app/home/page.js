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

  const canvasRef = useRef(null); // kept for layout
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

      // Create or reuse a video element in the target container
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

      // Prefer back camera; fall back gracefully
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/browser');
      const reader = codeReaderRef.current;

      controlsRef.current = await BrowserMultiFormatReader.decodeFromConstraints(
        constraints,
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
            return;
          }
          if (err && !(err instanceof NotFoundException)) {
            // Non-NotFound errors can be logged if needed
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
        try { controlsRef.current?.stop?.(); } catch {}
        controlsRef.current = null;
        codeReaderRef.current = null;
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
    // give modal time to mount video element
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

      // Compute client-side allergen matches against user's saved allergies
      const userAllergens = await fetchUserAllergens();
      const productAllergens = extractProductAllergens(productData);
      const matchedAllergens = matchAllergens(userAllergens, productAllergens);

      const serverWarnings = Array.isArray(analysisResult.warnings) ? analysisResult.warnings : [];
      const allergenWarnings = matchedAllergens.map((a) => `Allergen alert: contains ${a}`);
      const combined = dedupeWarnings([...serverWarnings, ...allergenWarnings]);
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
      // Split by comma/semicolon and also handle tag format like 'en:milk'
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
          // Use product allergen token to display for clarity
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell title="Scanner App">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Welcome, {userName}!</h2>
            <p className="opacity-75">Scan product barcodes to get detailed nutritional information and health analysis.</p>
          </div>
          <div className="space-y-8">
            <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
              <div className="flex items-center mb-4">
                <Scan className="mr-2 text-green-500" size={20} />
                <h3 className="text-lg font-semibold">Barcode Scanner</h3>
              </div>
              <p className="mb-4">Open the camera and place the barcode inside the frame. Detection starts automatically.</p>
              <button
                onClick={handleOpenScanner}
                disabled={processingBarcode}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mb-6 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Scan className="mr-2" size={18} />
                {processingBarcode ? 'Processing...' : 'Open Scanner'}
              </button>
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">Or enter barcode number</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 8901234567890"
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={processingBarcode || !manualBarcode.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Search
                  </button>
                </div>
              </div>
              {scannedBarcode && (
                <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-700 mb-4">
                  <h3 className="font-semibold mb-2">Scanned Barcode:</h3>
                  <p className="text-sm mb-2">Type: {barcodeType}</p>
                  <p className="text-sm mb-4 font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">{scannedBarcode}</p>
                  {processingBarcode && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                      <span>Fetching product information...</span>
                    </div>
                  )}
                  {productData && (
                    <div className="p-4 rounded-lg bg-gray-200 dark:bg-gray-600 mb-4">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <CheckCircle className="text-green-500 mr-2" size={18} />
                        Product Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><span className="font-medium">Name:</span> {productData.product_name || 'N/A'}</p>
                          <p><span className="font-medium">Brand:</span> {productData.brands || 'N/A'}</p>
                          <p><span className="font-medium">Quantity:</span> {productData.quantity || 'N/A'}</p>
                          <p><span className="font-medium">Categories:</span> {Array.isArray(productData.categories) ? productData.categories.join(', ') : productData.categories || 'N/A'}</p>
                        </div>
                        <div>
                          {productData.nutriments && (
                            <>
                              <p><span className="font-medium">Energy:</span> {productData.nutriments.energy_100g || 'N/A'} kJ</p>
                              <p><span className="font-medium">Fat:</span> {productData.nutriments.fat_100g || 'N/A'} g</p>
                              <p><span className="font-medium">Carbs:</span> {productData.nutriments.carbohydrates_100g || 'N/A'} g</p>
                              <p><span className="font-medium">Protein:</span> {productData.nutriments.proteins_100g || 'N/A'} g</p>
                            </>
                          )}
                        </div>
                      </div>
                      <button onClick={goToProductDetails} className="mt-4 inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">View full details</button>
                    </div>
                  )}
                  {analysisWarnings && analysisWarnings.length > 0 && (
                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 mb-4">
                      <h4 className="font-semibold mb-3 flex items-center text-yellow-800 dark:text-yellow-200">
                        <AlertTriangle className="text-yellow-600 mr-2" size={18} />
                        Health Analysis
                      </h4>
                      <div className="space-y-2">
                        {analysisWarnings.map((warning, index) => (
                          <div key={index} className="flex items-start space-x-2 text-sm">
                            {getWarningIcon(warning)}
                            <span className="text-gray-700 dark:text-gray-300">{warning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {productError && (
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 mb-4">
                      <div className="flex items-center">
                        <AlertTriangle className="text-red-500 mr-2" size={18} />
                        <span className="text-red-700 dark:text-red-300 font-medium">Error</span>
                      </div>
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{productError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scanner Modal */}
        {showBarcodeScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={"bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4"}>
              <div className="relative">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Barcode Scanner</h3>
                  <button onClick={() => { setShowBarcodeScanner(false); stopScanner(); }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="relative w-full" style={{ height: '300px' }}>
                  <div id={readerIdRef.current} className="w-full h-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-2 rounded-lg">Place the barcode within the frame to auto-scan</p>
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