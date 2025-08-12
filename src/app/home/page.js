"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Scan, X, Menu, User, Settings, Home, BarChart3, Moon, Sun, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';

const NextjsScannerApp = () => {
  // App state
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Router
  const router = useRouter();
  
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
  const sidebarRef = useRef(null);
  
  // Handle clicks outside sidebar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && sidebarOpen) {
        const menuButton = document.querySelector('[data-testid="menu-button"]');
        if (menuButton && !menuButton.contains(event.target)) {
          setSidebarOpen(false);
        }
      }
    };
    
    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [sidebarOpen]);
  
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
            video: {
              facingMode: 'environment'
            }
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
      
      // For demonstration, using a sample barcode - in real implementation, you'd use barcode detection
      const simulatedBarcode = Math.floor(Math.random() * 9000000000000) + 1000000000000;
      handleBarcodeScanned(simulatedBarcode.toString());
    }
    
    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };
  
  // Stop camera stream
  const stopCameraStream = () => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
  };
  
  // Handle barcode scanning
  const handleBarcodeScanned = (data) => {
    setScannedBarcode(data);
    setBarcodeType('EAN-13'); // Assuming EAN-13 for this example
    
    // Stop camera stream
    stopCameraStream();
    setShowBarcodeScanner(false);
    
    // Automatically process the barcode data
    processBarcodeData(data, 'EAN-13');
  };
  
  // Process barcode data - integrated with your backend API
  const processBarcodeData = async (data, type) => {
    setProcessingBarcode(true);
    setProductData(null);
    setProductError(null);
    setAnalysisWarnings([]);
    
    try {
      // Fetch product data from your backend API
      const apiUrl = `https://testdeploy-kgh0.onrender.com/product/${data}`;
      console.log(`Fetching from: ${apiUrl}`);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Product not found in database");
        }
        throw new Error(`Error: ${response.status}`);
      }

      const productData = await response.json();
      setProductData(productData);
      console.log("Product data received:", productData);

      // Analyze the product data for health warnings
      const analyzeResponse = await fetch('https://testdeploy-kgh0.onrender.com/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: productData,
          profile: {
            id: "user123",
            allergies: [],
            diseases: [],
          }
        }),
      });

      if (!analyzeResponse.ok) {
        throw new Error(`Analysis error: ${analyzeResponse.status}`);
      }

      const analysisResult = await analyzeResponse.json();
      console.log("Analysis result:", analysisResult);
      
      // Set the warnings from the analysis
      if (analysisResult.warnings && Array.isArray(analysisResult.warnings)) {
        setAnalysisWarnings(analysisResult.warnings);
      }

    } catch (error) {
      console.error("Error fetching product data:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setProductError(errorMessage);
      
      // Show user-friendly error message
      alert(`Could not find product information: ${errorMessage}`);
    } finally {
      setProcessingBarcode(false);
    }
  };
  
  // Close barcode scanner
  const closeBarcodeScanner = () => {
    setShowBarcodeScanner(false);
    stopCameraStream();
  };
  
  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Handle sidebar item click - navigate and/or trigger actions
  const handleSidebarItemClick = (item) => {
    setSidebarOpen(false);
    if (item === 'dashboard') {
      router.push('/home');
      return;
    }
    if (item === 'scanner') {
      // Open scanner modal directly
      handleCameraCapture();
      return;
    }
    if (item === 'onboarding') {
      router.push('/home/onboarding');
      return;
    }
    if (item === 'settings') {
      router.push('/home/settings');
      return;
    }
  };
  
  // Handle manual barcode entry
  const handleManualBarcodeEntry = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      handleBarcodeScanned(e.target.value);
      closeBarcodeScanner();
    }
  };
  
  // Get warning icon based on warning type
  const getWarningIcon = (warning) => {
    if (warning.toLowerCase().includes('allergen') || warning.toLowerCase().includes('allergy')) {
      return <AlertTriangle className="text-red-500" size={16} />;
    } else if (warning.toLowerCase().includes('high') || warning.toLowerCase().includes('excess')) {
      return <Info className="text-orange-500" size={16} />;
    }
    return <Info className="text-blue-500" size={16} />;
  };
  
  // Loading screen
  if (loading) {
    return (
      <div className={"min-h-screen flex items-center justify-center " + (darkMode ? 'bg-gray-900' : 'bg-gray-50')}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        {/* Content starts here - Navbar removed */}
        
        {/* Sidebar */}
        <nav className={`border-b px-4 py-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleSidebar}
                data-testid="menu-button"
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-semibold">Scanner App</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  <User size={18} />
                </div>
                <span className="font-medium">{userName}</span>
              </div>
            </div>
          </div>
        </nav>
        
        {/* Sidebar */}
        <div className="relative">
          {/* Sidebar overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={toggleSidebar}
            ></div>
          )}
          
          {/* Sidebar content */}
          <div 
            ref={sidebarRef}
            className={(sidebarOpen ? 'translate-x-0' : '-translate-x-full') + " fixed inset-y-0 left-0 z-50 w-80 " + (darkMode ? 'bg-gray-800' : 'bg-white') + " border-r " + (darkMode ? 'border-gray-700' : 'border-gray-200') + " transform transition-transform duration-300 ease-in-out"}
          >
            <div className={"flex items-center justify-between p-4 border-b " + (darkMode ? 'border-gray-700' : 'border-gray-200')}>
              <h2 className="text-lg font-semibold">Navigation</h2>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => handleSidebarItemClick('dashboard')}
                    className={"w-full flex items-center space-x-3 px-3 py-2 rounded-lg " + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}
                  >
                    <Home size={20} />
                    <span>Dashboard</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleSidebarItemClick('scanner')}
                    className={"w-full flex items-center space-x-3 px-3 py-2 rounded-lg " + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}
                  >
                    <Camera size={20} />
                    <span>Scanner</span>
                  </button>
                </li>
                <li>
                 <button
              onClick={() => handleSidebarItemClick('onboarding')}
               className={"w-full flex items-center space-x-3 px-3 py-2 rounded-lg " +(darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100') }
               >
              <BarChart3 size={20} />
              <span className="text-sm">Onboarding</span>     
              </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleSidebarItemClick('settings')}
                    className={"w-full flex items-center space-x-3 px-3 py-2 rounded-lg " + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}
                  >
                    <Settings size={20} />
                    <span>Settings</span>
                  </button>
                </li>
              </ul>
              
              {/* App Info */}
              <div className={"mt-8 p-4 rounded-lg " + (darkMode ? 'bg-gray-700' : 'bg-gray-100')}>
                <h3 className="font-medium mb-2">Scanner App</h3>
                <p className="text-sm opacity-75">Version 1.0.0</p>
                <p className="text-sm opacity-75">© 2024 Scanner Inc.</p>
              </div>
            </div>
          </div>
        </div>
        {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Welcome, {userName}!</h2>
            <p className="opacity-75">Scan product barcodes to get detailed nutritional information and health analysis.</p>
          </div>
          
          <div className="space-y-8">
            {/* Barcode Scanner Section */}
            <div className={"p-6 rounded-lg " + (darkMode ? 'bg-gray-800' : 'bg-white') + " shadow-lg"}>
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
                <div className={"p-4 rounded-lg " + (darkMode ? 'bg-gray-700' : 'bg-gray-100') + " mb-4"}>
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
                    <div className={"p-4 rounded-lg " + (darkMode ? 'bg-gray-600' : 'bg-gray-200') + " mb-4"}>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <CheckCircle className="text-green-500 mr-2" size={18} />
                        Product Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><span className="font-medium">Name:</span> {productData.product_name || 'N/A'}</p>
                          <p><span className="font-medium">Brand:</span> {productData.brands || 'N/A'}</p>
                          <p><span className="font-medium">Quantity:</span> {productData.quantity || 'N/A'}</p>
                          <p><span className="font-medium">Categories:</span> {
                            Array.isArray(productData.categories) 
                              ? productData.categories.join(', ') 
                              : productData.categories || 'N/A'
                          }</p>
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
                      
                      {productData.ingredients_text && (
                        <div className="mt-3">
                          <p className="font-medium">Ingredients:</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{productData.ingredients_text}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Health Analysis Warnings */}
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
      </div>
      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={(darkMode ? 'bg-gray-800' : 'bg-white') + " rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4"}>
            <div className="relative">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Barcode Scanner</h3>
                <button
                  onClick={closeBarcodeScanner}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative w-full" style={{ height: '300px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
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
                  <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-2 rounded-lg">
                    Position barcode within the frame
                  </p>
                </div>
              </div>
              
              <div className="p-4 text-center space-y-3">
                <button
                  onClick={captureImage}
                  className="bg-blue-500 px-4 py-2 text-white rounded-lg hover:bg-blue-600 w-full"
                >
                  <Camera className="inline mr-2" size={18} />
                  Capture & Scan
                </button>
                
                <div className="flex items-center">
                  <hr className="flex-grow border-gray-300 dark:border-gray-600" />
                  <span className="px-3 text-sm text-gray-500 dark:text-gray-400">OR</span>
                  <hr className="flex-grow border-gray-300 dark:border-gray-600" />
                </div>
                
                <input
                  type="text"
                  placeholder="Enter barcode number manually"
                  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white w-full"
                  onKeyPress={handleManualBarcodeEntry}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </ProtectedRoute>
  );
};

export default NextjsScannerApp;