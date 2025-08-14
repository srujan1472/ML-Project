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
  const { user } = useAuth();

  // Load from sessionStorage only
  useEffect(() => {
    try {
      const cachedProd = sessionStorage.getItem('lastProduct');
      const cachedWarn = sessionStorage.getItem('lastWarnings');
      if (cachedProd) setProduct(JSON.parse(cachedProd));
      if (cachedWarn) setWarnings(JSON.parse(cachedWarn));
    } catch {}
  }, []);

  // Recompute warnings based on user allergies and product ingredients/tags
  useEffect(() => {
    let isCancelled = false;
    const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const normalize = (str) => String(str || '')
      .toLowerCase();

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
          .filter(Boolean);
          
        if (allergenTerms.length === 0) {
          // No user-specified allergens; clear computed warnings
          if (!isCancelled) {
            setWarnings((prev) => prev);
          }
          return;
        }
        
        // 2) Build haystack from product ingredients and tags
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
        const haystackSimple = haystack
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
          
        // 3) Match case-insensitively with word boundaries-ish (simple token approach)
        const matched = new Set();
        for (const term of allergenTerms) {
          const termLc = normalize(term);
          if (!termLc) continue;
          const termSimple = termLc
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (!termSimple) continue;
          
          // exact token or phrase match in simplified haystack
          if (haystackSimple.includes(termSimple)) {
            matched.add(term.trim());
            continue;
          }
          
          // fallback regex with non-letter boundaries
          try {
            const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(termLc)}([^a-z0-9]|$)`, 'i');
            if (re.test(haystack)) matched.add(term.trim());
          } catch {}
        }
        
        const newWarnings = Array.from(matched).map((t) => `Contains allergen: ${t}`);
        if (!isCancelled) {
          setWarnings(newWarnings);
          try { sessionStorage.setItem('lastWarnings', JSON.stringify(newWarnings)); } catch {}
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
  const productImage = product.image_front_small_url || product.image_small_url || product.image_url || '';
  const brandChips = (product.brands_tags || (product.brands ? String(product.brands).split(',').map((b) => b.trim()) : [])).slice(0, 6);
  const allergenChips = (product.allergens_tags || [])
    .map(formatTag)
    .slice(0, 6);

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

          {/* Hero section with image and quick chips */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-10">
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
              {productImage ? (
                <div className="flex-shrink-0 mx-auto md:mx-0">
                  <img 
                    src={productImage} 
                    alt={basicName} 
                    className="w-48 h-48 md:w-64 md:h-64 object-contain rounded-xl bg-gray-100 dark:bg-gray-700" 
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-48 h-48 md:w-64 md:h-64 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold mx-auto md:mx-0">
                  No Image
                </div>
              )}
              
              <div className="flex-grow">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Product Information</h2>
                  <div className="flex flex-wrap gap-2">
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overview</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Brands</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.brands || (product.brands_tags || []).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Countries</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.countries || (product.countries_tags || []).map(formatTag).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Categories</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.categories || product.categories_old || (product.categories_tags || []).map(formatTag).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ingredients & Allergens</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ingredients</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.ingredients_text || product.ingredients_text_debug || 'Not available'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Allergens</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.allergens || product.allergens_from_user || product.allergens_from_ingredients || (product.allergens_tags || []).join(', ') || 'None'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Traces</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.traces || product.traces_from_user || product.traces_from_ingredients || (product.traces_tags || []).join(', ') || 'None'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Additives</h4>
                      <p className="text-gray-900 dark:text-white">
                        {(product.additives_tags || []).map(formatTag).join(', ') || 'None'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nutriments</h3>
                </div>
                <div className="p-6">
                  {nutrimentEntries.length > 0 ? (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {nutrimentEntries.map(([k, v]) => (
                          <div key={k}>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                              {formatTag(k)}
                            </h4>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {String(v)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {product.no_nutrition_data ? 'No nutrition data available' : 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scores</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Nutri-Score Grade</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.nutriscore_grade?.toUpperCase() || product.nutrition_grade_fr?.toUpperCase() || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">NOVA Group</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.nova_group || product.nova_group_debug || (product.nova_groups_tags || []).join(', ') || product.nova_group_error || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ecoscore Grade</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.ecoscore_grade?.toUpperCase() || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ecoscore Score</h4>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {product.ecoscore_score || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Packaging</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Packaging</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.packaging || (product.packagings && product.packagings.length > 0 ? JSON.stringify(product.packagings, null, 2) : 'N/A')}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Materials</h4>
                      <p className="text-gray-900 dark:text-white">
                        {(product.packaging_materials_tags || []).join(', ') || (product.packagings_materials && Object.keys(product.packagings_materials).length > 0 ? JSON.stringify(product.packagings_materials, null, 2) : 'N/A')}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Recycling</h4>
                      <p className="text-gray-900 dark:text-white">
                        {(product.packaging_recycling_tags || []).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meta</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Labels</h4>
                      <p className="text-gray-900 dark:text-white">
                        {(product.labels_tags || []).map(formatTag).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Origins</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.origins || (product.origins_tags || []).map(formatTag).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Stores</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.stores || (product.stores_tags || []).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product Type</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.product_type || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dates</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.created_t ? new Date(product.created_t * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Modified</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.last_modified_t ? new Date(product.last_modified_t * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Updated</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.last_updated_t ? new Date(product.last_updated_t * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Image</h4>
                      <p className="text-gray-900 dark:text-white">
                        {product.last_image_t ? new Date(product.last_image_t * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {warnings && warnings.length > 0 && (
              <div className="lg:col-span-12">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-md overflow-hidden mb-6 border border-red-100 dark:border-red-800">
                  <div className="px-6 py-4 border-b border-red-100 dark:border-red-800">
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Health & Safety Warnings</h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-3">
                      {warnings.map((w, i) => (
                        <span 
                          key={`custom-${i}`} 
                          className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Raw JSON fallback */}
            <div className="lg:col-span-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Raw Product JSON</h3>
                </div>
                <div className="p-6">
                  <pre className="bg-gray-900 text-gray-100 p-5 rounded-lg overflow-auto text-sm leading-relaxed max-h-[420px] border border-gray-800">
                    {JSON.stringify(product, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
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
        <Suspense fallback={<div className="text-center py-10 text-lg text-gray-600 dark:text-gray-400">Loading...</div>}>
          <ProductDetailsContent />
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}