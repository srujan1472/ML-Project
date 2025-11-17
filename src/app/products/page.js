"use client";
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
export const dynamic = 'force-dynamic';

function safeParse(param) {
  if (!param) return null;
  try {
    return JSON.parse(decodeURIComponent(param));
  } catch {
    try {
      return JSON.parse(param);
    } catch {
      return null;
    }
  }
}

function formatTag(tag = '') {
  return String(tag).replace(/^en:/, '').replace(/-/g, ' ');
}

function ProductDetailsContent() {
  const router = useRouter();
  const [product, setProduct] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Load from sessionStorage only
  useEffect(() => {
    console.log('Loading effect started, isLoading:', isLoading);
    
    // Set a timeout to force loading to false if it gets stuck
    const timeoutId = setTimeout(() => {
      console.log('Timeout reached, forcing isLoading to false');
      setIsLoading(false);
    }, 3000);
    
    try {
      const cachedProd = sessionStorage.getItem('lastProduct');
      const cachedWarn = sessionStorage.getItem('lastWarnings');
      
      console.log('SessionStorage data:', { cachedProd: !!cachedProd, cachedWarn: !!cachedWarn });
      
      if (cachedProd) {
        const productData = JSON.parse(cachedProd);
        setProduct(productData);
        console.log('Loaded product from sessionStorage:', productData);
      } else {
        console.log('No product data found in sessionStorage');
      }
      
      if (cachedWarn) {
        const warningData = JSON.parse(cachedWarn);
        setWarnings(warningData);
        console.log('Loaded warnings from sessionStorage:', warningData);
      } else {
        console.log('No warnings data found in sessionStorage');
      }
      
      // Always set loading to false after attempting to load data
      console.log('Setting isLoading to false');
      setIsLoading(false);
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error loading from sessionStorage:', error);
      setIsLoading(false);
      clearTimeout(timeoutId);
    }
  }, []);

  // Recompute warnings based on user allergies and product ingredients/tags
  useEffect(() => {
    let isCancelled = false;
    const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const normalize = (str) => String(str || '').toLowerCase();

    // Calculate similarity percentage between two strings
    const calculateSimilarity = (str1, str2) => {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      if (longer.length === 0) return 1.0;
      
      const editDistance = levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    };

    // Levenshtein distance for similarity calculation
    const levenshteinDistance = (str1, str2) => {
      const matrix = [];
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[str2.length][str1.length];
    };

    const computeWarnings = async () => {
      try {
        if (!product || Object.keys(product).length === 0) return;
        
        // 1) Load user allergens (DB first, then onboarding/local)
        let profileAllergens = '';
        if (user) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('allergies')
              .eq('id', user.id)
              .maybeSingle();
            profileAllergens = data?.allergies || '';
          } catch {}
        }
        if (!profileAllergens) {
          try {
            const saved = JSON.parse(localStorage.getItem('onboardingData') || 'null');
            profileAllergens = saved?.allergies || '';
          } catch {}
        }
        
        const allergenTerms = String(profileAllergens)
          .split(/[\n,;|]+/)
          .map((t) => t.trim())
           .filter(Boolean)
           .filter(term => term.length >= 3) // Filter out very short terms
           .filter(term => /^[a-zA-Z\s]+$/.test(term)) // Only allow letters and spaces
           .filter(term => term.split(/\s+/).every(word => word.length >= 3)); // Each word must be at least 3 chars
          
        if (allergenTerms.length === 0) {
          // No user-specified allergens; clear computed warnings
          if (!isCancelled) {
            setWarnings([]);
          }
          return;
        }
        
        // 2) Build comprehensive haystack from product ingredients and tags
        const ingredientsText = [
          product.ingredients_text,
          product.ingredients_text_debug,
          Array.isArray(product.ingredients) ? product.ingredients.map((i) => i?.text).join(' ') : '',
        ]
          .filter(Boolean)
          .join(' ');
          
        const tagsText = [
          ...(product.allergens_tags || []),
          ...(product.traces_tags || []),
        ]
          .map((t) => formatTag(t))
          .join(' ');
          
        const haystackRaw = `${ingredientsText} ${tagsText}`;
        const haystack = normalize(haystackRaw);
                 const haystackWords = haystack
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
           .trim()
           .split(' ')
           .filter(word => word.length >= 3) // Filter out very short words
           .filter(word => /^[a-zA-Z]+$/.test(word)) // Only allow pure letters (no numbers or special chars)
           .filter(word => !/^[aeiou]+$/i.test(word)); // Filter out words that are only vowels
          
        // 3) Intelligent matching with similarity threshold
        const matched = new Set();
        const SIMILARITY_THRESHOLD = 0.7; // 70% similarity threshold
        
        for (const term of allergenTerms) {
          const termLc = normalize(term);
           if (!termLc || termLc.length < 3) continue;
           
           // Additional validation: skip if term contains any single letters
           const termWordsCheck = termLc.split(/\s+/);
           if (termWordsCheck.some(word => word.length < 3)) continue;
          
          let bestMatch = null;
          let bestSimilarity = 0;
          
          // Strategy 1: Exact word match (highest priority)
          const termWords = termLc.split(/\s+/).filter(w => w.length >= 3);
          for (const word of termWords) {
            if (haystackWords.includes(word)) {
              bestMatch = term.trim();
              bestSimilarity = 1.0;
              break;
            }
          }
          
          if (bestSimilarity === 1.0) {
            matched.add(bestMatch);
            continue;
          }
          
          // Strategy 2: Phrase match
          const termSimple = termLc
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (termSimple && termSimple.length >= 3) {
            const haystackText = haystackWords.join(' ');
            if (haystackText.includes(termSimple)) {
              bestMatch = term.trim();
              bestSimilarity = 1.0;
            }
          }
          
          if (bestSimilarity === 1.0) {
            matched.add(bestMatch);
            continue;
          }
          
          // Strategy 3: Similarity-based matching for longer terms
          if (termLc.length >= 4) {
            for (const haystackWord of haystackWords) {
              if (haystackWord.length >= 4) {
                const similarity = calculateSimilarity(termLc, haystackWord);
                if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
                  bestSimilarity = similarity;
                  bestMatch = term.trim();
                }
              }
            }
          }
          
          // Strategy 4: Word boundary regex for medium-length terms
          if (termLc.length >= 4 && bestSimilarity < SIMILARITY_THRESHOLD) {
            try {
              const re = new RegExp(`\\b${escapeRegExp(termLc)}\\b`, 'i');
              if (re.test(haystack)) {
                bestMatch = term.trim();
                bestSimilarity = 1.0;
              }
          } catch {}
        }
        
          if (bestMatch && bestSimilarity >= SIMILARITY_THRESHOLD) {
            matched.add(bestMatch);
          }
        }
        
                 // Final validation: filter out any warnings that contain single letters
         const finalWarnings = Array.from(matched)
           .filter(term => {
             const words = term.split(/\s+/);
             return words.every(word => word.length >= 3);
           })
           .map((t) => `Contains allergen: ${t}`);
         
         console.log('Allergen matching results:', {
           userAllergens: allergenTerms,
           productIngredients: ingredientsText.substring(0, 200) + '...',
           productTags: tagsText,
           matchedAllergens: Array.from(matched),
           finalWarnings: finalWarnings
         });
         
        if (!isCancelled) {
            setWarnings(finalWarnings);
            try { sessionStorage.setItem('lastWarnings', JSON.stringify(finalWarnings)); } catch {}
        }
      } catch {}
    };
    
    computeWarnings();
    return () => { isCancelled = true; };
  }, [product, user]);

  const nutrimentEntries = useMemo(() => {
    const nutriments = product?.nutriments || {};
    return Object.entries(nutriments)
      .filter(([key]) => /(_100g$)|(^energy$|^fat$|carbohydrates|proteins|sugars|salt|sodium|fiber)/i.test(key))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [product]);

  const basicName = product.product_name || product.product_name_en || product.product_name_hi || 'Unknown Product';
  const productId = product._id || product.id || product.code || 'N/A';
  const brandChips = (product.brands_tags || (product.brands ? String(product.brands).split(',').map((b) => b.trim()) : [])).slice(0, 6);
  const allergenChips = (product.allergens_tags || [])
    .map(formatTag)
    .slice(0, 6);

  // Show loading state if still loading or no product data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Fetching product information...</p>
        </div>
      </div>
    );
  }

  // Show error state if no product data after loading
  if (!product || Object.keys(product).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Product Data</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">No product information found. Please scan a product first.</p>
          <button 
            onClick={() => router.push('/home')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
              {basicName}
            </h1>
            <button 
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
              onClick={() => router.back()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </button>
          </div>

          {/* Hero section with product information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-10">
            <div className="p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Product Information</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {brandChips.map((b) => (
                    <span 
                      key={`b-${b}`} 
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
                    >
                      {b}
                    </span>
                  ))}
                  {allergenChips.map((a) => (
                    <span 
                      key={`a-${a}`} 
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800"
                    >
                      {a}
                    </span>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product ID</h3>
                    <p className="text-base text-gray-900 dark:text-white">{productId}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</h3>
                    <p className="text-base text-gray-900 dark:text-white">
                      {product.quantity || `${product.product_quantity || 'N/A'} ${product.product_quantity_unit || ''}`}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Brand</h3>
                    <p className="text-base text-gray-900 dark:text-white">
                      {product.brands || (product.brands_tags || []).join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6 h-full">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overview</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Brands</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.brands || (product.brands_tags || []).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Countries</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.countries || (product.countries_tags || []).map(formatTag).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Categories</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.categories || product.categories_old || (product.categories_tags || []).map(formatTag).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6 h-full">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ingredients & Allergens</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Ingredients</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.ingredients_text || product.ingredients_text_debug || 'Not available'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Allergens</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.allergens || product.allergens_from_user || product.allergens_from_ingredients || (product.allergens_tags || []).join(', ') || 'None'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Traces</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.traces || product.traces_from_user || product.traces_from_ingredients || (product.traces_tags || []).join(', ') || 'None'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Additives</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {(product.additives_tags || []).map(formatTag).join(', ') || 'None'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Health & Safety Section - Always Visible */}
              <div className="lg:col-span-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6 h-full">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Health & Safety</h3>
                  </div>
                  <div className="p-6">
                  <div className="space-y-4">
                    {/* Allergen Warnings */}
                    {warnings && warnings.length > 0 ? (
                      <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                        <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-3 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Allergen Warnings
                        </h4>
                        <div className="flex flex-wrap gap-2">
                      {warnings.map((w, i) => (
                        <span 
                          key={`custom-${i}`} 
                              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                        <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          No Allergen Warnings
                        </h4>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          No allergens detected based on your profile. Update your allergies in settings for personalized warnings.
                        </p>
              </div>
            )}
                    
                    {/* Health Scores */}
                    <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Health Indicators</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Nutri-Score</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {product.nutriscore_grade?.toUpperCase() || product.nutrition_grade_fr?.toUpperCase() || 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400">NOVA Group</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {product.nova_group || product.nova_group_debug || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Safety Information */}
                    <div className="p-4 rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
                      <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">Safety Information</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Contains Additives:</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {(product.additives_tags || []).length > 0 ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Contains Traces:</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {(product.traces_tags || []).length > 0 ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Organic:</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {(product.labels_tags || []).some(label => label.includes('organic')) ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6 h-full">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scores</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nutri-Score Grade</h4>
                      <p className="text-2xl text-gray-900 dark:text-white font-bold">
                        {product.nutriscore_grade?.toUpperCase() || product.nutrition_grade_fr?.toUpperCase() || 'Unknown'}
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NOVA Group</h4>
                      <p className="text-2xl text-gray-900 dark:text-white font-bold">
                        {product.nova_group || product.nova_group_debug || (product.nova_groups_tags || []).join(', ') || product.nova_group_error || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ecoscore Grade</h4>
                      <p className="text-2xl text-gray-900 dark:text-white font-bold">
                        {product.ecoscore_grade?.toUpperCase() || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ecoscore Score</h4>
                      <p className="text-2xl text-gray-900 dark:text-white font-bold">
                        {product.ecoscore_score || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nutri-Score Section */}
            <div className="lg:col-span-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nutri-Score</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Nutrition Grade</h4>
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white font-bold text-3xl shadow-lg">
                          {product.nutriscore_grade?.toUpperCase() || product.nutrition_grade_fr?.toUpperCase() || 'N/A'}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {product.nutriscore_grade || product.nutrition_grade_fr ? 
                          `This product has a ${product.nutriscore_grade?.toUpperCase() || product.nutrition_grade_fr?.toUpperCase()} nutrition grade` : 
                          'Nutrition grade not available'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>



            {/* Nutri-Score Data Section */}
            <div className="lg:col-span-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nutri-Score Data</h3>
                </div>
                <div className="p-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Grade</h4>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(product.nutriscore_data?.grade || product.nutriscore_grade || product.nutrition_grade_fr || 'N/A').toUpperCase()}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Total Score</h4>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {product.nutriscore_data?.score || product.nutriscore_score || product.nutrition_score_fr || 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Negative Points</h4>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {product.nutriscore_data?.negative_points || 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Positive Points</h4>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {product.nutriscore_data?.positive_points || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Product Type Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Beverage</h4>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.nutriscore_data?.is_beverage ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Water</h4>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.nutriscore_data?.is_water ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Cheese</h4>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.nutriscore_data?.is_cheese ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Fat/Oil/Nuts</h4>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.nutriscore_data?.is_fat_oil_nuts_seeds ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Red Meat</h4>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.nutriscore_data?.is_red_meat_product ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Count Proteins</h4>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.nutriscore_data?.count_proteins ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>

                  {/* Negative Components */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-4">Negative Components</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(product.nutriscore_data?.components?.negative || []).map((component, index) => (
                        <div key={index} className="p-4 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                            {component.id?.replace(/_/g, ' ')}
                          </h5>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Value:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {component.value !== null && component.value !== undefined ? `${component.value} ${component.unit || ''}` : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Points:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {component.points}/{component.points_max}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Positive Components */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-4">Positive Components</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(product.nutriscore_data?.components?.positive || []).map((component, index) => (
                        <div key={index} className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                            {component.id?.replace(/_/g, ' ')}
                          </h5>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Value:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {component.value !== null && component.value !== undefined ? `${component.value} ${component.unit || ''}` : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Points:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {component.points}/{component.points_max}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Protein Count Reason</h4>
                      <p className="text-gray-900 dark:text-white font-medium capitalize">
                        {product.nutriscore_data?.count_proteins_reason || 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Positive Nutrients</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.nutriscore_data?.positive_nutrients?.join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nutrient Levels Section */}
            <div className="lg:col-span-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nutrient Levels</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Salt</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.nutrient_levels?.salt === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                        product.nutrient_levels?.salt === 'moderate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' :
                        product.nutrient_levels?.salt === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {product.nutrient_levels?.salt?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                    <div className="p-4 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Saturated Fat</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.nutrient_levels?.['saturated-fat'] === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                        product.nutrient_levels?.['saturated-fat'] === 'moderate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' :
                        product.nutrient_levels?.['saturated-fat'] === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {product.nutrient_levels?.['saturated-fat']?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                    <div className="p-4 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Sugars</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.nutrient_levels?.sugars === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                        product.nutrient_levels?.sugars === 'moderate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' :
                        product.nutrient_levels?.sugars === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {product.nutrient_levels?.sugars?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                    <div className="p-4 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Fat</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.nutrient_levels?.fat === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                        product.nutrient_levels?.fat === 'moderate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' :
                        product.nutrient_levels?.fat === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {product.nutrient_levels?.fat?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nutriments</h3>
                </div>
                <div className="p-6">
                  {nutrimentEntries.length > 0 ? (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border-l-4 border-amber-500">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        {nutrimentEntries.map(([k, v]) => (
                          <div key={k} className="p-4 rounded-md bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow min-w-0">
                            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-100 mb-2 break-words">
                              {formatTag(k)}
                            </h4>
                            <p className="text-sm text-black dark:text-white font-medium break-words overflow-wrap-anywhere">
                              {String(v)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium">
                      {product.no_nutrition_data ? 'No nutrition data available' : 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6 h-full">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-teal-50 dark:bg-teal-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Packaging</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Packaging</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.packaging || (product.packagings && product.packagings.length > 0 ? JSON.stringify(product.packagings, null, 2) : 'N/A')}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Materials</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {(product.packaging_materials_tags || []).join(', ') || (product.packagings_materials && Object.keys(product.packagings_materials).length > 0 ? JSON.stringify(product.packagings_materials, null, 2) : 'N/A')}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Recycling</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {(product.packaging_recycling_tags || []).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6 h-full">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meta</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Labels</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {(product.labels_tags || []).map(formatTag).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Origins</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.origins || (product.origins_tags || []).map(formatTag).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Stores</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.stores || (product.stores_tags || []).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Product Type</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.product_type || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dates</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Created</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.created_t ? new Date(product.created_t * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Last Modified</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.last_modified_t ? new Date(product.last_modified_t * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Last Updated</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.last_updated_t ? new Date(product.last_updated_t * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Last Image</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.last_image_t ? new Date(product.last_image_t * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

                           {/* Countries Section */}
              <div className="lg:col-span-12">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Countries</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Countries of Origin</h4>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {product.countries || (product.countries_tags || []).map(formatTag).join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Countries of Processing</h4>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {product.countries_processing_tags ? (product.countries_processing_tags || []).map(formatTag).join(', ') : 'N/A'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Countries of Sale</h4>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {product.countries_sale_tags ? (product.countries_sale_tags || []).map(formatTag).join(', ') : 'N/A'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Origins</h4>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {product.origins || (product.origins_tags || []).map(formatTag).join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Manufacturing Places</h4>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {product.manufacturing_places || (product.manufacturing_places_tags || []).map(formatTag).join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Purchase Places</h4>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {product.purchase_places || (product.purchase_places_tags || []).map(formatTag).join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>



             {/* Raw JSON fallback */}
            {/* <div className="lg:col-span-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/80">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Raw Product JSON</h3>
                </div>
                <div className="p-6">
                  <pre className="bg-gray-900 text-gray-100 p-5 rounded-lg overflow-auto text-sm leading-relaxed max-h-[420px] border border-gray-800 shadow-inner">
                    {JSON.stringify(product, null, 2)}
                  </pre>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
  
export default function ProductDetailsPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Product Details">
          <ProductDetailsContent />
      </AppShell>
    </ProtectedRoute>
  );
}