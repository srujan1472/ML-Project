"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Scan, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

const NextjsScannerApp = () => {
  // App state
  const [loading, setLoading] = useState(false);
  
  // Get user from auth context
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || 'User';
  
  // Barcode scanner state
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [barcodeType, setBarcodeType] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [processingBarcode, setProcessingBarcode] = useState(false);
  const [productData, setProductData] = useState(null);
  const [productError, setProductError] = useState(null);
  const [analysisWarnings, setAnalysisWarnings] = useState([]);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const router = useRouter();

  // Check if camera is supported
  const checkCameraSupport = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return true;
    } else {
      alert('Camera access is not supported by your browser');
      return false;
    }
  };
  
  // Handle camera capture for barcode scanning
  const handleCameraCapture = async () => {
    try {
      if (!checkCameraSupport()) return;
      
      setShowBarcodeScanner(true);
      setScannedBarcode(null);
      setBarcodeType(null);
      setProductData(null);
      setProductError(null);
      setAnalysisWarnings([]);
      
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play();
            };
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setShowBarcodeScanner(false);
          if (error.name === 'NotAllowedError') {
            alert('Camera access denied. Please allow camera access to use the scanner.');
          } else if (error.name === 'NotFoundError') {
            alert('No camera found on your device.');
          } else if (error.name === 'NotSupportedError') {
            alert('Your browser does not support camera access or the requested camera mode.');
          } else {
            alert(`Camera error: ${error.message}`);
          }
        }
      }, 500);
    } catch (error) {
      console.error('Camera capture error:', error);
      alert('Failed to initialize camera');
      setShowBarcodeScanner(false);
    }
  };
  
  // Capture image from camera for barcode scanning
  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const stream = video?.srcObject;
    
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const simulatedBarcode = Math.floor(Math.random() * 9000000000000) + 1000000000000;
      handleBarcodeScanned(simulatedBarcode.toString());
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };
  
  const stopCameraStream = () => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
  };
  
  const handleBarcodeScanned = (data) => {
    setScannedBarcode(data);
    setBarcodeType('EAN-13');
    stopCameraStream();
    setShowBarcodeScanner(false);
    processBarcodeData(data, 'EAN-13');
  };
  
  const processBarcodeData = async (data, type) => {
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
      if (analysisResult.warnings && Array.isArray(analysisResult.warnings)) setAnalysisWarnings(analysisResult.warnings);
    } catch (error) {
      console.error('Error fetching product data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setProductError(errorMessage);
      alert(`Could not find product information: ${errorMessage}`);
    } finally {
      setProcessingBarcode(false);
    }
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
  
  const handleManualBarcodeEntry = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      handleBarcodeScanned(e.target.value);
      setShowBarcodeScanner(false);
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
              <p className="mb-4">Scan product barcodes to retrieve detailed nutritional information and health warnings.</p>
              <button
                onClick={handleCameraCapture}
                disabled={processingBarcode}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mb-6 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Scan className="mr-2" size={18} />
                {processingBarcode ? 'Processing...' : 'Scan Barcode'}
              </button>
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
                  <button onClick={() => { setShowBarcodeScanner(false); stopCameraStream(); }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="relative w-full" style={{ height: '300px' }}>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-2 rounded-lg">Position barcode within the frame</p>
                  </div>
                </div>
                <div className="p-4 text-center space-y-3">
                  <button onClick={captureImage} className="bg-blue-500 px-4 py-2 text-white rounded-lg hover:bg-blue-600 w-full">
                    <Camera className="inline mr-2" size={18} />
                    Capture & Scan
                  </button>
                  <div className="flex items-center">
                    <hr className="flex-grow border-gray-300 dark:border-gray-600" />
                    <span className="px-3 text-sm text-gray-500 dark:text-gray-400">OR</span>
                    <hr className="flex-grow border-gray-300 dark:border-gray-600" />
                  </div>
                  <input type="text" placeholder="Enter barcode number manually" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white w-full" onKeyPress={handleManualBarcodeEntry} />
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