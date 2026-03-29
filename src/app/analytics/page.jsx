"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, TrendingUp, Grid3X3, Image, Palette, Video, Trash2, RefreshCw, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { getCategoryUsage, resetCategoryUsage } from "@/lib/categoryTracker";
import { getPromptHistory, clearPromptHistory } from "@/lib/promptHistory";

const ALL_CATEGORIES = [
  "fruits","vegetables","spicesAndHerbs","cookedFood","flowers","trees",
  "landscapes","weather","water","architecture","islamicArt","textiles",
  "ceramics","stationery","technology","transport","tools","minerals",
  "astronomy","agriculture","marine","insects","seasons","abstractNature",
  "gardens","kitchenItems","lightAndShadow","officeAndBusiness","music",
  "education","crafts","containers","texturesAndPatterns","colorStudies",
  "miniatures","naturalMaterials","markets","timeAndClocks","doors","windows",
  "bridges","stairs","jewelry","clothing","toysAndGames","sportsEquipment",
  "medicalEquipment","kitchenAppliances","eidAndSeasonal","historicalArtifacts",
  "packagingAndBranding","foodPreparation","constructionMaterials",
  "calligraphyStyles","mapsAndCartography","boardGamesAndPuzzles",
  "vintageAndRetro","dessertsAndSweets","outdoorScenes"
];

const CATEGORY_LABELS = {
  en: {
    fruits: "Fruits", vegetables: "Vegetables", spicesAndHerbs: "Spices & Herbs",
    cookedFood: "Cooked Food", flowers: "Flowers", trees: "Trees",
    landscapes: "Landscapes", weather: "Weather", water: "Water",
    architecture: "Architecture", islamicArt: "Islamic Art", textiles: "Textiles",
    ceramics: "Ceramics", stationery: "Stationery", technology: "Technology",
    transport: "Transport", tools: "Tools", minerals: "Minerals",
    astronomy: "Astronomy", agriculture: "Agriculture", marine: "Marine",
    insects: "Insects", seasons: "Seasons", abstractNature: "Abstract Nature",
    gardens: "Gardens", kitchenItems: "Kitchen Items", lightAndShadow: "Light & Shadow",
    officeAndBusiness: "Office & Business", music: "Music", education: "Education",
    crafts: "Crafts", containers: "Containers", texturesAndPatterns: "Textures & Patterns",
    colorStudies: "Color Studies", miniatures: "Miniatures", naturalMaterials: "Natural Materials",
    markets: "Markets", timeAndClocks: "Time & Clocks", doors: "Doors", windows: "Windows",
    bridges: "Bridges", stairs: "Stairs", jewelry: "Jewelry", clothing: "Clothing",
    toysAndGames: "Toys & Games", sportsEquipment: "Sports Equipment",
    medicalEquipment: "Medical Equipment", kitchenAppliances: "Kitchen Appliances",
    eidAndSeasonal: "Eid & Seasonal", historicalArtifacts: "Historical Artifacts",
    packagingAndBranding: "Packaging & Branding", foodPreparation: "Food Preparation",
    constructionMaterials: "Construction Materials", calligraphyStyles: "Calligraphy Styles",
    mapsAndCartography: "Maps & Cartography", boardGamesAndPuzzles: "Board Games & Puzzles",
    vintageAndRetro: "Vintage & Retro", dessertsAndSweets: "Desserts & Sweets",
    outdoorScenes: "Outdoor Scenes"
  },
  bn: {
    fruits: "ফল", vegetables: "সবজি", spicesAndHerbs: "মশলা ও ভেষজ",
    cookedFood: "রান্না করা খাবার", flowers: "ফুল", trees: "গাছ",
    landscapes: "প্রাকৃতিক দৃশ্য", weather: "আবহাওয়া", water: "পানি",
    architecture: "স্থাপত্য", islamicArt: "ইসলামিক আর্ট", textiles: "বস্ত্র",
    ceramics: "সিরামিক", stationery: "স্টেশনারি", technology: "প্রযুক্তি",
    transport: "পরিবহন", tools: "যন্ত্রপাতি", minerals: "খনিজ",
    astronomy: "জ্যোতির্বিদ্যা", agriculture: "কৃষি", marine: "সামুদ্রিক",
    insects: "পোকামাকড়", seasons: "ঋতু", abstractNature: "বিমূর্ত প্রকৃতি",
    gardens: "বাগান", kitchenItems: "রান্নাঘরের জিনিস", lightAndShadow: "আলো ও ছায়া",
    officeAndBusiness: "অফিস ও ব্যবসা", music: "সংগীত", education: "শিক্ষা",
    crafts: "কারুশিল্প", containers: "পাত্র", texturesAndPatterns: "টেক্সচার ও প্যাটার্ন",
    colorStudies: "রঙের অধ্যয়ন", miniatures: "মিনিয়েচার", naturalMaterials: "প্রাকৃতিক উপাদান",
    markets: "বাজার", timeAndClocks: "সময় ও ঘড়ি", doors: "দরজা", windows: "জানালা",
    bridges: "সেতু", stairs: "সিঁড়ি", jewelry: "গহনা", clothing: "পোশাক",
    toysAndGames: "খেলনা ও গেম", sportsEquipment: "খেলার সরঞ্জাম",
    medicalEquipment: "চিকিৎসা সরঞ্জাম", kitchenAppliances: "রান্নাঘরের যন্ত্রপাতি",
    eidAndSeasonal: "ঈদ ও মৌসুমী", historicalArtifacts: "ঐতিহাসিক নিদর্শন",
    packagingAndBranding: "প্যাকেজিং ও ব্র্যান্ডিং", foodPreparation: "খাদ্য প্রস্তুতি",
    constructionMaterials: "নির্মাণ সামগ্রী", calligraphyStyles: "ক্যালিগ্রাফি",
    mapsAndCartography: "মানচিত্র", boardGamesAndPuzzles: "বোর্ড গেম ও পাজল",
    vintageAndRetro: "ভিন্টেজ ও রেট্রো", dessertsAndSweets: "মিষ্টি ও ডেজার্ট",
    outdoorScenes: "বহিরাঙ্গন দৃশ্য"
  }
};

