// @ts-nocheck
import React, { useState } from "react";
import "./InsightsPage.css";
import Sidebar from "../components/Sidebar";
import { useInsightsData } from "../hooks/useMood";
import InsightIcon from "../assets/InsightIcon";
import AverageIcon from "../assets/AverageIcon";
import RecoveryIcon from "../assets/RecoveryIcon";
import { PageLoadingSpinner, PageErrorState, EmptyState } from "../components/ui";

const moodVisual = {
  great: { color: "#86D39A", label: "Great" },
  good: { color: "#8EC5FF", label: "Good" },
  okay: { color: "#F3D36B", label: "Okay" },
  sad: { color: "#F6B26B", label: "Sad" },
  terrible: { color: "#F39CA0", label: "Terrible" },
};

// Converts any value into a user-friendly sentence case label.
const toSentenceCase = (value) => {
  const text = String(value || "");
  if (!text.trim()) return "-";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Maps raw trend values from API to UI label
const getTrendUI = (trendRaw, hasEnoughComparisonData = true) => {
  const trend = String(trendRaw || "stable").toLowerCase();
  if (!hasEnoughComparisonData || trend === "insufficient_data" || trend === "insufficient_comparison" || trend === "n/a") {
    return {
      label: "Not Enough Data",
      className: "bg-gray-50 text-gray-600 border-gray-200",
      isComparisonAvailable: false,
    };
  }
  if (trend === "improving" || trend === "improved") {
    return {
      label: "Improved",
      className: "bg-green-50 text-green-700 border-green-200",
      isComparisonAvailable: true,
    };
  }
  if (trend === "declining" || trend === "declined") {
    return {
      label: "Declined",
      className: "bg-red-50 text-red-700 border-red-200",
      isComparisonAvailable: true,
    };
  }
  return {
    label: "Stable",
    className: "bg-gray-50 text-gray-700 border-gray-200",
    isComparisonAvailable: true,
  };
};

// Finds the most frequent mood key from the distribution object.
const getTopMood = (distribution) => {
  const keys = ["great", "good", "okay", "sad", "terrible"];
  let bestKey = "n/a";
  let bestCount = -1;

  keys.forEach((key) => {
    const count = Number(distribution?.[key] || 0);
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  });

  return bestCount > 0 ? bestKey : "n/a";
};

// Derives short weekday label (e.g., Mon) from a date string.
const getDayLabelFromDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { weekday: "short" });
};

// Builds a readable label for best/worst day cards with graceful fallback.
const getDayCardLabel = (dayObj, hasEnoughCurrentData = true) => {
  if (!hasEnoughCurrentData || dayObj?.available === false) return "Not enough data";
  const day = String(dayObj?.day || "").trim();
  const date = String(dayObj?.date || "").trim();
  const derivedDay = getDayLabelFromDate(date);

  if (day && date) return `${day} (${date})`;
  if (derivedDay && date) return `${derivedDay} (${date})`;
  if (date) return date;
  return "Not enough data";
};

// Returns a focused recommendation based on the weakest factor name.
const getWeakestFactorSuggestion = (factorKey) => {
  const key = String(factorKey || "").toLowerCase();

  if (key.includes("sleep")) {
    return "Your sleep looked like the weakest area this week. Try a fixed bedtime and a calmer wind-down routine at night.";
  }
  if (key.includes("stress")) {
    return "Stress looked like the weakest area this week. Add short breathing breaks during your day to reduce pressure.";
  }
  if (key.includes("anxiety")) {
    return "Anxiety looked like the weakest area this week. A brief grounding or mindfulness routine may help create more calm.";
  }
  if (key.includes("energy")) {
    return "Energy looked lower this week. Gentle movement, hydration, and regular meals can help support steadier energy.";
  }
  if (key.includes("social")) {
    return "Social connection looked lower this week. A small check-in with one trusted person can be a helpful first step.";
  }
  if (key.includes("focus")) {
    return "Focus looked weaker this week. Try shorter tasks with clear breaks to make the day feel lighter.";
  }
  if (key.includes("motivation")) {
    return "Motivation looked lower this week. Start with one small task each day to rebuild momentum gently.";
  }

  return "Keep a gentle routine this week and continue daily check-ins to spot what supports your mood best.";
};

