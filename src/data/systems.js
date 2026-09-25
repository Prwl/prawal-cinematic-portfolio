// Featured engineering work. Source: profile.projects, résumé "Key Projects",
// and the Data Refinery case-study asset. Client work is under NDA, so every
// diagram on the page is an abstraction of the published description.

export const systemsIntro = {
  heading: "Systems that other people depend on.",
  standfirst:
    "Three platforms from client work, told as the problems they solved. The motion diagrams are abstractions of each system's published shape, not architecture drawings."
};

export const caseStudies = [
  {
    id: "data-refinery",
    diagram: "pipeline",
    name: "Data Refinery",
    title: "Two hundred sources. One governed platform.",
    domain: "Media advertising",
    role: "Technical Lead, Team Lead",
    tenure: "Led from 2019",
    team: "Connectors team of 11",
    summary:
      "A governed data activation platform for Dentsu International's media advertising operations. It replaced fragmented data pipelines with three connected apps.",
    stages: [
      { name: "Connectors", detail: "Automated fetches from 200+ sources such as Facebook Ads and Google Campaign Manager, with OAuth flows and dynamic form generation." },
      { name: "Trifacta recipes", detail: "Reusable cleansing and enrichment, so a new source does not mean new engineering." },
      { name: "Data Serve", detail: "Scheduled, format-customised delivery to AWS S3, GCP, Azure ADLS, Snowflake, SFTP and analytics tools." }
    ],
    outcomes: [
      { figure: "200+", label: "data sources connected" },
      { figure: "87+", label: "sources live, each onboarded in 1-2 days" }
    ],
    stack: ["OAuth", "Trifacta", "AWS S3", "GCP", "Azure ADLS", "Snowflake", "SFTP"],
    diagramLabel: "Abstraction: many sources converge through connect, refine and serve stages, then fan out to storage and analytics destinations."
  },
  {
    id: "enrollment-transactions",
    diagram: "transactions",
    name: "Enrollment & Transactions",
    title: "Payment rails where trust is the product.",
    domain: "Banking, US client",
    role: "Team Lead, Engineering Dev Manager",
    tenure: "5.5 years",
    team: "Team of 6",
    summary:
      "A white-labeled ACH debit payment platform for merchant, mobile and web commerce, built for Buy It Mobility (now Spire). Full ownership of enrollment APIs, transaction operations, fraud detection and compliance reporting.",
    stages: [
      { name: "Enroll", detail: "Enrollment APIs and a client boarding wizard for merchants." },
      { name: "Verify", detail: "Banking-grade identity flows integrated with Plaid and Socure." },
      { name: "Score and screen", detail: "Scoring and fraud-detection workflows ahead of settlement." },
      { name: "Settle and report", detail: "Transaction management, ACH processing and compliance-grade reporting." }
    ],
    outcomes: [
      { figure: "160K+", label: "daily banking transactions" },
      { figure: "99.9%", label: "uptime" }
    ],
    stack: ["PHP", "MySQL", "React", "Plaid", "Socure"],
    diagramLabel: "Abstraction: transactions move from enrollment through identity verification and fraud screening to settlement; flagged ones are held at the screen."
  },
  {
    id: "taxonomy",
    diagram: "taxonomy",
    name: "Taxonomy",
    title: "Campaign naming as a dependency graph.",
    domain: "Media advertising",
    role: "Senior Developer",
    tenure: "7 months",
    team: "Team of 20",
    summary:
      "A spreadsheet-based taxonomy system that generates unique campaign identifiers, used in brand contexts including Coca-Cola and Microsoft. Every field could depend on another, so one edit had to settle the whole sheet correctly.",
    stages: [
      { name: "Name generator", detail: "Dynamically generated sheets that compose identifiers from structured campaign fields." },
      { name: "Dependency handling", detail: "Rules that propagate a change to every dependent field and adjust content automatically." },
      { name: "Performance", detail: "Performance optimization of the Handsontable grid, shipped in demo-ready sprint increments." }
    ],
    outcomes: [],
    stack: ["Handsontable"],
    diagramLabel: "Abstraction: editing one field lights every field that depends on it, down the sheet."
  }
];

// Everything else, kept findable without a card each.
export const workIndex = [
  {
    group: "Client work",
    items: [
      { name: "TruckBoard", detail: "Real-time truck and driver tracking, booking and map views with Google Maps and Places APIs. Transportation, US." },
      { name: "ACL URL Shortener", detail: "Single and batch shortening with reporting for banking promotional links. React, Node.js, MongoDB." },
      { name: "StormSmart", detail: "Employee, skills and admin workflows for a storm-prevention services business. Laravel, PostgreSQL." },
      { name: "Meeting booking and HR letters", detail: "Internal meeting-room booking, calendar invites and generated HR letters as PDFs. Laravel, Lumen." }
    ]
  },
  {
    group: "Independent builds",
    items: [
      { name: "Sunrise Public School", detail: "Public website for a school in Kandi.", href: "https://sunriseschoolkandi.org/" },
      { name: "Visual novel", detail: "A narrative game published on itch.io.", href: "https://prawalsharma.itch.io/praashi" },
      { name: "Anniversary RPG", detail: "A browser RPG with scene progression and a personal story.", href: "https://praashi.fun/" },
      { name: "Interactive lovebook", detail: "A Firebase-hosted storytelling experience.", href: "https://praashi-lovebook.web.app/" },
      { name: "Android notes app", detail: "Folders, editor and quick actions in an Android-first notes workflow." }
    ]
  }
];
