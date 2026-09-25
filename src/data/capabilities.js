// Capabilities, patched to where they were used. A technology only appears
// here if the source material ties it to a role, project or credential.

export const capabilitiesIntro = {
  heading: "The toolkit, patched to where it was used.",
  hint: "Select a capability to light the work it shows up in."
};

export const contexts = [
  { id: "programmes", label: "Global programmes", detail: "Technology Manager, 2024 to now" },
  { id: "refinery", label: "Data Refinery", detail: "Connectors and Data Serve" },
  { id: "payments", label: "Enrollment & Transactions", detail: "ACH payments, banking" },
  { id: "taxonomy", label: "Taxonomy", detail: "Campaign identifiers, media" },
  { id: "pods", label: "Advertising pods", detail: "Three parallel pods, 2019 to 2021" },
  { id: "ai", label: "AI proofs of concept", detail: "LLM and data-intelligence POCs" },
  { id: "early", label: "Earlier builds", detail: "TruckBoard, URL Shortener, StormSmart, internal tools" },
  { id: "certified", label: "Certified", detail: "Proctored exams and professional credentials" }
];

export const capabilityGroups = [
  {
    id: "leadership",
    label: "Engineering leadership",
    items: [
      { name: "Engineering management", usedIn: ["programmes", "payments", "refinery"] },
      { name: "Stakeholder alignment across US, UK, SA", usedIn: ["programmes", "payments"] },
      { name: "Mentoring", usedIn: ["programmes", "pods"] },
      { name: "Agile leadership", usedIn: ["certified"] }
    ]
  },
  {
    id: "cloud",
    label: "Cloud and distributed systems",
    items: [
      { name: "AWS", usedIn: ["refinery", "certified"] },
      { name: "Azure", usedIn: ["refinery", "certified"] },
      { name: "Google Cloud", usedIn: ["refinery", "certified"] },
      { name: "Microservices and event-driven design", usedIn: ["programmes"] }
    ]
  },
  {
    id: "backend",
    label: "Backend and platforms",
    items: [
      { name: "Node.js", usedIn: ["pods", "early"] },
      { name: "GraphQL and Apollo", usedIn: ["pods", "certified"] },
      { name: "PHP and Laravel", usedIn: ["payments", "early"] },
      { name: "OAuth and API integration", usedIn: ["refinery", "payments"] }
    ]
  },
  {
    id: "data",
    label: "Data and persistence",
    items: [
      { name: "Snowflake", usedIn: ["refinery"] },
      { name: "Trifacta", usedIn: ["refinery"] },
      { name: "MySQL", usedIn: ["payments", "early"] },
      { name: "MongoDB", usedIn: ["early"] },
      { name: "PostgreSQL", usedIn: ["early"] }
    ]
  },
  {
    id: "frontend",
    label: "Frontend and product",
    items: [
      { name: "React and Redux", usedIn: ["pods", "payments", "early"] },
      { name: "Handsontable", usedIn: ["taxonomy"] },
      { name: "Google Maps and Places", usedIn: ["early"] }
    ]
  },
  {
    id: "ai",
    label: "AI and intelligent systems",
    items: [
      { name: "AI-assisted development", usedIn: ["programmes", "ai"] },
      { name: "LLM integration", usedIn: ["ai"] },
      { name: "XGBoost", usedIn: ["ai"] },
      { name: "AWS and Azure AI", usedIn: ["certified"] }
    ]
  }
];
