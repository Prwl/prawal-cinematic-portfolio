// Recognition archive. Source: profile.awards, mediaAssets.awardRecords,
// certificationAssets (proctored set), profile.certifications,
// profile.recommendations, conference records, book contribution.

export const recognition = {
  heading: "An archive, not a trophy shelf."
};

// `image` keys resolve through lib/media.js.
export const awards = [
  { title: "ESOP Ownership Achievement Award", date: "May 2026", image: "esop-ownership-2026", note: "Leadership Offsite 2026, for long-term contribution and an ownership mindset." },
  { title: "Outstanding Contribution Award", date: "May 2026", image: "outstanding-contribution-2026", note: "Leadership Offsite 2026, for impactful engineering initiatives and collaboration." },
  { title: "Employee of the Year", date: "April 2023", image: "employee-of-the-year-2023", note: "For exceptional contribution to organizational growth and delivery excellence." },
  { title: "Key Contributor Award", date: "April 2023", image: "key-contributor-2023", note: "For high-impact results across multiple projects." },
  { title: "Longevity Award", date: "April 2023", image: "longevity-2023", note: "For five years of contribution to Successive Digital." },
  { title: "Exceptional Performer", date: "March 2022", image: "exceptional-performer-2022", note: "For consistently exceeding performance benchmarks." },
  { title: "Extra Achiever's Award", date: "March 2021", image: "extra-achiever-2021", note: "For extra effort and commitment through lockdown remote delivery." },
  { title: "Client Happiness Award", date: "March 2019", image: "client-happiness-2019", note: "For sustained client satisfaction and engagement." },
  { title: "Star Performer of the Month", date: "February 2019", image: "star-performer-2019", note: "Monthly recognition, awarded a second time." },
  { title: "Star Performer of the Month", date: "July 2018", image: "star-performer-2018", note: "First Star Performer of the Month recognition." }
];

export const awardsIssuer = "Successive Digital";

// Proctored exams and professional certifications.
export const credentials = [
  { title: "AWS Certified Solutions Architect, Associate", issuer: "Amazon Web Services" },
  { title: "AWS Certified Developer, Associate", issuer: "Amazon Web Services" },
  { title: "AWS Certified AI Practitioner", issuer: "Amazon Web Services" },
  { title: "Google Cloud Certified Cloud Digital Leader", issuer: "Google Cloud" },
  { title: "Microsoft Certified: Azure Fundamentals", issuer: "Microsoft" },
  { title: "Microsoft Certified: Azure Data Fundamentals", issuer: "Microsoft" },
  { title: "Microsoft Certified: Azure AI Fundamentals", issuer: "Microsoft" },
  { title: "Microsoft Certified: Security, Compliance, and Identity Fundamentals", issuer: "Microsoft" },
  { title: "Certified Agile Leadership Essentials (CAL-E)", issuer: "Scrum Alliance" },
  { title: "Graph Developer, Professional", issuer: "Apollo GraphQL" },
  { title: "Graph Developer, Associate", issuer: "Apollo GraphQL" },
  { title: "Artificial Intelligence and Machine Learning Program", issuer: "ICTRD" }
];

// The long tail, grouped. Full titles from profile.certifications.
export const learningArchive = [
  {
    group: "AWS partner accreditations",
    items: ["AWS Partner: Cloud Economics Accreditation", "AWS Partner: Accreditation (Business)", "AWS Partner: Accreditation (Technical)"]
  },
  {
    group: "HackerRank skill certificates",
    items: [
      "SQL (Advanced)",
      "SQL (Intermediate)",
      "SQL (Basic)",
      "JavaScript (Intermediate)",
      "JavaScript (Basic)",
      "Node.js (Intermediate)",
      "Node (Basic)",
      "Rest API (Intermediate)",
      "React (Basic)",
      "Problem Solving (Intermediate)",
      "Problem Solving (Basic)"
    ]
  },
  {
    group: "Courses: Anthropic, LinkedIn Learning, Pluralsight, MongoDB",
    items: [
      "Claude 101 (Anthropic)",
      "Claude Code 101 (Anthropic)",
      "AWS Certified Solutions Architect Associate (SAA-C01) prep series, 9 courses",
      "Docker for Developers",
      "Learning Docker",
      "Learning REST APIs",
      "Programming Foundations: Design Patterns",
      "Software Architecture: Patterns for Developers",
      "React: State Management",
      "React: Context API Development",
      "React: Testing and Debugging",
      "Learning React.js",
      "Learning TypeScript",
      "TypeScript: Object-Oriented Programming",
      "JavaScript: Test-Driven Development (ES6)",
      "JavaScript: Classes",
      "JavaScript Promises and Async Programming (Pluralsight)",
      "Building Web Applications with Node.js and Express 4.0 (Pluralsight)",
      "Node.js Essential Training",
      "Learning npm the Node Package Manager",
      "GraphQL Essential Training",
      "Learning MongoDB",
      "MongoDB Basics (MongoDB)",
      "Learning Redis",
      "Learning SQL Programming",
      "Learning Python",
      "Python Quick Start",
      "Learning Django",
      "Learning Regular Expressions",
      "CSS Layouts: From Float to Flexbox and Grid",
      "Blockchain Basics",
      "Agile Development Practices",
      "Decision-Making Strategies",
      "Improving Your Listening Skills",
      "Creating Great First Impressions",
      "Building Self-Confidence",
      "The Six Morning Habits of High Performers"
    ]
  }
];

