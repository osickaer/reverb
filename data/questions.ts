export interface Question {
  id: string;
  domain: string;
  subdomain?: string;
  difficulty?: "easy" | "medium" | "hard";
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  tags?: string[];
}

export const seedQuestions: Question[] = [
  {
    id: "q1",
    domain: "Science",
    subdomain: "Earth Science",
    difficulty: "easy",
    prompt: "What is the most abundant gas in the Earth's atmosphere?",
    choices: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
    correctIndex: 2,
    explanation:
      "Nitrogen makes up about 78% of Earth's atmosphere, while oxygen makes up about 21%.",
    tags: ["atmosphere", "earth"],
  },
  {
    id: "q2",
    domain: "History",
    subdomain: "Modern History",
    difficulty: "easy",
    prompt: "In which year did the Apollo 11 moon landing occur?",
    choices: ["1965", "1969", "1971", "1973"],
    correctIndex: 1,
    explanation:
      "Apollo 11 landed on the moon on July 20, 1969. Neil Armstrong and Buzz Aldrin walked on the lunar surface.",
    tags: ["space", "apollo"],
  },
  {
    id: "q3",
    domain: "Geography",
    subdomain: "Physical Geography",
    difficulty: "easy",
    prompt: "What is the longest river in the world?",
    choices: [
      "Amazon River",
      "Nile River",
      "Yangtze River",
      "Mississippi River",
    ],
    correctIndex: 1,
    explanation:
      "The Nile is traditionally listed as the longest river in the world, though some studies debate whether the Amazon may be longer.",
    tags: ["rivers", "world"],
  },
  {
    id: "q4",
    domain: "Technology",
    subdomain: "Internet",
    difficulty: "easy",
    prompt: "What does HTTP stand for?",
    choices: [
      "HyperText Transfer Protocol",
      "HyperText Transmission Process",
      "High Transfer Technology Platform",
      "Hyperlink Transfer Technology",
    ],
    correctIndex: 0,
    explanation:
      "HTTP stands for HyperText Transfer Protocol, the core protocol used to transfer web content.",
    tags: ["web", "internet"],
  },
  {
    id: "q5",
    domain: "Mathematics",
    subdomain: "Constants",
    difficulty: "easy",
    prompt: "What is the value of Pi to two decimal places?",
    choices: ["3.12", "3.14", "3.16", "3.18"],
    correctIndex: 1,
    explanation:
      "Pi is approximately 3.14159, so to two decimal places it is 3.14.",
    tags: ["pi", "numbers"],
  },

  {
    id: "q6",
    domain: "Science",
    subdomain: "Biology",
    difficulty: "easy",
    prompt:
      "What part of the cell contains the genetic material in most organisms?",
    choices: ["Cell membrane", "Nucleus", "Ribosome", "Cytoplasm"],
    correctIndex: 1,
    explanation:
      "In most organisms, the nucleus contains DNA, which stores genetic information.",
    tags: ["cells", "biology"],
  },
  {
    id: "q7",
    domain: "Science",
    subdomain: "Chemistry",
    difficulty: "easy",
    prompt: "What is the chemical symbol for gold?",
    choices: ["Ag", "Au", "Gd", "Go"],
    correctIndex: 1,
    explanation:
      "Gold has the chemical symbol Au, which comes from the Latin word aurum.",
    tags: ["elements", "chemistry"],
  },
  {
    id: "q8",
    domain: "Science",
    subdomain: "Physics",
    difficulty: "easy",
    prompt: "What force pulls objects toward the Earth?",
    choices: ["Magnetism", "Friction", "Gravity", "Pressure"],
    correctIndex: 2,
    explanation:
      "Gravity is the force that attracts objects with mass toward one another, including toward Earth.",
    tags: ["physics", "forces"],
  },
  {
    id: "q9",
    domain: "Science",
    subdomain: "Astronomy",
    difficulty: "medium",
    prompt: "Which planet is known as the Red Planet?",
    choices: ["Venus", "Mars", "Jupiter", "Mercury"],
    correctIndex: 1,
    explanation:
      "Mars is called the Red Planet because iron oxide on its surface gives it a reddish appearance.",
    tags: ["space", "planets"],
  },
  {
    id: "q10",
    domain: "Science",
    subdomain: "Biology",
    difficulty: "medium",
    prompt: "What is the process by which plants make their own food?",
    choices: ["Respiration", "Photosynthesis", "Fermentation", "Digestion"],
    correctIndex: 1,
    explanation:
      "Photosynthesis allows plants to use sunlight, water, and carbon dioxide to produce glucose and oxygen.",
    tags: ["plants", "energy"],
  },

  {
    id: "q11",
    domain: "History",
    subdomain: "Ancient History",
    difficulty: "easy",
    prompt: "Which ancient civilization built the pyramids at Giza?",
    choices: ["Romans", "Greeks", "Egyptians", "Persians"],
    correctIndex: 2,
    explanation:
      "The pyramids at Giza were built by the ancient Egyptians as monumental tombs.",
    tags: ["egypt", "ancient"],
  },
  {
    id: "q12",
    domain: "History",
    subdomain: "US History",
    difficulty: "easy",
    prompt: "Who was the first President of the United States?",
    choices: [
      "Thomas Jefferson",
      "John Adams",
      "George Washington",
      "James Madison",
    ],
    correctIndex: 2,
    explanation: "George Washington became the first U.S. president in 1789.",
    tags: ["usa", "presidents"],
  },
  {
    id: "q13",
    domain: "History",
    subdomain: "World War II",
    difficulty: "medium",
    prompt:
      "Which event is generally considered the start of World War II in Europe?",
    choices: [
      "The bombing of Pearl Harbor",
      "The invasion of Poland",
      "The Battle of Britain",
      "The fall of France",
    ],
    correctIndex: 1,
    explanation:
      "World War II in Europe is generally dated from Germany’s invasion of Poland in 1939.",
    tags: ["ww2", "europe"],
  },
  {
    id: "q14",
    domain: "History",
    subdomain: "US History",
    difficulty: "medium",
    prompt: "What document begins with the words “We the People”?",
    choices: [
      "The Declaration of Independence",
      "The U.S. Constitution",
      "The Bill of Rights",
      "The Emancipation Proclamation",
    ],
    correctIndex: 1,
    explanation:
      "The preamble to the U.S. Constitution begins with “We the People.”",
    tags: ["government", "constitution"],
  },
  {
    id: "q15",
    domain: "History",
    subdomain: "Cold War",
    difficulty: "medium",
    prompt: "In what year did the Berlin Wall fall?",
    choices: ["1985", "1987", "1989", "1991"],
    correctIndex: 2,
    explanation:
      "The Berlin Wall fell in 1989, a major symbolic moment in the end of the Cold War.",
    tags: ["cold war", "germany"],
  },

  {
    id: "q16",
    domain: "Geography",
    subdomain: "Capitals",
    difficulty: "easy",
    prompt: "What is the capital city of Japan?",
    choices: ["Seoul", "Kyoto", "Tokyo", "Osaka"],
    correctIndex: 2,
    explanation: "Tokyo is the capital and largest city of Japan.",
    tags: ["asia", "capitals"],
  },
  {
    id: "q17",
    domain: "Geography",
    subdomain: "Continents",
    difficulty: "easy",
    prompt: "Which continent is the Sahara Desert located on?",
    choices: ["Asia", "Africa", "Australia", "South America"],
    correctIndex: 1,
    explanation:
      "The Sahara Desert is located in North Africa and is the largest hot desert in the world.",
    tags: ["deserts", "africa"],
  },
  {
    id: "q18",
    domain: "Geography",
    subdomain: "Oceans",
    difficulty: "easy",
    prompt: "What is the largest ocean on Earth?",
    choices: [
      "Atlantic Ocean",
      "Indian Ocean",
      "Arctic Ocean",
      "Pacific Ocean",
    ],
    correctIndex: 3,
    explanation: "The Pacific Ocean is the largest and deepest ocean on Earth.",
    tags: ["oceans", "world"],
  },
  {
    id: "q19",
    domain: "Geography",
    subdomain: "Countries",
    difficulty: "medium",
    prompt: "Which country has the largest population in the world?",
    choices: ["India", "China", "United States", "Indonesia"],
    correctIndex: 0,
    explanation:
      "India recently surpassed China to become the world’s most populous country.",
    tags: ["population", "countries"],
  },
  {
    id: "q20",
    domain: "Geography",
    subdomain: "Mountains",
    difficulty: "medium",
    prompt:
      "Mount Everest lies on the border of Nepal and which other country?",
    choices: ["India", "Bhutan", "China", "Pakistan"],
    correctIndex: 2,
    explanation:
      "Mount Everest sits on the border between Nepal and the Tibet Autonomous Region of China.",
    tags: ["mountains", "asia"],
  },

  {
    id: "q21",
    domain: "Technology",
    subdomain: "Computing",
    difficulty: "easy",
    prompt: "What does CPU stand for?",
    choices: [
      "Central Process Unit",
      "Central Processing Unit",
      "Computer Primary Unit",
      "Core Processing Utility",
    ],
    correctIndex: 1,
    explanation:
      "CPU stands for Central Processing Unit, often described as the main processor of a computer.",
    tags: ["hardware", "computers"],
  },
  {
    id: "q22",
    domain: "Technology",
    subdomain: "Programming",
    difficulty: "easy",
    prompt: "Which of these is a programming language?",
    choices: ["HTML", "Python", "HTTP", "Wi-Fi"],
    correctIndex: 1,
    explanation:
      "Python is a programming language. HTML is markup, HTTP is a protocol, and Wi-Fi is a wireless networking technology.",
    tags: ["coding", "software"],
  },
  {
    id: "q23",
    domain: "Technology",
    subdomain: "Security",
    difficulty: "medium",
    prompt: "What is the main purpose of two-factor authentication?",
    choices: [
      "To make passwords longer",
      "To add a second layer of identity verification",
      "To speed up login times",
      "To store passwords in the cloud",
    ],
    correctIndex: 1,
    explanation:
      "Two-factor authentication improves security by requiring a second form of verification in addition to a password.",
    tags: ["security", "login"],
  },
  {
    id: "q24",
    domain: "Mathematics",
    subdomain: "Arithmetic",
    difficulty: "easy",
    prompt: "What is 12 * 8?",
    choices: ["84", "92", "96", "108"],
    correctIndex: 2,
    explanation: "12 multiplied by 8 equals 96.",
    tags: ["multiplication", "numbers"],
  },
  {
    id: "q25",
    domain: "Mathematics",
    subdomain: "Geometry",
    difficulty: "medium",
    prompt: "How many degrees are in the interior angles of a triangle?",
    choices: ["90", "180", "270", "360"],
    correctIndex: 1,
    explanation:
      "The interior angles of a triangle always add up to 180 degrees.",
    tags: ["geometry", "angles"],
  },
];
