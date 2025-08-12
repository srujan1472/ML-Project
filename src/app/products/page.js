"use client";
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './ProductDetails.module.css';

export const dynamic = 'force-dynamic';

function ProductDetailsContent() {
  const searchParams = useSearchParams();
  const [product, setProduct] = useState({});
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    try {
      const productParam = searchParams.get('product');
      const warningsParam = searchParams.get('warnings');
      const parsedProduct = productParam ? JSON.parse(decodeURIComponent(productParam)) : {};
      const parsedWarnings = warningsParam ? JSON.parse(decodeURIComponent(warningsParam)) : [];
      setProduct(parsedProduct);
      setWarnings(parsedWarnings);
    } catch (error) {
      console.error('Error parsing route params:', error);
    }
  }, [searchParams]);

  return (
    <div className={styles.container}>
      <div className={styles.scroll}>
        <h1 className={styles.header}>
          {product.product_name || product.product_name_en || product.product_name_hi || "Unknown Product"}
        </h1>

        <div className={styles.section}>
          <h3 className={styles.label}>Product ID:</h3>
          <p className={styles.text}>
            {product._id || product.id || product.code || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Brands:</h3>
          <p className={styles.text}>
            {product.brands || (product.brands_tags || []).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Quantity:</h3>
          <p className={styles.text}>
            {product.quantity || `${product.product_quantity || "N/A"} ${product.product_quantity_unit || ""}`}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Countries:</h3>
          <p className={styles.text}>
            {product.countries || (product.countries_tags || []).map((tag) => tag.replace('en:', '')).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Categories:</h3>
          <p className={styles.text}>
            {product.categories || product.categories_old || (product.categories_tags || []).map((tag) => tag.replace('en:', '').replace(/-/g, ' ')).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Ingredients Text:</h3>
          <p className={styles.text}>
            {product.ingredients_text || product.ingredients_text_debug || "Not available"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Ingredients That May Be From Palm Oil:</h3>
          <p className={styles.text}>
            {(product.ingredients_that_may_be_from_palm_oil_tags || []).join(", ") || "None"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Ingredients From Palm Oil:</h3>
          <p className={styles.text}>
            {(product.ingredients_from_palm_oil_tags || []).join(", ") || "None"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Additives:</h3>
          <p className={styles.text}>
            {(product.additives_tags || []).map((tag) => tag.replace('en:', '').replace(/-/g, ' ')).join(", ") || "None"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Allergens:</h3>
          <p className={styles.text}>
            {product.allergens || product.allergens_from_user || product.allergens_from_ingredients || (product.allergens_tags || []).join(", ") || "None"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Allergens Hierarchy:</h3>
          <p className={styles.text}>
            {(product.allergens_hierarchy || []).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Traces:</h3>
          <p className={styles.text}>
            {product.traces || product.traces_from_user || product.traces_from_ingredients || (product.traces_tags || []).join(", ") || "None"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Traces Hierarchy:</h3>
          <p className={styles.text}>
            {(product.traces_hierarchy || []).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Nutritional Information (per 100g):</h3>
          {product.nutriments && Object.keys(product.nutriments).length > 0 ? (
            <div className={styles.nutritionContainer}>
              <p className={styles.text}>
                Energy: {product.nutriments.energy_100g || product.nutriments.energy || "N/A"} 
                {product.nutriments.energy_unit || "kJ"}
              </p>
              <p className={styles.text}>
                Calories: {product.nutriments['energy-kcal_100g'] || product.nutriments['energy-kcal'] || "N/A"} kcal
              </p>
              <p className={styles.text}>
                Fat: {product.nutriments.fat_100g || product.nutriments.fat || "N/A"} g
              </p>
              <p className={styles.text}>
                Saturated Fat: {product.nutriments['saturated-fat_100g'] || product.nutriments['saturated-fat'] || "N/A"} g
              </p>
              <p className={styles.text}>
                Carbohydrates: {product.nutriments.carbohydrates_100g || product.nutriments.carbohydrates || "N/A"} g
              </p>
              <p className={styles.text}>
                Sugars: {product.nutriments.sugars_100g || product.nutriments.sugars || "N/A"} g
              </p>
              <p className={styles.text}>
                Fiber: {product.nutriments.fiber_100g || product.nutriments.fiber || "N/A"} g
              </p>
              <p className={styles.text}>
                Proteins: {product.nutriments.proteins_100g || product.nutriments.proteins || "N/A"} g
              </p>
              <p className={styles.text}>
                Salt: {product.nutriments.salt_100g || product.nutriments.salt || "N/A"} g
              </p>
              <p className={styles.text}>
                Sodium: {product.nutriments.sodium_100g || product.nutriments.sodium || "N/A"} mg
              </p>
            </div>
          ) : (
            <p className={styles.text}>
              {product.no_nutrition_data ? "No nutrition data available" : "N/A"}
            </p>
          )}
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Nutrition Data Per:</h3>
          <p className={styles.text}>
            {product.nutrition_data_per || product.nutrition_data_prepared_per || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Nutri-Score:</h3>
          <div className={styles.nutritionScoreContainer}>
            <p className={styles.text}>
              Grade: {product.nutriscore_grade?.toUpperCase() || product.nutrition_grade_fr?.toUpperCase() || "Unknown"}
            </p>
            <p className={styles.text}>
              Version: {product.nutriscore_version || "N/A"}
            </p>
            <p className={styles.text}>
              Tags: {(product.nutriscore_tags || product.nutriscore_2021_tags || product.nutriscore_2023_tags || []).join(", ") || "N/A"}
            </p>
            <p className={styles.text}>
              Score: {product.nutrition_score_debug || "N/A"}
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Nutrition Score Warnings:</h3>
          <div className={styles.warningContainer}>
            {product.nutrition_score_warning_no_fiber && (
              <p className={`${styles.text} ${styles.warning}`}>
                ⚠️ No fiber data for nutrition score calculation
              </p>
            )}
            {product.nutrition_score_warning_no_fruits_vegetables_nuts && (
              <p className={`${styles.text} ${styles.warning}`}>
                ⚠️ No fruits/vegetables/nuts data
              </p>
            )}
            {product.nutrition_score_beverage && (
              <p className={styles.text}>
                Beverage nutrition score: {product.nutrition_score_beverage}
              </p>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>NOVA Group (Food Processing):</h3>
          <p className={styles.text}>
            {product.nova_group || product.nova_group_debug || (product.nova_groups_tags || []).join(", ") || product.nova_group_error || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Ecoscore:</h3>
          <div className={styles.ecoContainer}>
            <p className={styles.text}>
              Grade: {product.ecoscore_grade?.toUpperCase() || "N/A"}
            </p>
            <p className={styles.text}>
              Score: {product.ecoscore_score || "N/A"}
            </p>
            <p className={styles.text}>
              Tags: {(product.ecoscore_tags || []).join(", ") || "N/A"}
            </p>
            {product.ecoscore_data && (
              <>
                <p className={styles.text}>
                  Status: {product.ecoscore_data.status || "N/A"}
                </p>
                <p className={styles.text}>
                  Missing Data Warning: {product.ecoscore_data.missing_data_warning ? "Yes" : "No"}
                </p>
                {product.ecoscore_data.agribalyse && (
                  <>
                    <p className={styles.text}>
                      CO2 Total: {product.ecoscore_data.agribalyse.co2_total} kg CO2 eq
                    </p>
                    <p className={styles.text}>
                      Agribalyse Code: {product.ecoscore_data.agribalyse.code}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Labels:</h3>
          <p className={styles.text}>
            {(product.labels_tags || []).map((tag) => tag.replace('en:', '').replace(/-/g, ' ')).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Origins:</h3>
          <p className={styles.text}>
            {product.origins || (product.origins_tags || []).map((tag) => tag.replace('en:', '')).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Manufacturing Places:</h3>
          <p className={styles.text}>
            {product.manufacturing_places || (product.manufacturing_places_tags || []).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Packaging:</h3>
          <p className={styles.text}>
            {product.packaging || 
             (product.packagings && product.packagings.length > 0 
               ? JSON.stringify(product.packagings, null, 2)
               : "N/A")}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Packaging Materials:</h3>
          <p className={styles.text}>
            {(product.packaging_materials_tags || []).join(", ") || 
             (Object.keys(product.packagings_materials || {}).length > 0 
               ? JSON.stringify(product.packagings_materials, null, 2) 
               : "N/A")}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Packaging Shapes:</h3>
          <p className={styles.text}>
            {(product.packaging_shapes_tags || []).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Packaging Recycling:</h3>
          <p className={styles.text}>
            {(product.packaging_recycling_tags || []).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Stores:</h3>
          <p className={styles.text}>
            {product.stores || (product.stores_tags || []).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Product Type:</h3>
          <p className={styles.text}>
            {product.product_type || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Languages:</h3>
          <p className={styles.text}>
            {(product.languages_tags || []).join(", ") || 
             (product.languages_codes ? Object.keys(product.languages_codes).join(", ") : "N/A")}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Interface Version:</h3>
          <p className={styles.text}>
            Created: {product.interface_version_created || "N/A"}
          </p>
          <p className={styles.text}>
            Modified: {product.interface_version_modified || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Dates:</h3>
          <div className={styles.datesContainer}>
            <p className={styles.text}>
              Created: {product.created_t ? new Date(product.created_t * 1000).toLocaleDateString() : "N/A"}
            </p>
            <p className={styles.text}>
              Last Modified: {product.last_modified_t ? new Date(product.last_modified_t * 1000).toLocaleDateString() : "N/A"}
            </p>
            <p className={styles.text}>
              Last Updated: {product.last_updated_t ? new Date(product.last_updated_t * 1000).toLocaleDateString() : "N/A"}
            </p>
            <p className={styles.text}>
              Last Image: {product.last_image_t ? new Date(product.last_image_t * 1000).toLocaleDateString() : "N/A"}
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Contributors:</h3>
          <div className={styles.contributorsContainer}>
            <p className={styles.text}>
              Creator: {product.creator || "N/A"}
            </p>
            <p className={styles.text}>
              Last Editor: {product.last_editor || "N/A"}
            </p>
            <p className={styles.text}>
              Editors: {(product.editors_tags || []).join(", ") || "N/A"}
            </p>
            <p className={styles.text}>
              Photographers: {(product.photographers_tags || []).join(", ") || "N/A"}
            </p>
            <p className={styles.text}>
              Informers: {(product.informers_tags || []).join(", ") || "N/A"}
            </p>
            <p className={styles.text}>
              Correctors: {(product.correctors_tags || []).join(", ") || "N/A"}
            </p>
            <p className={styles.text}>
              Checkers: {(product.checkers_tags || []).join(", ") || "N/A"}
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Statistics:</h3>
          <div className={styles.statsContainer}>
            <p className={styles.text}>
              Completeness: {product.completeness ? `${(product.completeness * 100).toFixed(1)}%` : "N/A"}
            </p>
            <p className={styles.text}>
              Complete: {product.complete ? "Yes" : "No"}
            </p>
            <p className={styles.text}>
              Scans: {product.scans_n || "N/A"}
            </p>
            <p className={styles.text}>
              Unique Scans: {product.unique_scans_n || "N/A"}
            </p>
            <p className={styles.text}>
              Popularity Key: {product.popularity_key || "N/A"}
            </p>
            <p className={styles.text}>
              Revision: {product.rev || "N/A"}
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Data Quality:</h3>
          <div className={styles.qualityContainer}>
            <p className={styles.text}>
              Warnings: {(product.data_quality_warnings_tags || []).length}
            </p>
            <p className={styles.text}>
              Errors: {(product.data_quality_errors_tags || []).length}
            </p>
            <p className={styles.text}>
              Info: {(product.data_quality_info_tags || []).length}
            </p>
            <p className={styles.text}>
              Debug: {(product.data_quality_debug_tags || []).length}
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Health & Safety Warnings:</h3>
          <div className={styles.warningsContainer}>
            {/* Custom warnings passed from parent */}
            {warnings.length > 0 && warnings.map((w, i) => (
              <p key={`custom-${i}`} className={`${styles.text} ${styles.error}`}>
                ⚠️ {w}
              </p>
            ))}
            
            {/* Data quality warnings */}
            {(product.data_quality_warnings_tags || []).length > 0 && 
              product.data_quality_warnings_tags.map((tag, i) => (
                <p key={`warning-${i}`} className={`${styles.text} ${styles.warning}`}>
                  ⚠️ {tag.replace('en:', '').replace(/-/g, ' ')}
                </p>
              ))
            }

            {/* Specific health warnings */}
            {product.unknown_ingredients_n > 0 && (
              <p className={`${styles.text} ${styles.warning}`}>
                ⚠️ Contains {product.unknown_ingredients_n} unknown ingredient(s)
              </p>
            )}

            {product.ingredients_from_or_that_may_be_from_palm_oil_n > 0 && (
              <p className={`${styles.text} ${styles.warning}`}>
                ⚠️ Contains {product.ingredients_from_or_that_may_be_from_palm_oil_n} ingredient(s) from palm oil
              </p>
            )}

            {product.ingredients_that_may_be_from_palm_oil_n > 0 && (
              <p className={`${styles.text} ${styles.warning}`}>
                ⚠️ Contains {product.ingredients_that_may_be_from_palm_oil_n} ingredient(s) that may be from palm oil
              </p>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Misc Tags:</h3>
          <p className={styles.text}>
            {(product.misc_tags || []).map((tag) => tag.replace('en:', '').replace(/-/g, ' ')).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Keywords:</h3>
          <p className={styles.text}>
            {(product._keywords || []).join(", ") || "N/A"}
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.label}>Images:</h3>
          {product.images && Object.keys(product.images).length > 0 ? (
            <div className={styles.imagesContainer}>
              <p className={styles.text}>
                Total Images: {Object.keys(product.images).length}
              </p>
              {Object.entries(product.images).map(([key, image]) => (
                <div key={key}>
                  <p className={styles.text}>
                    Image {key}: Uploader - {image.uploader || "N/A"}, 
                    Uploaded - {image.uploaded_t ? new Date(parseInt(image.uploaded_t) * 1000).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.text}>No images available</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailsPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <ProductDetailsContent />
    </Suspense>
  );
}