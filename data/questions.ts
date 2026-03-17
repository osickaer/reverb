export interface Question {
  id: string;
  domain: string;
  prompt: string;
  choices: string[];
  correct_choice: string; // which choice is correct, or just the index
  explanation: string;
}

export const seedQuestions: Question[] = [
  {
    id: 'q1',
    domain: 'Science',
    prompt: 'What is the most abundant gas in the Earth\'s atmosphere?',
    choices: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'],
    correct_choice: 'Nitrogen',
    explanation: 'Nitrogen makes up about 78% of the Earth\'s atmosphere, followed by Oxygen at about 21%.',
  },
  {
    id: 'q2',
    domain: 'History',
    prompt: 'In which year did the Apollo 11 moon landing occur?',
    choices: ['1965', '1969', '1971', '1973'],
    correct_choice: '1969',
    explanation: 'Apollo 11 successfully landed astronauts Neil Armstrong and Buzz Aldrin on the moon on July 20, 1969.',
  },
  {
    id: 'q3',
    domain: 'Geography',
    prompt: 'What is the longest river in the world?',
    choices: ['Amazon River', 'Nile River', 'Yangtze River', 'Mississippi River'],
    correct_choice: 'Nile River',
    explanation: 'The Nile is traditionally considered the longest river in the world, stretching about 6,650 km, though some researchers argue the Amazon might be longer.',
  },
  {
    id: 'q4',
    domain: 'Technology',
    prompt: 'What does HTTP stand for?',
    choices: [
      'HyperText Transfer Protocol',
      'HyperText Transmission Process',
      'High Transfer Technology Platform',
      'Hyperlink Transfer Technology',
    ],
    correct_choice: 'HyperText Transfer Protocol',
    explanation: 'HTTP stands for HyperText Transfer Protocol, which is the foundation of data communication for the World Wide Web.',
  },
  {
    id: 'q5',
    domain: 'Mathematics',
    prompt: 'What is the value of Pi to two decimal places?',
    choices: ['3.12', '3.14', '3.16', '3.18'],
    correct_choice: '3.14',
    explanation: 'Pi is a mathematical constant representing the ratio of a circle\'s circumference to its diameter, approximately equal to 3.14159.',
  },
];