function loadData() {
  const types = ["image", "vector", "video"];
  const catUsage = {};
  const promptCounts = {};
  let total = 0;

  for (const type of types) {
    const usage = getCategoryUsage(type);
    catUsage[type] = usage;
    const history = getPromptHistory(type);
    promptCounts[type] = history.length;
    total += history.length;
  }

  const merged = {};
  for (const type of types) {
    for (const [cat, count] of Object.entries(catUsage[type])) {
      merged[cat] = (merged[cat] || 0) + count;
    }
  }

  const usedCategories = new Set(Object.keys(merged));
  const categoriesUsed = usedCategories.size;

  let mostActiveType = "image";
  let maxCount = 0;
  for (const type of types) {
    if (promptCounts[type] > maxCount) {
      maxCount = promptCounts[type];
      mostActiveType = type;
    }
  }

  let leastUsedCategory = null;
  if (categoriesUsed > 0) {
    let minCount = Infinity;
    for (const [cat, count] of Object.entries(merged)) {
      if (count < minCount) {
        minCount = count;
        leastUsedCategory = cat;
      }
    }
  }

  const maxCatCount = Math.max(1, ...Object.values(merged));

  return {
    total,
    promptCounts,
    categoriesUsed,
    mostActiveType,
    leastUsedCategory,
    merged,
    maxCatCount,
    usedCategories
  };
}

