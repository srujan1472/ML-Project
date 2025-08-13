"use client";
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import styles from './ProductDetails.module.css';

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

  // Load from sessionStorage only
  useEffect(() => {
    try {
      const cachedProd = sessionStorage.getItem('lastProduct');
      const cachedWarn = sessionStorage.getItem('lastWarnings');
      if (cachedProd) setProduct(JSON.parse(cachedProd));
      if (cachedWarn) setWarnings(JSON.parse(cachedWarn));
    } catch {}
  }, []);

  const nutrimentEntries = useMemo(() => {
    const nutriments = product?.nutriments || {};
    return Object.entries(nutriments)
      .filter(([key]) => /(_100g$)|(^energy$|^fat$|carbohydrates|proteins|sugars|salt|sodium|fiber)/i.test(key))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [product]);

  const basicName = product.product_name || product.product_name_en || product.product_name_hi || 'Unknown Product';
  const productId = product._id || product.id || product.code || 'N/A';

  return (
    <div className={styles.container}>
      <div className={styles.scroll}>
        <div className={styles.headerRow}>
          <h1 className={styles.header}>{basicName}</h1>
          <div className={styles.actionsRow}>
            <button className={styles.backButton} onClick={() => router.back()}>
              ← Back
            </button>
          </div>
        </div>

        <div className={styles.sectionGrid}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Overview</h3>
            <div className={styles.cardBody}>
              <p className={styles.text}><span className={styles.labelInline}>Product ID:</span> {productId}</p>
              <p className={styles.text}><span className={styles.labelInline}>Brands:</span> {product.brands || (product.brands_tags || []).join(', ') || 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Quantity:</span> {product.quantity || `${product.product_quantity || 'N/A'} ${product.product_quantity_unit || ''}`}</p>
              <p className={styles.text}><span className={styles.labelInline}>Countries:</span> {product.countries || (product.countries_tags || []).map(formatTag).join(', ') || 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Categories:</span> {product.categories || product.categories_old || (product.categories_tags || []).map(formatTag).join(', ') || 'N/A'}</p>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Ingredients & Allergens</h3>
            <div className={styles.cardBody}>
              <p className={styles.text}><span className={styles.labelInline}>Ingredients:</span> {product.ingredients_text || product.ingredients_text_debug || 'Not available'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Allergens:</span> {product.allergens || product.allergens_from_user || product.allergens_from_ingredients || (product.allergens_tags || []).join(', ') || 'None'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Traces:</span> {product.traces || product.traces_from_user || product.traces_from_ingredients || (product.traces_tags || []).join(', ') || 'None'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Palm Oil (may be):</span> {(product.ingredients_that_may_be_from_palm_oil_tags || []).map(formatTag).join(', ') || 'None'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Palm Oil (from):</span> {(product.ingredients_from_palm_oil_tags || []).map(formatTag).join(', ') || 'None'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Additives:</span> {(product.additives_tags || []).map(formatTag).join(', ') || 'None'}</p>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Nutriments</h3>
            <div className={styles.cardBody}>
              {nutrimentEntries.length > 0 ? (
                <div className={styles.nutritionContainer}>
                  {nutrimentEntries.map(([k, v]) => (
                    <p key={k} className={styles.text}>{formatTag(k)}: {String(v)}</p>
                  ))}
                </div>
              ) : (
                <p className={styles.text}>{product.no_nutrition_data ? 'No nutrition data available' : 'N/A'}</p>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Scores</h3>
            <div className={styles.cardBody}>
              <p className={styles.text}><span className={styles.labelInline}>Nutri-Score Grade:</span> {product.nutriscore_grade?.toUpperCase() || product.nutrition_grade_fr?.toUpperCase() || 'Unknown'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Nutri-Score Version:</span> {product.nutriscore_version || 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>NOVA Group:</span> {product.nova_group || product.nova_group_debug || (product.nova_groups_tags || []).join(', ') || product.nova_group_error || 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Ecoscore Grade:</span> {product.ecoscore_grade?.toUpperCase() || 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Ecoscore Score:</span> {product.ecoscore_score || 'N/A'}</p>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Packaging</h3>
            <div className={styles.cardBody}>
              <p className={styles.text}><span className={styles.labelInline}>Packaging:</span> {product.packaging || (product.packagings && product.packagings.length > 0 ? JSON.stringify(product.packagings, null, 2) : 'N/A')}</p>
              <p className={styles.text}><span className={styles.labelInline}>Materials:</span> {(product.packaging_materials_tags || []).join(', ') || (product.packagings_materials && Object.keys(product.packagings_materials).length > 0 ? JSON.stringify(product.packagings_materials, null, 2) : 'N/A')}</p>
              <p className={styles.text}><span className={styles.labelInline}>Shapes:</span> {(product.packaging_shapes_tags || []).join(', ') || 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Recycling:</span> {(product.packaging_recycling_tags || []).join(', ') || 'N/A'}</p>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Meta</h3>
            <div className={styles.cardBody}>
              <p className={styles.text}><span className={styles.labelInline}>Labels:</span> {(product.labels_tags || []).map(formatTag).join(', ') || 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Origins:</span> {product.origins || (product.origins_tags || []).map(formatTag).join(', ') || 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Stores:</span> {product.stores || (product.stores_tags || []).join(', ') || 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Product Type:</span> {product.product_type || 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Languages:</span> {(product.languages_tags || []).join(', ') || (product.languages_codes ? Object.keys(product.languages_codes).join(', ') : 'N/A')}</p>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Dates</h3>
            <div className={styles.cardBody}>
              <p className={styles.text}><span className={styles.labelInline}>Created:</span> {product.created_t ? new Date(product.created_t * 1000).toLocaleDateString() : 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Last Modified:</span> {product.last_modified_t ? new Date(product.last_modified_t * 1000).toLocaleDateString() : 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Last Updated:</span> {product.last_updated_t ? new Date(product.last_updated_t * 1000).toLocaleDateString() : 'N/A'}</p>
              <p className={styles.text}><span className={styles.labelInline}>Last Image:</span> {product.last_image_t ? new Date(product.last_image_t * 1000).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>

          {/* Contributors & Stats section removed as requested */}

          {warnings && warnings.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Health & Safety Warnings</h3>
              <div className={styles.cardBody}>
                {warnings.map((w, i) => (
                  <p key={`custom-${i}`} className={`${styles.text} ${styles.warning}`}>⚠️ {w}</p>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON fallback */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Raw Product JSON</h3>
            <div className={styles.cardBody}>
              <pre className={styles.raw}>{JSON.stringify(product, null, 2)}</pre>
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
        <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
          <ProductDetailsContent />
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}