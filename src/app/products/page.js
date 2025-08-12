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
  const searchParams = useSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState({});
  const [warnings, setWarnings] = useState([]);

  // Load from URL or sessionStorage fallback
  useEffect(() => {
    let prod = safeParse(searchParams.get('product'));
    let warn = safeParse(searchParams.get('warnings')) || [];

    if (!prod) {
      try {
        const cachedProd = sessionStorage.getItem('lastProduct');
        const cachedWarn = sessionStorage.getItem('lastWarnings');
        if (cachedProd) prod = JSON.parse(cachedProd);
        if (cachedWarn) warn = JSON.parse(cachedWarn);
      } catch {}
    } else {
      // If provided via URL, cache for refresh/navigation
      try {
        sessionStorage.setItem('lastProduct', JSON.stringify(prod));
        sessionStorage.setItem('lastWarnings', JSON.stringify(warn || []));
      } catch {}
    }

    if (prod) setProduct(prod);
    if (Array.isArray(warn)) setWarnings(warn);
  }, [searchParams]);

  const nutrimentEntries = useMemo(() => {
    const nutriments = product?.nutriments || {};
    return Object.entries(nutriments)
      .filter(([key]) =>
        // show *_100g or common ones first
        /(_100g$)|(^energy$|^fat$|carbohydrates|proteins|sugars|salt|sodium|fiber)/i.test(key)
      )
      .sort(([a], [b]) => a.localeCompare(b));
  }, [product]);

  const basicName = product.product_name || product.product_name_en || product.product_name_hi || 'Unknown Product';
  const productId = product._id || product.id || product.code || 'N/A';

  return (
    <div className={styles.container}>
      <div className={styles.scroll}>
        <div className={styles.headerRow}>
          <h1 className={styles.header}>{basicName}</h1>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Back
          </button>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Product ID:</h3>
          <p className={styles.text}>{productId}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Brands:</h3>
          <p className={styles.text}>
            {product.brands || (product.brands_tags || []).join(', ') || 'N/A'}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Quantity:</h3>
          <p className={styles.text}>
            {product.quantity || `${product.product_quantity || 'N/A'} ${product.product_quantity_unit || ''}`}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Countries:</h3>
          <p className={styles.text}>
            {product.countries || (product.countries_tags || []).map(formatTag).join(', ') || 'N/A'}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Categories:</h3>
          <p className={styles.text}>
            {product.categories || product.categories_old || (product.categories_tags || []).map((t) => formatTag(t)).join(', ') || 'N/A'}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Ingredients Text:</h3>
          <p className={styles.text}>{product.ingredients_text || product.ingredients_text_debug || 'Not available'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Allergens:</h3>
          <p className={styles.text}>
            {product.allergens || product.allergens_from_user || product.allergens_from_ingredients || (product.allergens_tags || []).join(', ') || 'None'}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Traces:</h3>
          <p className={styles.text}>
            {product.traces || product.traces_from_user || product.traces_from_ingredients || (product.traces_tags || []).join(', ') || 'None'}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>May be from Palm Oil:</h3>
          <p className={styles.text}>
            {(product.ingredients_that_may_be_from_palm_oil_tags || []).map(formatTag).join(', ') || 'None'}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>From Palm Oil:</h3>
          <p className={styles.text}>
            {(product.ingredients_from_palm_oil_tags || []).map(formatTag).join(', ') || 'None'}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Additives:</h3>
          <p className={styles.text}>
            {(product.additives_tags || []).map(formatTag).join(', ') || 'None'}
          </p>
        </div>

        {/* Dynamic nutriments table */}
        <div className={styles.section}>
          <h3 className={styles.label}>Nutriments (per 100g if available):</h3>
          {nutrimentEntries.length > 0 ? (
            <div className={styles.nutritionContainer}>
              {nutrimentEntries.map(([k, v]) => (
                <p key={k} className={styles.text}>
                  {formatTag(k)}: {String(v)}
                </p>
              ))}
            </div>
          ) : (
            <p className={styles.text}>{product.no_nutrition_data ? 'No nutrition data available' : 'N/A'}</p>
          )}
        </div>

        {/* Existing detailed sections retained below */}
        <div className={styles.section}>
          <h3 className={styles.label}>Nutrition Data Per:</h3>
          <p className={styles.text}>
            {product.nutrition_data_per || product.nutrition_data_prepared_per || 'N/A'}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Nutri-Score:</h3>
          <div className={styles.nutritionScoreContainer}>
            <p className={styles.text}>Grade: {product.nutriscore_grade?.toUpperCase() || product.nutrition_grade_fr?.toUpperCase() || 'Unknown'}</p>
            <p className={styles.text}>Version: {product.nutriscore_version || 'N/A'}</p>
            <p className={styles.text}>Tags: {(product.nutriscore_tags || product.nutriscore_2021_tags || product.nutriscore_2023_tags || []).join(', ') || 'N/A'}</p>
            <p className={styles.text}>Score: {product.nutrition_score_debug || 'N/A'}</p>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Nutrition Score Warnings:</h3>
          <div className={styles.warningContainer}>
            {product.nutrition_score_warning_no_fiber && (
              <p className={`${styles.text} ${styles.warning}`}>⚠️ No fiber data for nutrition score calculation</p>
            )}
            {product.nutrition_score_warning_no_fruits_vegetables_nuts && (
              <p className={`${styles.text} ${styles.warning}`}>⚠️ No fruits/vegetables/nuts data</p>
            )}
            {product.nutrition_score_beverage && (
              <p className={styles.text}>Beverage nutrition score: {product.nutrition_score_beverage}</p>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>NOVA Group (Food Processing):</h3>
          <p className={styles.text}>
            {product.nova_group || product.nova_group_debug || (product.nova_groups_tags || []).join(', ') || product.nova_group_error || 'N/A'}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Ecoscore:</h3>
          <div className={styles.ecoContainer}>
            <p className={styles.text}>Grade: {product.ecoscore_grade?.toUpperCase() || 'N/A'}</p>
            <p className={styles.text}>Score: {product.ecoscore_score || 'N/A'}</p>
            <p className={styles.text}>Tags: {(product.ecoscore_tags || []).join(', ') || 'N/A'}</p>
            {product.ecoscore_data && (
              <>
                <p className={styles.text}>Status: {product.ecoscore_data.status || 'N/A'}</p>
                <p className={styles.text}>Missing Data Warning: {product.ecoscore_data.missing_data_warning ? 'Yes' : 'No'}</p>
                {product.ecoscore_data.agribalyse && (
                  <>
                    <p className={styles.text}>CO2 Total: {product.ecoscore_data.agribalyse.co2_total} kg CO2 eq</p>
                    <p className={styles.text}>Agribalyse Code: {product.ecoscore_data.agribalyse.code}</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Labels:</h3>
          <p className={styles.text}>{(product.labels_tags || []).map(formatTag).join(', ') || 'N/A'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Origins:</h3>
          <p className={styles.text}>{product.origins || (product.origins_tags || []).map((t) => formatTag(t)).join(', ') || 'N/A'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Manufacturing Places:</h3>
          <p className={styles.text}>{product.manufacturing_places || (product.manufacturing_places_tags || []).join(', ') || 'N/A'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Packaging:</h3>
          <p className={styles.text}>
            {product.packaging || (product.packagings && product.packagings.length > 0 ? JSON.stringify(product.packagings, null, 2) : 'N/A')}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Packaging Materials:</h3>
          <p className={styles.text}>
            {(product.packaging_materials_tags || []).join(', ') || (product.packagings_materials && Object.keys(product.packagings_materials).length > 0 ? JSON.stringify(product.packagings_materials, null, 2) : 'N/A')}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Packaging Shapes:</h3>
          <p className={styles.text}>{(product.packaging_shapes_tags || []).join(', ') || 'N/A'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Packaging Recycling:</h3>
          <p className={styles.text}>{(product.packaging_recycling_tags || []).join(', ') || 'N/A'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Stores:</h3>
          <p className={styles.text}>{product.stores || (product.stores_tags || []).join(', ') || 'N/A'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Product Type:</h3>
          <p className={styles.text}>{product.product_type || 'N/A'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Languages:</h3>
          <p className={styles.text}>{(product.languages_tags || []).join(', ') || (product.languages_codes ? Object.keys(product.languages_codes).join(', ') : 'N/A')}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Interface Version:</h3>
          <p className={styles.text}>Created: {product.interface_version_created || 'N/A'}</p>
          <p className={styles.text}>Modified: {product.interface_version_modified || 'N/A'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Dates:</h3>
          <div className={styles.datesContainer}>
            <p className={styles.text}>Created: {product.created_t ? new Date(product.created_t * 1000).toLocaleDateString() : 'N/A'}</p>
            <p className={styles.text}>Last Modified: {product.last_modified_t ? new Date(product.last_modified_t * 1000).toLocaleDateString() : 'N/A'}</p>
            <p className={styles.text}>Last Updated: {product.last_updated_t ? new Date(product.last_updated_t * 1000).toLocaleDateString() : 'N/A'}</p>
            <p className={styles.text}>Last Image: {product.last_image_t ? new Date(product.last_image_t * 1000).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Contributors:</h3>
          <div className={styles.contributorsContainer}>
            <p className={styles.text}>Creator: {product.creator || 'N/A'}</p>
            <p className={styles.text}>Last Editor: {product.last_editor || 'N/A'}</p>
            <p className={styles.text}>Editors: {(product.editors_tags || []).join(', ') || 'N/A'}</p>
            <p className={styles.text}>Photographers: {(product.photographers_tags || []).join(', ') || 'N/A'}</p>
            <p className={styles.text}>Informers: {(product.informers_tags || []).join(', ') || 'N/A'}</p>
            <p className={styles.text}>Correctors: {(product.correctors_tags || []).join(', ') || 'N/A'}</p>
            <p className={styles.text}>Checkers: {(product.checkers_tags || []).join(', ') || 'N/A'}</p>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Statistics:</h3>
          <div className={styles.statsContainer}>
            <p className={styles.text}>Completeness: {product.completeness ? `${(product.completeness * 100).toFixed(1)}%` : 'N/A'}</p>
            <p className={styles.text}>Complete: {product.complete ? 'Yes' : 'No'}</p>
            <p className={styles.text}>Scans: {product.scans_n || 'N/A'}</p>
            <p className={styles.text}>Unique Scans: {product.unique_scans_n || 'N/A'}</p>
            <p className={styles.text}>Popularity Key: {product.popularity_key || 'N/A'}</p>
            <p className={styles.text}>Revision: {product.rev || 'N/A'}</p>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Health & Safety Warnings:</h3>
          <div className={styles.warningsContainer}>
            {Array.isArray(warnings) && warnings.length > 0 && warnings.map((w, i) => (
              <p key={`custom-${i}`} className={`${styles.text} ${styles.error}`}>⚠️ {w}</p>
            ))}
            {(product.data_quality_warnings_tags || []).length > 0 && product.data_quality_warnings_tags.map((tag, i) => (
              <p key={`warning-${i}`} className={`${styles.text} ${styles.warning}`}>⚠️ {formatTag(tag)}</p>
            ))}
            {product.unknown_ingredients_n > 0 && (
              <p className={`${styles.text} ${styles.warning}`}>⚠️ Contains {product.unknown_ingredients_n} unknown ingredient(s)</p>
            )}
            {product.ingredients_from_or_that_may_be_from_palm_oil_n > 0 && (
              <p className={`${styles.text} ${styles.warning}`}>⚠️ Contains {product.ingredients_from_or_that_may_be_from_palm_oil_n} ingredient(s) from palm oil</p>
            )}
            {product.ingredients_that_may_be_from_palm_oil_n > 0 && (
              <p className={`${styles.text} ${styles.warning}`}>⚠️ Contains {product.ingredients_that_may_be_from_palm_oil_n} ingredient(s) that may be from palm oil</p>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Misc Tags:</h3>
          <p className={styles.text}>{(product.misc_tags || []).map(formatTag).join(', ') || 'N/A'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Keywords:</h3>
          <p className={styles.text}>{(product._keywords || []).join(', ') || 'N/A'}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Images:</h3>
          {product.images && Object.keys(product.images).length > 0 ? (
            <div className={styles.imagesContainer}>
              <p className={styles.text}>Total Images: {Object.keys(product.images).length}</p>
              {Object.entries(product.images).map(([key, image]) => (
                <div key={key}>
                  <p className={styles.text}>
                    Image {key}: Uploader - {image.uploader || 'N/A'}, Uploaded - {image.uploaded_t ? new Date(parseInt(image.uploaded_t) * 1000).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.text}>No images available</p>
          )}
        </div>

        {/* Raw JSON fallback */}
        <div className={styles.section}>
          <h3 className={styles.label}>Raw Product JSON:</h3>
          <pre className={styles.raw}>{JSON.stringify(product, null, 2)}</pre>
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