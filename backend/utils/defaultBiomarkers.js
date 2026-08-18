const defaultBiomarkers = [
  {
    "name": "Hemoglobin",
    "aliases": [
      "Hb",
      "Hgb",
      "Haemoglobin",
      "Hemoglobin Level",
      "Total Hemoglobin"
    ],
    "unit": "g/dL",
    "category": "blood",
    "ranges": {
      "normalMin": 13,
      "normalMax": 17
    },
    "thresholds": {
      "low": 13,
      "high": 17
    },
    "weight": 0.9,
    "recommendations": {
      "low": {
        "immediate": [
          "Consult a doctor for anemia screening and dietary iron evaluation."
        ],
        "daily": [
          "Include iron-rich foods like leafy greens, lentils, and lean red meat.",
          "Pair iron sources with vitamin C (citrus, bell peppers) for better absorption."
        ]
      },
      "high": {
        "immediate": [
          "Stay well hydrated and consult a physician to evaluate elevated hemoglobin."
        ],
        "daily": [
          "Drink 8-10 glasses of water throughout the day.",
          "Avoid smoking and monitor blood pressure regularly."
        ]
      },
      "normal": {
        "daily": [
          "Maintain a balanced diet rich in iron and B vitamins.",
          "Stay consistently hydrated during daily activities and exercise."
        ]
      }
    },
    "explanations": {
      "low": "Hemoglobin is below normal, indicating potential anemia or iron deficiency.",
      "normal": "Hemoglobin is within the healthy range, ensuring optimal oxygen transport across your body.",
      "high": "Hemoglobin is elevated, which can be caused by dehydration, smoking, or lung adaptation.",
      "notFound": "Hemoglobin value could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Low levels may be associated with fatigue or reduced energy."
  },
  {
    "name": "White Blood Cells",
    "aliases": [
      "WBC",
      "White Cell Count",
      "Total WBC",
      "WBC Count",
      "Leukocytes"
    ],
    "unit": "/µL",
    "category": "blood",
    "ranges": {
      "normalMin": 4000,
      "normalMax": 11000
    },
    "thresholds": {
      "low": 4000,
      "high": 11000
    },
    "weight": 0.9,
    "recommendations": {
      "low": {
        "immediate": [
          "Avoid close contact with sick individuals and seek medical evaluation."
        ],
        "daily": [
          "Prioritize 7-8 hours of quality sleep nightly to support immune recovery.",
          "Focus on antioxidant-rich fruits and vegetables in your meals."
        ]
      },
      "high": {
        "immediate": [
          "Check for signs of infection or inflammation and consult your doctor."
        ],
        "daily": [
          "Practice daily stress management techniques such as deep breathing.",
          "Stay well hydrated and allow your body adequate rest."
        ]
      },
      "normal": {
        "daily": [
          "Support immune health with regular exercise and nutritious whole foods.",
          "Maintain consistent sleep hygiene."
        ]
      }
    },
    "explanations": {
      "low": "White Blood Cell count is low, which may weaken your immune system's ability to fight infections.",
      "normal": "White Blood Cell count is normal, indicating a healthy and responsive immune system.",
      "high": "White Blood Cell count is high, suggesting an active immune response, inflammation, or recent infection.",
      "notFound": "White Blood Cell count could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Elevated levels can overlap with stress or immune responses."
  },
  {
    "name": "Red Blood Cells",
    "aliases": [
      "RBC",
      "Red Cell Count",
      "Total RBC",
      "RBC Count",
      "Erythrocytes"
    ],
    "unit": "million/µL",
    "category": "blood",
    "ranges": {
      "normalMin": 4.5,
      "normalMax": 5.9
    },
    "thresholds": {
      "low": 4.5,
      "high": 5.9
    },
    "weight": 0.8,
    "recommendations": {
      "low": {
        "immediate": [
          "Consult a doctor to check B12, folate, and iron levels."
        ],
        "daily": [
          "Eat nutrient-dense foods including eggs, fish, legumes, and dark greens.",
          "Avoid excessive tea or coffee consumption directly with meals."
        ]
      },
      "high": {
        "immediate": [
          "Consult a healthcare provider and increase fluid intake."
        ],
        "daily": [
          "Engage in regular aerobic exercise to support cardiovascular circulation.",
          "Drink plenty of water daily to maintain healthy blood viscosity."
        ]
      },
      "normal": {
        "daily": [
          "Maintain a varied whole-food diet with essential vitamins and minerals.",
          "Stay physically active with regular cardiovascular workouts."
        ]
      }
    },
    "explanations": {
      "low": "Red Blood Cell count is low, which can reduce oxygen delivery and cause fatigue or weakness.",
      "normal": "Red Blood Cell count is normal, supporting optimal oxygen delivery to tissues and organs.",
      "high": "Red Blood Cell count is elevated, which may increase blood thickness and workload on the heart.",
      "notFound": "Red Blood Cell count could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Low levels may be relevant to fatigue, weakness, or low energy."
  },
  {
    "name": "Platelet Count",
    "aliases": [
      "PLT",
      "Platelets",
      "Total Platelets",
      "Thrombocytes",
      "Platelet"
    ],
    "unit": "/µL",
    "category": "blood",
    "ranges": {
      "normalMin": 150000,
      "normalMax": 450000
    },
    "thresholds": {
      "low": 150000,
      "high": 450000
    },
    "weight": 0.8,
    "recommendations": {
      "low": {
        "immediate": [
          "Avoid activities with high risk of injury or bruising and consult a physician."
        ],
        "daily": [
          "Include vitamin K-rich foods like spinach, broccoli, and kale in your diet.",
          "Avoid over-the-counter NSAID pain relievers unless prescribed by a doctor."
        ]
      },
      "high": {
        "immediate": [
          "Consult a physician to investigate potential underlying inflammation or iron deficiency."
        ],
        "daily": [
          "Maintain an anti-inflammatory diet rich in omega-3 fatty acids and antioxidants.",
          "Stay well hydrated throughout the day."
        ]
      },
      "normal": {
        "daily": [
          "Eat a balanced diet supporting overall vascular and cardiovascular health.",
          "Engage in regular moderate physical activity."
        ]
      }
    },
    "explanations": {
      "low": "Platelet count is low, which can affect blood clotting efficiency and increase bruising tendency.",
      "normal": "Platelet count is normal, ensuring proper blood clotting and healthy vascular integrity.",
      "high": "Platelet count is elevated, which can be linked to inflammation, iron deficiency, or physical stress.",
      "notFound": "Platelet count could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Abnormalities may sometimes relate to physical stress or systemic inflammation."
  },
  {
    "name": "Hematocrit",
    "aliases": [
      "HCT",
      "PCV",
      "Packed Cell Volume",
      "Haematocrit"
    ],
    "unit": "%",
    "category": "blood",
    "ranges": {
      "normalMin": 40,
      "normalMax": 50
    },
    "thresholds": {
      "low": 40,
      "high": 50
    },
    "weight": 0.7,
    "recommendations": {
      "low": {
        "immediate": [
          "Discuss iron and nutritional intake with your healthcare provider."
        ],
        "daily": [
          "Incorporate lean proteins, legumes, and dark leafy greens into your daily meals.",
          "Allow adequate rest if experiencing dizziness or physical fatigue."
        ]
      },
      "high": {
        "immediate": [
          "Increase water intake immediately and consult a doctor."
        ],
        "daily": [
          "Drink 8-10 glasses of clean water daily to support hydration.",
          "Limit alcohol and caffeine consumption, which can contribute to dehydration."
        ]
      },
      "normal": {
        "daily": [
          "Keep up good daily hydration habits.",
          "Eat a balanced diet rich in essential micronutrients and proteins."
        ]
      }
    },
    "explanations": {
      "low": "Hematocrit is low, meaning the percentage of red blood cells in your bloodstream is below normal.",
      "normal": "Hematocrit is within the healthy range, indicating optimal red blood cell volume and hydration.",
      "high": "Hematocrit is high, often pointing to dehydration or elevated red blood cell production.",
      "notFound": "Hematocrit value could not be determined from the report."
    },
    "priority": "medium",
    "isActive": true,
    "mentalHealthRelevance": "Low levels may be relevant to fatigue or reduced energy."
  },
  {
    "name": "MCV",
    "aliases": [
      "Mean Corpuscular Volume",
      "MCV Level"
    ],
    "unit": "fL",
    "category": "blood",
    "ranges": {
      "normalMin": 80,
      "normalMax": 100
    },
    "thresholds": {
      "low": 80,
      "high": 100
    },
    "weight": 0.6,
    "recommendations": {
      "low": {
        "immediate": [
          "Get screened for iron deficiency anemia by your doctor."
        ],
        "daily": [
          "Eat iron-rich foods such as beans, lentils, spinach, and fortified grains.",
          "Combine iron foods with citrus fruits to boost absorption."
        ]
      },
      "high": {
        "immediate": [
          "Check Vitamin B12 and Folate levels with your doctor."
        ],
        "daily": [
          "Include B12 sources like eggs, dairy, fish, or fortified plant milks.",
          "Eat folate-rich greens, avocado, and legumes regularly."
        ]
      },
      "normal": {
        "daily": [
          "Maintain a diverse whole-food diet with adequate B vitamins and iron.",
          "Practice consistent, balanced nutrition."
        ]
      }
    },
    "explanations": {
      "low": "MCV is low, indicating red blood cells are smaller than average, commonly due to iron deficiency.",
      "normal": "MCV is normal, indicating red blood cells are of healthy size and volume.",
      "high": "MCV is high, indicating enlarged red blood cells, often associated with Vitamin B12 or folate deficiency.",
      "notFound": "MCV value could not be determined from the report."
    },
    "priority": "medium",
    "isActive": true,
    "mentalHealthRelevance": "Abnormalities may be associated with nutritional deficiencies that overlap with mood or cognitive symptoms."
  },
  {
    "name": "MCH",
    "aliases": [
      "Mean Corpuscular Hemoglobin",
      "MCH Level",
      "Mean Corpuscular Haemoglobin"
    ],
    "unit": "pg",
    "category": "blood",
    "ranges": {
      "normalMin": 27,
      "normalMax": 33
    },
    "thresholds": {
      "low": 27,
      "high": 33
    },
    "weight": 0.6,
    "recommendations": {
      "low": {
        "immediate": [
          "Review iron intake and consult a healthcare provider."
        ],
        "daily": [
          "Add iron and vitamin C rich foods to your daily meals.",
          "Monitor energy levels during workouts and daily routines."
        ]
      },
      "high": {
        "immediate": [
          "Consult a physician for a B-vitamin and folate evaluation."
        ],
        "daily": [
          "Ensure adequate dietary intake of folate and Vitamin B12.",
          "Maintain a balanced whole-food diet."
        ]
      },
      "normal": {
        "daily": [
          "Continue a nutrient-dense diet supporting blood cell formation.",
          "Stay consistent with daily hydration and sleep schedules."
        ]
      }
    },
    "explanations": {
      "low": "MCH is low, meaning red blood cells carry less hemoglobin by weight than normal.",
      "normal": "MCH is normal, indicating healthy hemoglobin weight per red blood cell.",
      "high": "MCH is elevated, often correlating with macrocytic (enlarged) red blood cells.",
      "notFound": "MCH value could not be determined from the report."
    },
    "priority": "medium",
    "isActive": true,
    "mentalHealthRelevance": "Abnormalities may be associated with nutritional deficiencies that overlap with fatigue."
  },
  {
    "name": "MCHC",
    "aliases": [
      "Mean Corpuscular Hemoglobin Concentration",
      "MCHC Level"
    ],
    "unit": "g/dL",
    "category": "blood",
    "ranges": {
      "normalMin": 32,
      "normalMax": 36
    },
    "thresholds": {
      "low": 32,
      "high": 36
    },
    "weight": 0.6,
    "recommendations": {
      "low": {
        "immediate": [
          "Consult a physician for a complete iron profile check."
        ],
        "daily": [
          "Incorporate legumes, nuts, seeds, and leafy greens into your meals.",
          "Avoid drinking tea or coffee directly with meals."
        ]
      },
      "high": {
        "immediate": [
          "Stay well hydrated and discuss results with your healthcare provider."
        ],
        "daily": [
          "Drink plenty of water and fluids throughout the day.",
          "Eat balanced meals at regular intervals."
        ]
      },
      "normal": {
        "daily": [
          "Maintain good daily hydration and a balanced diet.",
          "Engage in routine physical activity."
        ]
      }
    },
    "explanations": {
      "low": "MCHC is low, indicating decreased hemoglobin concentration inside red blood cells.",
      "normal": "MCHC is normal, reflecting optimal hemoglobin density in red blood cells.",
      "high": "MCHC is high, which can occur in concentrated blood or certain red cell shape variations.",
      "notFound": "MCHC value could not be determined from the report."
    },
    "priority": "medium",
    "isActive": true,
    "mentalHealthRelevance": "Abnormalities may be associated with nutritional deficiencies that overlap with fatigue."
  },
  {
    "name": "Fasting Blood Sugar",
    "aliases": [
      "FBS",
      "Fasting Blood Glucose",
      "FBG",
      "Blood Sugar Fasting",
      "Glucose Fasting",
      "Fasting Glucose",
      "Blood Glucose"
    ],
    "unit": "mg/dL",
    "category": "blood",
    "ranges": {
      "normalMin": 70,
      "normalMax": 100
    },
    "thresholds": {
      "low": 70,
      "high": 100
    },
    "weight": 1,
    "recommendations": {
      "low": {
        "immediate": [
          "Consume a fast-acting carbohydrate like fruit juice or glucose tablets if feeling dizzy or shaky."
        ],
        "daily": [
          "Eat balanced meals containing complex carbs, protein, and healthy fats every 4-5 hours.",
          "Avoid skipping breakfast or going long periods without food."
        ]
      },
      "high": {
        "immediate": [
          "Consult a physician for HbA1c testing and metabolic evaluation."
        ],
        "daily": [
          "Take a 15-minute brisk walk after meals to help lower post-meal blood glucose.",
          "Reduce intake of refined sugars, sweetened beverages, and processed carbohydrates.",
          "Prioritize daily fiber intake from vegetables, legumes, and whole grains."
        ]
      },
      "normal": {
        "daily": [
          "Maintain a consistent exercise routine with cardio and strength training.",
          "Choose whole grain carbohydrates over refined sugars.",
          "Aim for 7-8 hours of quality sleep nightly to support insulin sensitivity."
        ]
      }
    },
    "explanations": {
      "low": "Fasting blood sugar is below normal (hypoglycemia), which can cause dizziness, shakiness, and fatigue.",
      "normal": "Fasting blood sugar is optimal, reflecting excellent insulin sensitivity and metabolic health.",
      "high": "Fasting blood sugar is elevated, which may indicate prediabetes or impaired glucose tolerance.",
      "notFound": "Fasting blood sugar value could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Fluctuations may be relevant to energy levels, brain fog, or mood stability."
  },
  {
    "name": "Total Cholesterol",
    "aliases": [
      "Cholesterol Total",
      "Serum Total Cholesterol",
      "TC",
      "Cholesterol"
    ],
    "unit": "mg/dL",
    "category": "blood",
    "ranges": {
      "normalMin": 120,
      "normalMax": 200
    },
    "thresholds": {
      "low": 120,
      "high": 200
    },
    "weight": 0.9,
    "recommendations": {
      "low": {
        "immediate": [
          "Discuss lipid levels with your physician during routine checkups."
        ],
        "daily": [
          "Include healthy fats like avocados, olive oil, nuts, and seeds in your diet.",
          "Maintain balanced overall nutrition."
        ]
      },
      "high": {
        "immediate": [
          "Consult a doctor for a full cardiovascular risk assessment and dietary guidance."
        ],
        "daily": [
          "Incorporate soluble fiber sources such as oats, flaxseeds, and beans daily.",
          "Replace saturated fats with heart-healthy olive oil and omega-3 rich fish.",
          "Engage in 30 minutes of aerobic exercise at least 5 days a week."
        ]
      },
      "normal": {
        "daily": [
          "Continue eating heart-healthy fats and plenty of dietary fiber.",
          "Stay active with regular cardiovascular workouts.",
          "Avoid trans fats and excessive fried foods."
        ]
      }
    },
    "explanations": {
      "low": "Total cholesterol is very low, which is generally safe but should be monitored if accompanied by fatigue.",
      "normal": "Total cholesterol is within the healthy desirable range, supporting cardiovascular wellness.",
      "high": "Total cholesterol is elevated above desirable limits, which can increase arterial plaque buildup over time.",
      "notFound": "Total cholesterol value could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Extremes may sometimes be associated with mood or cognitive changes over time."
  },
  {
    "name": "LDL Cholesterol",
    "aliases": [
      "LDL",
      "LDL-C",
      "Low Density Lipoprotein",
      "Bad Cholesterol",
      "LDL Level"
    ],
    "unit": "mg/dL",
    "category": "blood",
    "ranges": {
      "normalMin": 50,
      "normalMax": 100
    },
    "thresholds": {
      "low": 50,
      "high": 100
    },
    "weight": 0.9,
    "recommendations": {
      "low": {
        "immediate": [
          "No action needed; continue healthy lifestyle habits."
        ],
        "daily": [
          "Maintain a balanced diet with essential fatty acids.",
          "Stay physically active."
        ]
      },
      "high": {
        "immediate": [
          "Consult your healthcare provider to discuss heart-healthy dietary changes or lipid management."
        ],
        "daily": [
          "Eat a bowl of oatmeal or chia seeds daily to bind and remove excess LDL.",
          "Limit red meat, full-fat dairy, and processed bakery goods.",
          "Add 30 minutes of brisk walking, cycling, or swimming to your daily routine."
        ]
      },
      "normal": {
        "daily": [
          "Keep prioritizing whole foods, vegetables, and lean proteins.",
          "Maintain regular cardiovascular exercise.",
          "Snack on raw nuts like almonds or walnuts in moderation."
        ]
      }
    },
    "explanations": {
      "low": "LDL cholesterol is low, which is excellent for heart health and cardiovascular protection.",
      "normal": "LDL cholesterol is at an optimal level, keeping artery walls healthy and clear.",
      "high": "LDL cholesterol is high ('bad cholesterol'), increasing the risk of cardiovascular atherosclerosis.",
      "notFound": "LDL cholesterol value could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Abnormalities may overlap with broader metabolic health, which supports overall cognitive function."
  },
  {
    "name": "HDL Cholesterol",
    "aliases": [
      "HDL",
      "HDL-C",
      "High Density Lipoprotein",
      "Good Cholesterol",
      "HDL Level"
    ],
    "unit": "mg/dL",
    "category": "blood",
    "ranges": {
      "normalMin": 40,
      "normalMax": 80
    },
    "thresholds": {
      "low": 40,
      "high": 80
    },
    "weight": 0.9,
    "recommendations": {
      "low": {
        "immediate": [
          "Discuss strategies to raise HDL with your healthcare provider."
        ],
        "daily": [
          "Engage in regular aerobic exercise and high-intensity interval training (HIIT).",
          "Incorporate healthy omega-3 fats from salmon, walnuts, and extra virgin olive oil.",
          "Avoid smoking and limit refined carbohydrate intake."
        ]
      },
      "high": {
        "immediate": [
          "No medical intervention needed; excellent heart protection."
        ],
        "daily": [
          "Maintain your current healthy exercise and dietary habits.",
          "Continue consuming heart-healthy fats."
        ]
      },
      "normal": {
        "daily": [
          "Engage in regular physical activity to keep HDL levels strong.",
          "Use extra virgin olive oil as your primary cooking fat.",
          "Eat fatty fish like salmon or sardines twice a week."
        ]
      }
    },
    "explanations": {
      "low": "HDL ('good cholesterol') is low, reducing your body's natural ability to clear bad cholesterol from arteries.",
      "normal": "HDL cholesterol is normal and protective, actively clearing excess cholesterol from your bloodstream.",
      "high": "HDL cholesterol is high, which is generally protective and beneficial for cardiovascular health.",
      "notFound": "HDL cholesterol value could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Lower levels may be relevant to metabolic health, which supports overall cognitive function."
  },
  {
    "name": "Triglycerides",
    "aliases": [
      "TG",
      "Trigs",
      "Serum Triglycerides",
      "Triglyceride Level",
      "Triglyceride"
    ],
    "unit": "mg/dL",
    "category": "blood",
    "ranges": {
      "normalMin": 50,
      "normalMax": 150
    },
    "thresholds": {
      "low": 50,
      "high": 150
    },
    "weight": 0.8,
    "recommendations": {
      "low": {
        "immediate": [
          "No action required; maintain balanced nutrition."
        ],
        "daily": [
          "Eat regular balanced meals.",
          "Continue healthy physical activity."
        ]
      },
      "high": {
        "immediate": [
          "Consult a physician for metabolic evaluation and dietary adjustments."
        ],
        "daily": [
          "Significantly reduce intake of sugary drinks, sweets, and refined carbohydrates.",
          "Limit or eliminate alcohol consumption, which directly spikes triglycerides.",
          "Engage in 30-45 minutes of daily cardiovascular exercise."
        ]
      },
      "normal": {
        "daily": [
          "Limit added sugars and refined carbohydrates in your everyday diet.",
          "Maintain a regular exercise schedule.",
          "Choose whole fruits over fruit juices."
        ]
      }
    },
    "explanations": {
      "low": "Triglycerides are low, which indicates efficient fat metabolism and low cardiovascular risk.",
      "normal": "Triglycerides are in the ideal healthy range, reflecting good dietary balance and energy metabolism.",
      "high": "Triglycerides are elevated, often caused by excess dietary sugar, refined carbs, or alcohol.",
      "notFound": "Triglycerides value could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Elevated levels can be relevant to metabolic health, which supports overall cognitive function."
  },
  {
    "name": "Vitamin D",
    "aliases": [
      "25-OH Vitamin D",
      "Vitamin D3",
      "Serum Vitamin D",
      "25-Hydroxyvitamin D",
      "Vit D"
    ],
    "unit": "ng/mL",
    "category": "vitamin",
    "ranges": {
      "normalMin": 30,
      "normalMax": 100
    },
    "thresholds": {
      "low": 30,
      "high": 100
    },
    "weight": 0.8,
    "recommendations": {
      "low": {
        "immediate": [
          "Consult a physician regarding Vitamin D3 supplementation."
        ],
        "daily": [
          "Spend 15-20 minutes in morning sunlight daily when possible.",
          "Consume fortified dairy, eggs, or fatty fish like salmon and mackerel."
        ]
      },
      "high": {
        "immediate": [
          "Pause Vitamin D supplements and consult a doctor."
        ],
        "daily": [
          "Maintain adequate daily hydration.",
          "Monitor dietary calcium intake."
        ]
      },
      "normal": {
        "daily": [
          "Continue regular outdoor activities and sun exposure.",
          "Maintain a balanced diet with natural vitamin sources."
        ]
      }
    },
    "explanations": {
      "low": "Vitamin D is low, which can impact bone density, immune function, muscle strength, and mood.",
      "normal": "Vitamin D is within the optimal range, supporting bone strength and immune resilience.",
      "high": "Vitamin D is elevated above normal limits, which can lead to excess calcium absorption.",
      "notFound": "Vitamin D value could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Low levels may be associated with low mood, fatigue, and cognitive symptoms."
  },
  {
    "name": "Vitamin B12",
    "aliases": [
      "B12",
      "Serum B12",
      "Cobalamin",
      "Vitamin B-12",
      "Vit B12"
    ],
    "unit": "pg/mL",
    "category": "vitamin",
    "ranges": {
      "normalMin": 300,
      "normalMax": 900
    },
    "thresholds": {
      "low": 300,
      "high": 900
    },
    "weight": 0.7,
    "recommendations": {
      "low": {
        "immediate": [
          "Consult a doctor about B12 supplementation or injections."
        ],
        "daily": [
          "Include eggs, dairy, meat, or nutritional yeast in your regular diet.",
          "Monitor energy levels and any neurological symptoms like tingling."
        ]
      },
      "high": {
        "immediate": [
          "Review dietary supplements containing B12 with your doctor."
        ],
        "daily": [
          "Stay well hydrated.",
          "Maintain a balanced whole-food diet."
        ]
      },
      "normal": {
        "daily": [
          "Continue eating B12-containing foods regularly.",
          "Maintain a healthy, active lifestyle."
        ]
      }
    },
    "explanations": {
      "low": "Vitamin B12 is low, which can cause nerve tingling, fatigue, memory issues, and anemia.",
      "normal": "Vitamin B12 is normal, supporting healthy nerve function, red blood cell formation, and energy.",
      "high": "Vitamin B12 is high, usually harmless if supplemented, but should be evaluated if unsupplemented.",
      "notFound": "Vitamin B12 value could not be determined from the report."
    },
    "priority": "medium",
    "isActive": true,
    "mentalHealthRelevance": "Low levels may be relevant to fatigue, memory issues, or cognitive symptoms."
  },
  {
    "name": "TSH",
    "aliases": [
      "Thyroid Stimulating Hormone",
      "Serum TSH",
      "Thyrotropin"
    ],
    "unit": "mIU/L",
    "category": "hormone",
    "ranges": {
      "normalMin": 0.4,
      "normalMax": 4
    },
    "thresholds": {
      "low": 0.4,
      "high": 4
    },
    "weight": 0.9,
    "recommendations": {
      "low": {
        "immediate": [
          "Schedule a comprehensive thyroid panel (Free T3/T4) with your physician."
        ],
        "daily": [
          "Avoid excess iodine or stimulants like caffeine.",
          "Practice daily relaxation and stress-reducing activities."
        ]
      },
      "high": {
        "immediate": [
          "Consult an endocrinologist or physician for thyroid evaluation and support."
        ],
        "daily": [
          "Ensure adequate selenium and zinc in your diet (e.g., brazil nuts, seeds).",
          "Get consistent, quality rest nightly."
        ]
      },
      "normal": {
        "daily": [
          "Maintain a balanced diet supporting endocrine and metabolic health.",
          "Manage daily stress levels effectively."
        ]
      }
    },
    "explanations": {
      "low": "TSH is low, which may suggest an overactive thyroid (hyperthyroidism) or excess thyroid medication.",
      "normal": "TSH is in the normal range, indicating balanced thyroid hormone regulation and metabolism.",
      "high": "TSH is high, which often indicates an underactive thyroid (hypothyroidism) requiring more effort from the pituitary gland.",
      "notFound": "TSH value could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Thyroid abnormalities may overlap with mood, energy, or concentration-related symptoms."
  },
  {
    "name": "Creatinine",
    "aliases": [
      "Serum Creatinine",
      "Creat",
      "Cr",
      "Blood Creatinine"
    ],
    "unit": "mg/dL",
    "category": "blood",
    "ranges": {
      "normalMin": 0.6,
      "normalMax": 1.2
    },
    "thresholds": {
      "low": 0.6,
      "high": 1.2
    },
    "weight": 0.9,
    "recommendations": {
      "low": {
        "immediate": [
          "No urgent action required; discuss during routine checkup."
        ],
        "daily": [
          "Engage in strength training to support healthy muscle mass.",
          "Eat adequate dietary protein from lean sources."
        ]
      },
      "high": {
        "immediate": [
          "Increase water intake and consult a doctor immediately for kidney evaluation."
        ],
        "daily": [
          "Drink 8-10 glasses of clean water daily.",
          "Avoid NSAID pain relievers like ibuprofen without medical advice."
        ]
      },
      "normal": {
        "daily": [
          "Stay well hydrated every day to support kidney filtration.",
          "Maintain a balanced diet and regular exercise routine."
        ]
      }
    },
    "explanations": {
      "low": "Creatinine is low, which can sometimes be related to low muscle mass or low protein intake.",
      "normal": "Creatinine is within the healthy range, indicating good kidney function and filtration.",
      "high": "Creatinine is elevated, which may indicate dehydration or impaired kidney filtration efficiency.",
      "notFound": "Creatinine value could not be determined from the report."
    },
    "priority": "high",
    "isActive": true,
    "mentalHealthRelevance": "Abnormalities may overlap with systemic health affecting energy and fatigue."
  },
  {
    "name": "ALT",
    "aliases": [
      "SGPT",
      "Alanine Aminotransferase",
      "Serum ALT",
      "ALT/SGPT"
    ],
    "unit": "U/L",
    "category": "blood",
    "ranges": {
      "normalMin": 7,
      "normalMax": 56
    },
    "thresholds": {
      "low": 7,
      "high": 56
    },
    "weight": 0.8,
    "recommendations": {
      "low": {
        "immediate": [
          "No action required."
        ],
        "daily": [
          "Maintain a healthy lifestyle and balanced nutrition."
        ]
      },
      "high": {
        "immediate": [
          "Consult a physician for a liver function evaluation."
        ],
        "daily": [
          "Limit or eliminate alcohol intake completely.",
          "Avoid unnecessary medications or herbal supplements without medical guidance.",
          "Eat a whole-food diet rich in antioxidants and vegetables."
        ]
      },
      "normal": {
        "daily": [
          "Continue protecting liver health by limiting alcohol and processed foods.",
          "Stay active with daily exercise."
        ]
      }
    },
    "explanations": {
      "low": "ALT is low, which is generally normal and not clinically significant.",
      "normal": "ALT is normal, reflecting healthy liver enzyme levels and intact liver cells.",
      "high": "ALT is elevated above normal limits, which can indicate liver stress, inflammation, or fatty liver.",
      "notFound": "ALT value could not be determined from the report."
    },
    "priority": "medium",
    "isActive": true,
    "mentalHealthRelevance": "Liver stress may sometimes be associated with fatigue or lethargy."
  },
  {
    "name": "AST",
    "aliases": [
      "SGOT",
      "Aspartate Aminotransferase",
      "Serum AST",
      "AST/SGOT"
    ],
    "unit": "U/L",
    "category": "blood",
    "ranges": {
      "normalMin": 10,
      "normalMax": 40
    },
    "thresholds": {
      "low": 10,
      "high": 40
    },
    "weight": 0.8,
    "recommendations": {
      "low": {
        "immediate": [
          "No action required."
        ],
        "daily": [
          "Maintain healthy daily habits."
        ]
      },
      "high": {
        "immediate": [
          "Consult your doctor for further enzyme evaluation."
        ],
        "daily": [
          "Avoid alcohol and hepatotoxic substances.",
          "Rest if recovering from intense physical exertion or muscle strain."
        ]
      },
      "normal": {
        "daily": [
          "Maintain a balanced diet and regular hydration.",
          "Keep up healthy lifestyle habits."
        ]
      }
    },
    "explanations": {
      "low": "AST is low, which is normal and not a cause for concern.",
      "normal": "AST is within the normal range, indicating healthy liver and muscle tissue integrity.",
      "high": "AST is elevated, which may indicate cellular stress in the liver, muscles, or heart.",
      "notFound": "AST value could not be determined from the report."
    },
    "priority": "medium",
    "isActive": true,
    "mentalHealthRelevance": "Liver stress may sometimes be associated with fatigue or lethargy."
  },
  {
    "name": "Folate",
    "aliases": [
      "Vitamin B9",
      "Folic Acid",
      "Serum Folate"
    ],
    "unit": "ng/mL",
    "category": "vitamin",
    "ranges": {
      "normalMin": 3,
      "normalMax": 20
    },
    "thresholds": {
      "low": 3,
      "high": 20
    },
    "weight": 0.7,
    "recommendations": {
      "low": {
        "immediate": [
          "Consult a physician regarding folate supplementation."
        ],
        "daily": [
          "Increase intake of leafy greens, beans, and fortified grains.",
          "Maintain a balanced diet."
        ]
      },
      "high": {
        "immediate": [
          "Review dietary supplements with your doctor."
        ],
        "daily": [
          "Maintain adequate hydration.",
          "Eat a balanced diet."
        ]
      },
      "normal": {
        "daily": [
          "Continue eating folate-rich foods.",
          "Maintain a healthy lifestyle."
        ]
      }
    },
    "explanations": {
      "low": "Folate is low, which can impact red blood cell formation and nervous system function.",
      "normal": "Folate is within the optimal range, supporting cell division and nervous system health.",
      "high": "Folate is elevated, usually harmless if supplemented, but should be evaluated if unsupplemented.",
      "notFound": "Folate value could not be determined from the report."
    },
    "priority": "medium",
    "isActive": true,
    "mentalHealthRelevance": "Low levels may be associated with mood changes, fatigue, or cognitive symptoms."
  },
  {
    "name": "Ferritin",
    "aliases": [
      "Serum Ferritin",
      "Iron Storage"
    ],
    "unit": "ng/mL",
    "category": "blood",
    "ranges": {
      "normalMin": 15,
      "normalMax": 200
    },
    "thresholds": {
      "low": 15,
      "high": 200
    },
    "weight": 0.8,
    "recommendations": {
      "low": {
        "immediate": [
          "Consult a physician for anemia screening and iron evaluation."
        ],
        "daily": [
          "Include iron-rich foods like leafy greens, lentils, and lean red meat.",
          "Pair iron sources with vitamin C for better absorption."
        ]
      },
      "high": {
        "immediate": [
          "Consult a physician to evaluate elevated iron storage."
        ],
        "daily": [
          "Maintain a balanced diet and regular exercise.",
          "Avoid excessive iron supplementation without medical advice."
        ]
      },
      "normal": {
        "daily": [
          "Maintain a balanced diet rich in essential nutrients.",
          "Stay consistently hydrated during daily activities."
        ]
      }
    },
    "explanations": {
      "low": "Ferritin is low, indicating depleted iron stores which can lead to anemia.",
      "normal": "Ferritin is within the healthy range, indicating adequate iron storage.",
      "high": "Ferritin is elevated, which can be caused by inflammation, infection, or iron overload.",
      "notFound": "Ferritin value could not be determined from the report."
    },
    "priority": "medium",
    "isActive": true,
    "mentalHealthRelevance": "Low levels may be associated with fatigue, low energy, or restless legs."
  },
  {
    "name": "Magnesium",
    "aliases": [
      "Serum Magnesium",
      "Mg"
    ],
    "unit": "mg/dL",
    "category": "blood",
    "ranges": {
      "normalMin": 1.7,
      "normalMax": 2.2
    },
    "thresholds": {
      "low": 1.7,
      "high": 2.2
    },
    "weight": 0.7,
    "recommendations": {
      "low": {
        "immediate": [
          "Consult a physician regarding magnesium evaluation."
        ],
        "daily": [
          "Include magnesium-rich foods like nuts, seeds, and leafy greens.",
          "Maintain adequate hydration."
        ]
      },
      "high": {
        "immediate": [
          "Review dietary supplements and antacids with your doctor."
        ],
        "daily": [
          "Maintain adequate hydration.",
          "Eat a balanced diet."
        ]
      },
      "normal": {
        "daily": [
          "Continue eating a nutrient-dense diet.",
          "Maintain a healthy lifestyle."
        ]
      }
    },
    "explanations": {
      "low": "Magnesium is low, which can impact muscle and nerve function.",
      "normal": "Magnesium is within the optimal range, supporting healthy muscle and nerve function.",
      "high": "Magnesium is elevated, often related to excessive supplementation or kidney function.",
      "notFound": "Magnesium value could not be determined from the report."
    },
    "priority": "medium",
    "isActive": true,
    "mentalHealthRelevance": "Low levels may overlap with anxiety, fatigue, or sleep disturbances."
  }
];

module.exports = defaultBiomarkers;
