"use client";

import React from "react";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import {
  Info,
  Scan,
  FileText,
  ShieldCheck,
  Brain,
  HeartPulse,
  Mail,
  Smartphone,
} from "lucide-react";

export default function AboutPage() {
  return (
    <ProtectedRoute>
      <AppShell title="About Us">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-10 px-4">
          <div className="max-w-4xl mx-auto space-y-10">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white flex justify-center gap-3">
                <Info size={32} className="text-blue-500 dark:text-blue-400" />
                About Scanner App
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Learn more about how your smart food scanner works and how we
                help you make healthier food choices every day.
              </p>
            </motion.div>

            {/* SECTION 1 - Mission */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <HeartPulse className="text-red-500" size={26} />
                Our Mission
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Our goal is simple — to help users make informed and safe food
                decisions. Whether you're tracking nutrition, managing
                allergies, or understanding complex ingredients, Scanner App
                empowers you with instant, accurate insights using barcode
                scanning and AI-powered OCR ingredient analysis.
              </p>
            </motion.div>

            {/* SECTION 2 - How Scanner Works */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Scan className="text-green-500" size={26} />
                How Barcode Scanner Works
              </h2>

              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li>
                  • The scanner detects barcodes using your camera in real-time.
                </li>
                <li>
                  • Barcode is checked in your product database hosted on
                  Render.
                </li>
                <li>
                  • The app fetches product name, brand, quantity & nutrition
                  info.
                </li>
                <li>
                  • Your stored allergy profile is matched with product
                  ingredients.
                </li>
                <li>
                  • AI generates instant warnings based on allergens & nutrition
                  risks.
                </li>
              </ul>
            </motion.div>

            {/* SECTION 3 - How OCR Works */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <FileText className="text-purple-500" size={26} />
                How OCR Ingredient Analysis Works
              </h2>

              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li>
                  • Upload an image or capture it directly through your camera.
                </li>
                <li>• The app extracts readable text using OCR technology.</li>
                <li>• The extracted ingredients are tokenized and cleaned.</li>
                <li>
                  • AI checks for allergens, harmful additives, or specific
                  warnings.
                </li>
                <li>• Users receive a clean report for safer food choices.</li>
              </ul>
            </motion.div>

            {/* SECTION 4 - Why It Helps */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Brain className="text-indigo-500" size={26} />
                Why Scanner App Helps You
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl">
                  <p className="font-semibold text-blue-700 dark:text-blue-300">
                    🛡 Allergy Protection
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    Detect allergens instantly based on your profile.
                  </p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl">
                  <p className="font-semibold text-purple-700 dark:text-purple-300">
                    🤖 AI-Powered Insights
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    Smart text analysis to interpret complex ingredient lists.
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl">
                  <p className="font-semibold text-green-700 dark:text-green-300">
                    ⚡ Instant Results
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    Scanning & analysis within seconds.
                  </p>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-xl">
                  <p className="font-semibold text-orange-700 dark:text-orange-300">
                    🎯 Personalized for You
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    Uses your age, BMI, allergies & profile details.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* SECTION 5 - Contact */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <ShieldCheck className="text-teal-500" size={26} />
                Support & Contact
              </h2>

              <p className="text-gray-700 dark:text-gray-300 mb-4">
                If you have any questions, issues or feedback, we’d love to hear
                from you.
              </p>

              <div className="space-y-3">
                <p className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Mail className="text-blue-500" size={20} />{" "}
                  support@scannerapp.com
                </p>
                <p className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Smartphone className="text-green-500" size={20} /> +91 98765
                  43210
                </p>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                © {new Date().getFullYear()} Scanner App — Version 1.0.0
              </p>
            </motion.div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
