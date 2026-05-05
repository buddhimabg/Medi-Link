// @ts-nocheck
import React, { useState } from "react";
import "./FeaturePage.css";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";

const FeaturePage = ({ activePage, title, description }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage={activePage} collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
          <p className="text-gray-500 mt-2">{description}</p>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Module Ready</h2>
              <p className="text-sm text-gray-600 mt-2">
                This section is now independent from mood tracking and has its own sidebar route.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Quick Navigation</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="bg-[#0C5BD5] text-white px-4 py-2 rounded-lg hover:bg-[#0A4AB0] transition"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => navigate("/check-in")}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition"
                >
                  Mood Track
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FeaturePage;
