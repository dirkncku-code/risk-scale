import { quiz } from '../content/quiz.js';

export default function Shell({ wide, narrow, children }) {
  const width = wide ? 'page wide' : narrow ? 'page narrow' : 'page';
  return (
    <div className={width}>
      <header className="top">
        <p className="brand">{quiz.brand}</p>
        <p className="product">{quiz.title}</p>
      </header>
      <main>{children}</main>
      <footer className="foot">
        <a href={quiz.fanPage} target="_blank" rel="noreferrer">德克mur mur 粉專</a>
        <p className="muted">{quiz.disclaimer}分數高不代表比較會投資。</p>
      </footer>
    </div>
  );
}