export const recommendations = [
  { name: "Amit Bora", role: "Specialist Engineer", date: "2025", quote: "Prawal exemplifies the qualities of a forward-thinking and highly effective technology leader, with well-rounded cloud expertise across Azure, AWS, and GCP." },
  { name: "Ravi Chaudhary", role: "Manager Technology", date: "2022", quote: "The great thing about Prawal is the ownership and readiness to learn anything quickly. Handles team calmly, and good knowledge of ReactJS." },
  { name: "Aashna Diwan", role: "Lead Technical Communications Engineer", date: "2021", quote: "An innovative, hard-working, and intelligent leader who welcomes change, motivates people, and leads by great examples." },
  { name: "Ajai Srivastava", role: "Technology Manager", date: "2021", quote: "Impressed by Prawal's ability to handle any situation calmly and patiently, even with the toughest clients." },
  { name: "Sapna Upreti", role: "VP Engineering Track", date: "2021", quote: "A gem of a person and a great engineer, always available, very organised, helpful, and ready to help team members." },
  { name: "Shubham Soni", role: "SDET, Playwright", date: "2021", quote: "The best lead I have ever worked with, patient, solution-oriented, and strong at handling more than one project." },
  { name: "Archana Sharma", role: "Automation testing", date: "2021", quote: "A dynamic resource who finds solutions quickly, thinks from all aspects of a problem, and delivers solutions with results." },
  { name: "Jitendra Pal Singh", role: "Senior Manager Technology", date: "2021", quote: "Multitalented, hardworking, and handling multiple projects across different technologies with perfection." },
  { name: "Tanish Kulshrestha", role: "MERN, Full Stack Developer", date: "2021", quote: "A multi-skilled and insightful colleague, an inspiring team lead, and a signature of success." },
  { name: "Deepak Prajapati", role: "GraphQL, Node.js, React, Vue", date: "2021", quote: "Exceptional expertise in leadership, coaching, motivation, forward thinking, and broad technical knowledge." },
  { name: "Vikas Chauhan", role: "Senior Software Engineer", date: "2021", quote: "Professional, serious about work, supportive in every situation, and recognizes efforts as a team leader." },
  { name: "Shashank Dixit", role: "Manager Technology", date: "2021", quote: "Proactive, result-oriented, responsible, technically sound, and always ready to put in the energy and time to get the job done." }
];

export const recommendationsSource = {
  label: "12 recommendations on LinkedIn",
  href: "https://www.linkedin.com/in/sharma-prawal/"
};

export const appearances = [
  { year: "2026", title: "AI Impact Summit", kind: "AI and leadership" },
  { year: "2026", title: "Convergence India Expo", kind: "Technology expo" },
  { year: "2025", title: "MongoDB.local", kind: "Developer event" },
  { year: "2024", title: "MongoDB.local", kind: "Developer event" },
  { year: "2023", title: "AWS Symposium", kind: "Cloud platform" },
  { year: "2023", title: "Deloitte Fast 50", kind: "Invite-only forum" },
  { year: "2023", title: "IAMAI", kind: "National digital forum" },
  { year: "2023", title: "Unicommerce", kind: "Commerce platform event" }
];

export const publication = {
  title: "The Subtle Art of Effective Communication",
  role: "Contributor",
  detail: "An organizational book on communication and listening skills.",
  href: "https://amzn.eu/d/fgmVx7H"
};
