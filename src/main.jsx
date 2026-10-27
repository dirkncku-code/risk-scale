import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { quiz } from './content/quiz.js';
import { validateQuiz } from './engine/model.js';
import './styles.css';

validateQuiz(quiz);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