const InsightsPage = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { insights, insightsLoading, insightsError } = useInsightsData();

  const weeklyEntryCount = Number(
    insights?.sourceMeta?.currentWeekEntryCount ?? insights?.weeklySummary?.totalCheckIns ?? 0
  );
  const previousEntryCount = Number(insights?.sourceMeta?.previousWeekEntryCount ?? 0);

  const hasEnoughCurrentData = insights?.hasEnoughCurrentData !== undefined
    ? Boolean(insights.hasEnoughCurrentData)
    : weeklyEntryCount >= 2;

  const hasEnoughPreviousData = insights?.hasEnoughPreviousData !== undefined
    ? Boolean(insights.hasEnoughPreviousData)
    : previousEntryCount >= 2;

  const hasEnoughComparisonData = insights?.hasEnoughComparisonData !== undefined
    ? Boolean(insights.hasEnoughComparisonData)
    : (hasEnoughCurrentData && hasEnoughPreviousData && insights?.overallMoodTrend !== "insufficient_data" && insights?.overallMoodTrend !== "insufficient_comparison");

  // Normalize summary and trend fields from possible backend key variants.
  const summaryRaw = insights?.simpleMessage || insights?.summary || insights?.summaryText;
  const trendRaw = insights?.overallTrend || insights?.overallMoodTrend || insights?.moodTrend || "stable";
  const trendUI = getTrendUI(trendRaw, hasEnoughComparisonData);

  const summary = !hasEnoughCurrentData
    ? "Not enough current-week data to analyze trends yet. Log at least 2 check-ins over the past 7 days."
    : !hasEnoughComparisonData
    ? "Not enough previous-week data to compare trends yet."
    : summaryRaw || (trendUI.label === "Improved"
      ? "Your mental health trend improved this week compared to the previous week."
      : trendUI.label === "Declined"
      ? "Your mental health trend declined this week compared to the previous week."
      : "Your mental health trend remained stable this week.");

  // Prepare key data collections with safe defaults.
  const patterns = Array.isArray(insights?.patterns) ? insights.patterns : [];
  const correlations = Array.isArray(insights?.correlationInsights) ? insights.correlationInsights : [];
  const dailyInsight = insights?.dailyInsight || null;

  const bestDayRaw = insights?.peakDays?.bestDay || insights?.bestDay || null;
  const worstDayRaw = insights?.peakDays?.worstDay || insights?.worstDay || null;

  const weeklyDailyTrend = Array.isArray(insights?.dailyTrend) ? insights.dailyTrend : [];
  const daysWithScore = weeklyDailyTrend.filter((d) => typeof d?.score === "number" && !Number.isNaN(Number(d.score)));
  const latestDayWithScore = daysWithScore.length
    ? [...daysWithScore].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  const bestDay = bestDayRaw || (hasEnoughCurrentData ? latestDayWithScore : null);
  const worstDay = worstDayRaw || (hasEnoughCurrentData ? (latestDayWithScore || bestDay) : null);

  const isLowDataMode = weeklyEntryCount > 0 && weeklyEntryCount < 4;

  const topPositiveFactor = insights?.topPositiveFactor || insights?.topPositiveContributors?.[0] || null;
  const topNegativeFactor = insights?.topNegativeFactor || insights?.topNegativeContributors?.[0] || null;

  const factorComparisonMessage = !hasEnoughCurrentData
    ? "Not enough current-week data for factor comparison yet. Log at least 2 check-ins across the past 7 days."
    : !hasEnoughComparisonData
    ? "Not enough previous-week data to compare trends yet."
    : topPositiveFactor && topNegativeFactor
    ? `${topPositiveFactor.label || topPositiveFactor.factor || "A positive factor"} improved and helped boost mood, while ${String(topNegativeFactor.label || topNegativeFactor.factor || "another factor").toLowerCase()} seemed to pull mood down.`
    : topPositiveFactor
    ? `${topPositiveFactor.label || topPositiveFactor.factor || "A positive factor"} improved and helped boost mood this week.`
    : topNegativeFactor
    ? `${topNegativeFactor.label || topNegativeFactor.factor || "A factor"} looked challenging this week and may have lowered mood.`
    : isLowDataMode
    ? "This is an early weekly insight. Add more check-ins and we will compare factors more precisely."
    : "Your contributing well-being factors remained stable compared to the previous week.";

  const weakestFactorKey = topNegativeFactor?.factor || topNegativeFactor?.label || "";
  const primaryRecommendation = Array.isArray(insights?.recommendations) && insights.recommendations.length
    ? insights.recommendations[0]
    : Array.isArray(insights?.suggestions) && insights.suggestions.length
    ? insights.suggestions[0]
    : "";
  const weakestSuggestion = weakestFactorKey
    ? getWeakestFactorSuggestion(weakestFactorKey)
    : primaryRecommendation || "Keep a gentle routine this week and continue daily check-ins to spot what supports your mood best.";

  // Compute mood chart totals and percentages for progress bars.
  const moodDistribution = insights?.moodDistribution || {};
  const keys = ["great", "good", "okay", "sad", "terrible"];
  const moodTotal = keys.reduce((sum, key) => sum + Number(moodDistribution?.[key] || 0), 0);
  const topMood = getTopMood(moodDistribution);

  const chartSeries = keys.map((key) => {
    const count = Number(moodDistribution?.[key] || 0);
    const pct = moodTotal > 0 ? Math.round((count / moodTotal) * 100) : 0;
    return {
      key,
      label: moodVisual[key]?.label || toSentenceCase(key),
      count,
      pct,
    };
  });

  // Build smart insights from known correlation signals.
  const hasSleepPattern = correlations.some((item) => String(item?.type || "").toLowerCase().includes("sleep"));
  const hasStressPattern = correlations.some((item) => String(item?.type || "").toLowerCase().includes("stress"));
  const hasEnergyPattern = correlations.some((item) => String(item?.type || "").toLowerCase().includes("energy"));
  const hasSocialPattern = correlations.some((item) => String(item?.type || "").toLowerCase().includes("social"));

  const smartInsights = [
    hasSleepPattern ? 'On days when sleep was lower, your mood was mostly "sad".' : null,
    hasStressPattern ? 'High-stress days matched more with "terrible" or "sad" moods.' : null,
    hasEnergyPattern ? 'Higher energy levels were linked with more "good" mood days.' : null,
    hasSocialPattern ? 'Low social interaction was linked with lower mood days.' : null,
  ].filter(Boolean);

  const fallbackSmartInsights = [
    isLowDataMode ? `Early insight mode: ${weeklyEntryCount} check-in(s) this week.` : null,
    topMood !== "n/a" ? `Recent check-ins mostly show "${toSentenceCase(topMood)}" mood.` : null,
    trendUI.label === "Improved" ? "Your overall emotional trend is moving in a better direction." : null,
    trendUI.label === "Stable" ? "Your emotional trend looks steady this week." : null,
    trendUI.label === "Declined" ? "This week looked a little harder, so extra self-care may help." : null,
    "Add a few more daily check-ins to unlock more detailed smart insights.",
  ].filter(Boolean);

  const isDailyInsightAvailable = hasEnoughCurrentData && (dailyInsight?.available !== false);

  const dailyInsightDateLabel = isDailyInsightAvailable
    ? (dailyInsight?.date || (bestDay?.date ? bestDay.date : "Recent"))
    : "Not enough data";

  const dailyInsightMessage = isDailyInsightAvailable
    ? (dailyInsight?.message || (bestDay?.date ? `Your latest weekly check-in was on ${bestDay.date}. Keep logging daily to see more personalized day-by-day guidance.` : "No daily insight available yet. Add at least 2 check-ins across the past 7 days for day-by-day insight."))
    : "Not enough current-week data for daily insights yet. Log at least 2 check-ins over the past 7 days.";

  const dailyInsightHighlights = isDailyInsightAvailable && Array.isArray(dailyInsight?.highlights)
    ? dailyInsight.highlights
    : [];

  if (insightsLoading) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
          <PageLoadingSpinner message="Loading weekly insights…" />
        </main>
      </div>
    );
  }

  if (insightsError) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
          <PageErrorState message="Insights are unavailable right now. Please try again later." />
        </main>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
            <EmptyState title="No weekly insights yet" description="Please log your daily check-in to get weekly insights." />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Weekly Insight</h1>
              <p className="text-gray-500 mt-1">Your emotional wellness summary & smart recommendations</p>
            </div>
          </div>

          {/* Overview Card */}
          <section className="bg-gradient-to-br from-[#0C5BD5]/5 to-[#0C5BD5]/10 rounded-2xl p-6 border border-[#0C5BD533]">
            <div className="flex flex-wrap gap-3 mb-5">
              <span className={`inline-flex px-4 py-2 rounded-full text-xs font-bold border ${trendUI.className}`}>
                {trendUI.isComparisonAvailable ? `📊 Trend: ${trendUI.label}` : `📊 Comparison: ${trendUI.label}`}
              </span>
              <span className="inline-flex px-4 py-2 rounded-full text-xs font-bold border border-amber-200 bg-amber-50 text-amber-700">
                😊 Most common: {toSentenceCase(topMood)}
              </span>
              {isLowDataMode && (
                <span className="inline-flex px-4 py-2 rounded-full text-xs font-bold border border-orange-200 bg-orange-50 text-orange-700">
                  ⏳ Early mode ({weeklyEntryCount} check-in{weeklyEntryCount > 1 ? "s" : ""})
                </span>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-[#0C5BD533]">
              <p className="text-xs  tracking-wider text-[#0A4AB0] font-bold">This Week's Summary</p>
              <p className="text-base font-semibold text-gray-800 mt-2">{summary}</p>
            </div>
          </section>

          {/* Key Metrics */}
          <section className="grid md:grid-cols-2 gap-4">
            <article className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-50 border border-green-200 flex items-center justify-center shrink-0">
                  <AverageIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs  tracking-wider font-bold text-gray-500"> Peak Day</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">{getDayCardLabel(bestDay, hasEnoughCurrentData)}</p>
                </div>
              </div>
            </article>

            <article className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-50 border border-red-200 flex items-center justify-center shrink-0">
                  <RecoveryIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs  tracking-wider font-bold text-gray-500"> Most Challenging</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">{getDayCardLabel(worstDay, hasEnoughCurrentData)}</p>
                </div>
              </div>
            </article>
          </section>

          {/* Factor Comparison */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🔍</span>
              <h2 className="text-lg font-bold text-gray-800">Factor Analysis</h2>
            </div>

            <div className="rounded-xl border border-[#0C5BD533] bg-gradient-to-r from-[#0C5BD511] to-[#0C5BD505] p-5">
              <p className="text-sm font-medium text-gray-800">{factorComparisonMessage}</p>

              {smartInsights.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {smartInsights.map((line, idx) => (
                    <li key={`${idx}-${line.slice(0, 20)}`} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-[#0C5BD5] font-bold mt-0.5">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-4 space-y-2">
                  {fallbackSmartInsights.map((line, idx) => (
                    <li key={`${idx}-${line.slice(0, 20)}`} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-[#0C5BD5] font-bold mt-0.5">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Support Recommendation */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">💡</span>
              <h2 className="text-lg font-bold text-gray-800">This Week's Focus</h2>
            </div>
            <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50 p-5">
              <p className="text-sm font-medium text-gray-800">{weakestSuggestion}</p>
            </div>
          </section>

          {/* Daily Insight */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📅</span>
              <h2 className="text-lg font-bold text-gray-800">Daily Insight</h2>
            </div>
            <div className="rounded-xl border border-[#0C5BD533] bg-gradient-to-r from-[#0C5BD511] to-[#0C5BD505] p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-[#0C5BD533] flex items-center justify-center shrink-0">
                  <InsightIcon className="w-5 h-5 text-[#0C5BD5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs  tracking-wider font-bold text-gray-500">
                    {dailyInsightDateLabel}
                  </p>
                  <p className="text-sm font-medium text-gray-800 mt-2">{dailyInsightMessage}</p>
                </div>
              </div>
              {dailyInsightHighlights.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {dailyInsightHighlights.map((line, idx) => (
                    <li key={`${idx}-${line.slice(0, 18)}`} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-[#0C5BD5] font-bold mt-0.5">→</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Pattern Analysis */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🧩</span>
              <h2 className="text-lg font-bold text-gray-800">Pattern Analysis</h2>
            </div>
            {patterns.length > 0 ? (
              <div className="space-y-3">
                {patterns.slice(0, 3).map((pattern, idx) => (
                  <article key={`${idx}-${String(pattern?.type || "pattern")}`} className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 px-4 py-3 hover:shadow-sm transition-all duration-200">
                    <p className="text-sm font-bold text-blue-900">{pattern?.type || "Pattern"}</p>
                    <p className="text-sm text-blue-800 mt-1">{pattern?.message || "A recurring emotional pattern was observed."}</p>
                  </article>
                ))}
              </div>
            ) : isLowDataMode ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                <p className="text-sm text-orange-900">
                  Pattern analysis is warming up. With 4 or more check-ins in a week, patterns become more accurate and personal.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No repeated pattern was clearly detected yet.</p>
            )}
          </section>

          {/* Mood Distribution */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📊</span>
              <h2 className="text-lg font-bold text-gray-800">Mood Distribution</h2>
            </div>
            <p className="text-xs text-gray-500 mt-2 mb-4">Mood breakdown across the past 7 days</p>

            {moodTotal > 0 ? (
              <div className="space-y-4">
                {chartSeries.map((item) => (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                      <span className="inline-flex px-2 py-0.5 bg-gray-100 rounded text-xs font-bold text-gray-600">
                        {item.count} ({item.pct}%)
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.pct}%`, backgroundColor: moodVisual[item.key]?.color || "#8EC5FF" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">No mood distribution available yet.</p>
                <p className="text-xs text-gray-400 mt-1">Add a few check-ins and this chart will appear.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default InsightsPage;