export default function AnalyticsPage() {
  const { t, lang } = useLanguage();
  const catLabel = (key) => (CATEGORY_LABELS[lang] || CATEGORY_LABELS.en)[key] || key;
  const [data, setData] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const refresh = useCallback(() => {
    setData(loadData());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!data) return null;

  const { total, promptCounts, categoriesUsed, mostActiveType, leastUsedCategory, merged, maxCatCount, usedCategories } = data;
  const isEmpty = total === 0 && categoriesUsed === 0;

  const typeLabels = { image: t("analytics.image"), vector: t("analytics.vector"), video: t("analytics.video") };
  const typeIcons = { image: Image, vector: Palette, video: Video };
  const typeColors = { image: "#4f46e5", vector: "#10b981", video: "#f59e0b" };

  const handleReset = () => {
    ["image", "vector", "video"].forEach(type => {
      resetCategoryUsage(type);
      clearPromptHistory(type);
    });
    setConfirmReset(false);
    refresh();
  };

  const sortedCategories = [...ALL_CATEGORIES].sort((a, b) => (merged[b] || 0) - (merged[a] || 0));
  const coveragePercent = Math.round((categoriesUsed / ALL_CATEGORIES.length) * 100);

  const totalDistribution = promptCounts.image + promptCounts.vector + promptCounts.video;

  return (
    <div className="page analytics-page">
      <div className="page-head">
        <div className="page-icon"><BarChart3 size={24} /></div>
        <h1 className="page-title">{t("analytics.title")}</h1>
        <p className="page-desc">{t("analytics.description")}</p>
      </div>

      {isEmpty ? (
        <div className="analytics-empty">
          <div className="analytics-empty-icon">
            <Sparkles size={40} />
          </div>
          <h2 className="analytics-empty-title">{t("analytics.emptyTitle")}</h2>
          <p className="analytics-empty-desc">{t("analytics.emptyDesc")}</p>
          <Link href="/prompt-generator" className="analytics-empty-cta">
            {t("analytics.emptyAction")} <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <div className="analytics-summary">
            <div className="analytics-card">
              <div className="analytics-card-icon" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}>
                <TrendingUp size={18} />
              </div>
              <div className="analytics-card-body">
                <span className="analytics-card-value">{total}</span>
                <span className="analytics-card-label">{t("analytics.totalPrompts")}</span>
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-icon" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                <Grid3X3 size={18} />
              </div>
              <div className="analytics-card-body">
                <span className="analytics-card-value">{categoriesUsed} <span className="analytics-card-sub">/ {ALL_CATEGORIES.length}</span></span>
                <span className="analytics-card-label">{t("analytics.categoriesUsed")}</span>
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-icon" style={{ background: `linear-gradient(135deg, ${typeColors[mostActiveType]}, ${typeColors[mostActiveType]}dd)` }}>
                {(() => { const Icon = typeIcons[mostActiveType]; return <Icon size={18} />; })()}
              </div>
              <div className="analytics-card-body">
                <span className="analytics-card-value">{typeLabels[mostActiveType]}</span>
                <span className="analytics-card-label">{t("analytics.mostActive")}</span>
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                <BarChart3 size={18} />
              </div>
              <div className="analytics-card-body">
                <span className="analytics-card-value analytics-card-value-sm">{leastUsedCategory ? catLabel(leastUsedCategory) : "—"}</span>
                <span className="analytics-card-label">{t("analytics.leastUsed")}</span>
              </div>
            </div>
          </div>

          {totalDistribution > 0 && (
            <div className="analytics-section">
              <h3 className="analytics-section-title">{t("analytics.generatorDistribution")}</h3>
              <div className="analytics-donut-wrap">
                <div className="analytics-donut">
                  <svg viewBox="0 0 120 120" className="analytics-donut-svg">
                    {(() => {
                      const radius = 48;
                      const circumference = 2 * Math.PI * radius;
                      let offset = 0;
                      const segments = [];
                      const types = ["image", "vector", "video"];
                      const colors = [typeColors.image, typeColors.vector, typeColors.video];
                      for (let i = 0; i < types.length; i++) {
                        const pct = promptCounts[types[i]] / totalDistribution;
                        if (pct === 0) continue;
                        const dash = pct * circumference;
                        segments.push(
                          <circle key={types[i]} cx="60" cy="60" r={radius} fill="none" stroke={colors[i]}
                            strokeWidth="16" strokeDasharray={`${dash} ${circumference - dash}`}
                            strokeDashoffset={-offset} strokeLinecap="butt"
                            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
                        );
                        offset += dash;
                      }
                      return segments;
                    })()}
                    <text x="60" y="56" textAnchor="middle" className="analytics-donut-total">{totalDistribution}</text>
                    <text x="60" y="72" textAnchor="middle" className="analytics-donut-label">{t("analytics.prompts")}</text>
                  </svg>
                </div>
                <div className="analytics-donut-legend">
                  {["image", "vector", "video"].map(type => (
                    <div key={type} className="analytics-legend-item">
                      <span className="analytics-legend-dot" style={{ background: typeColors[type] }} />
                      <span className="analytics-legend-label">{typeLabels[type]}</span>
                      <span className="analytics-legend-count">{promptCounts[type]}</span>
                      <span className="analytics-legend-pct">{totalDistribution > 0 ? Math.round((promptCounts[type] / totalDistribution) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="analytics-section">
            <h3 className="analytics-section-title">
              {t("analytics.categoryUsage")}
              <span className="analytics-section-badge">{categoriesUsed} {t("analytics.of")} {ALL_CATEGORIES.length}</span>
            </h3>
            <div className="analytics-bars">
              {sortedCategories.map(cat => {
                const count = merged[cat] || 0;
                const level = count === 0 ? "unused" : count >= maxCatCount * 0.7 ? "high" : count >= maxCatCount * 0.3 ? "medium" : "low";
                return (
                  <div key={cat} className={`analytics-bar-row analytics-bar-${level}`}>
                    <span className="analytics-bar-name">{catLabel(cat)}</span>
                    <div className="analytics-bar-track">
                      {count > 0 && <div className={`analytics-bar-fill analytics-bar-fill-${level}`}
                        style={{ width: `${Math.max(4, (count / maxCatCount) * 100)}%` }} />}
                    </div>
                    <span className="analytics-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="analytics-section">
            <h3 className="analytics-section-title">
              {t("analytics.coverageMap")}
              <span className="analytics-section-badge">{coveragePercent}%</span>
            </h3>
            <div className="analytics-coverage-bar-wrap">
              <div className="analytics-coverage-bar-bg">
                <div className="analytics-coverage-bar-fill" style={{ width: `${coveragePercent}%` }} />
              </div>
              <span className="analytics-coverage-bar-text">{coveragePercent}% {t("analytics.explored")}</span>
            </div>
            <div className="analytics-coverage-grid">
              {ALL_CATEGORIES.map(cat => {
                const used = usedCategories.has(cat);
                const count = merged[cat] || 0;
                const heat = count > 0 ? Math.min(1, count / maxCatCount) : 0;
                return (
                  <div key={cat}
                    className={`analytics-coverage-cell ${used ? "used" : "unused"}`}
                    style={used ? { "--heat": heat } : undefined}
                    title={`${catLabel(cat)}: ${count}`}>
                    <span className="analytics-coverage-cell-name">{catLabel(cat)}</span>
                    {used && <span className="analytics-coverage-cell-count">{count}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="analytics-actions">
            {!confirmReset ? (
              <button className="analytics-reset-btn" onClick={() => setConfirmReset(true)}>
                <Trash2 size={14} /> {t("analytics.resetStats")}
              </button>
            ) : (
              <div className="analytics-confirm">
                <span>{t("analytics.resetConfirm")}</span>
                <button className="analytics-confirm-yes" onClick={handleReset}>{t("analytics.resetYes")}</button>
                <button className="analytics-confirm-no" onClick={() => setConfirmReset(false)}>{t("analytics.resetNo")}</button>
              </div>
            )}
            <button className="analytics-refresh-btn" onClick={refresh}>
              <RefreshCw size={14} /> {t("analytics.refresh")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
