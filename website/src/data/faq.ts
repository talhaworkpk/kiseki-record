export interface FAQ {
  question: string;
  answer: string;
}

export const faqs: FAQ[] = [
  {
    question: 'Is Kiseki Record free?',
    answer: 'Yes, Kiseki Record is completely free and open-source. You can use it without any limitations or costs.',
  },
  {
    question: 'Does it work offline?',
    answer: 'Absolutely! Kiseki Record is designed to be offline-first. All your data is stored locally on your computer, and the app works perfectly without an internet connection.',
  },
  {
    question: 'Where is my data stored?',
    answer: 'Your data is stored locally on your computer in the application\'s data directory. You have full control over your data and can export it at any time.',
  },
  {
    question: 'Does it require internet?',
    answer: 'No, Kiseki Record does not require an internet connection for core functionality. However, some optional features like AI assistance (via Ollama) may require local setup.',
  },
  {
    question: 'Can I use local AI?',
    answer: 'Yes! Kiseki Record integrates with Ollama, allowing you to run AI models locally on your computer for private, offline AI assistance.',
  },
  {
    question: 'Can I export my data?',
    answer: 'Yes, Kiseki Record includes a vault backup feature that allows you to export all your data in an encrypted format. You can also import your data back or transfer it to another computer.',
  },
  {
    question: 'Is my data private?',
    answer: 'Your privacy is our priority. All data stays on your computer - nothing is sent to the cloud. There are no tracking mechanisms or data collection.',
  },
  {
    question: 'What are the system requirements?',
    answer: 'Kiseki Record requires Windows 10 or later (64-bit), 4 GB of RAM minimum (8 GB recommended), 500 MB of available disk space, and an Intel Core i3 or equivalent processor.',
  },
];
