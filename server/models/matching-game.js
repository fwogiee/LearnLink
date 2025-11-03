// matching-game.js - Enhanced Matching Card Game with PDF Upload (for LearnLink)

class MatchingGame {
  constructor() {
    // Hardcoded fallback cards
    this.cards = [
      { id: 1, term: "Hello", definition: "Hola", matched: false },
      { id: 2, term: "Thank you", definition: "Gracias", matched: false },
      { id: 3, term: "Goodbye", definition: "Adiós", matched: false },
      { id: 4, term: "Yes", definition: "Sí", matched: false },
      { id: 5, term: "No", definition: "No", matched: false },
      { id: 6, term: "Water", definition: "Agua", matched: false }
    ];
    
    this.flippedCards = [];
    this.moves = 0;
    this.timer = 0;
    this.timerInterval = null;
    this.shuffledCards = [];
    this.maxPairs = 6; // Limit for simple game

    // PDF.js setup (load worker)
    this.pdfjsLib = window.pdfjsLib || null;
    if (!this.pdfjsLib) {
      console.error('pdf.js not loaded! Include <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>');
    } else {
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    this.init();
  }

  init() {
    this.renderBoard();
    this.attachEventListeners();
    this.createUploadElement();
  }

  createUploadElement() {
    const uploadDiv = document.createElement('div');
    uploadDiv.innerHTML = `
      <input type="file" id="pdf-upload" accept=".pdf,.txt" style="margin: 10px;">
      <button id="load-pdf-btn" style="margin: 10px;">Load Study Guide</button>
    `;
    document.body.insertBefore(uploadDiv, document.getElementById('game-board'));
  }

  // Enhanced: Handle file upload and parse into cards
  async handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type === 'text/plain') {
      // Simple text file fallback
      const text = await file.text();
      this.parseTextToCards(text);
    } else if (file.type === 'application/pdf' && this.pdfjsLib) {
      await this.extractAndParsePDF(file);
    } else {
      alert('Unsupported file. Use PDF or TXT.');
    }

    // Shuffle and re-render with new cards
    this.shuffleCards();
    this.renderBoard();
    this.restart(); // Reset game state
  }

  // Extract text from PDF using pdf.js
  async extractAndParsePDF(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await this.pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      // Parse fullText into cards
      this.parseTextToCards(fullText);
    } catch (error) {
      console.error('PDF extraction failed:', error);
      alert('Error extracting PDF. Try a text file or check console.');
    }
  }

  // Parse extracted text into term-definition pairs
  parseTextToCards(text) {
    // Heuristic 1: Bold terms (from pdf.js font info) - but since we have raw text, simulate with common patterns
    // For full pdf.js bold detection, we'd need to check item.fontName or width, but simplify here
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const newCards = [];

    // Pattern 1: Bold-like (uppercase or short) : definition
    // Pattern 2: Numbered: Term - Definition
    for (let i = 0; i < lines.length && newCards.length < this.maxPairs; i++) {
      let term = lines[i];
      let def = '';

      // Colon split
      if (term.includes(':')) {
        const parts = term.split(':', 2);
        term = parts[0].trim();
        def = parts[1].trim();
      } else if (i + 1 < lines.length && lines[i + 1].startsWith('- ') || lines[i + 1].includes(' - ')) {
        // Dash continuation
        def = lines[i + 1].replace('- ', '').trim();
        i++; // Skip next line
      } else if (term.match(/^\d+\.\s*/)) {
        // Numbered term, next line def
        if (i + 1 < lines.length) {
          def = lines[i + 1].trim();
          i++;
        }
      }

      if (term && def && term !== def && !newCards.some(c => c.term === term)) {
        newCards.push({ id: newCards.length + 1, term, definition: def, matched: false });
      }
    }

    if (newCards.length > 0) {
      this.cards = newCards.slice(0, this.maxPairs); // Limit pairs
      console.log(`Parsed ${this.cards.length} pairs from document.`);
    } else {
      alert('No term-definition pairs found. Ensure format like "Term: Definition" or "1. Term\nDefinition".');
    }
  }

  shuffleCards() {
    const allCards = [];
    this.cards.forEach(card => {
      allCards.push({ ...card, type: 'term' });
      allCards.push({ ...card, type: 'definition' });
    });

    // Fisher-Yates shuffle
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    this.shuffledCards = allCards;
  }

  renderBoard() {
    const board = document.getElementById('game-board');
    if (!board) {
      console.error('Game board element (#game-board) not found!');
      return;
    }

    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(4, 1fr)`;

    this.shuffledCards.forEach((card, index) => {
      const cardElement = document.createElement('div');
      cardElement.classList.add('card');
      cardElement.dataset.index = index;

      const inner = document.createElement('div');
      inner.classList.add('card-inner');

      const front = document.createElement('div');
      front.classList.add('card-front');
      front.textContent = '?';

      const back = document.createElement('div');
      back.classList.add('card-back');
      back.textContent = card.type === 'term' ? card.term : card.definition;

      inner.appendChild(front);
      inner.appendChild(back);
      cardElement.appendChild(inner);
      board.appendChild(cardElement);
    });

    this.updateStats();
  }

  attachEventListeners() {
    document.getElementById('game-board').addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (!card || card.classList.contains('flipped') || card.classList.contains('matched')) return;

      this.flipCard(card);
    });

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', () => this.restart());

    // New: Upload listeners
    const uploadInput = document.getElementById('pdf-upload');
    const loadBtn = document.getElementById('load-pdf-btn');
    if (uploadInput) uploadInput.addEventListener('change', (e) => this.handleUpload(e));
    if (loadBtn) loadBtn.addEventListener('click', () => uploadInput?.click());
  }

  flipCard(cardElement) {
    if (this.flippedCards.length === 2) return;

    cardElement.classList.add('flipped');
    const index = parseInt(cardElement.dataset.index);
    const card = this.shuffledCards[index];

    this.flippedCards.push({ element: cardElement, card });

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.updateStats();
      this.checkMatch();
    }
  }

  checkMatch() {
    const [first, second] = this.flippedCards;

    if (first.card.id === second.card.id && first.card.type !== second.card.type) {
      // Match found!
      setTimeout(() => {
        first.element.classList.add('matched');
        second.element.classList.add('matched');
        this.flippedCards = [];

        if (this.shuffledCards.every(c => c.matched)) {
          this.endGame();
        }
      }, 600);
    } else {
      // No match
      setTimeout(() => {
        first.element.classList.remove('flipped');
        second.element.classList.remove('flipped');
        this.flippedCards = [];
      }, 1000);
    }
  }

  updateStats() {
    const movesEl = document.getElementById('moves');
    const timerEl = document.getElementById('timer');
    if (movesEl) movesEl.textContent = this.moves;
    if (timerEl) timerEl.textContent = this.formatTime(this.timer);
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timer++;
      this.updateStats();
    }, 1000);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  endGame() {
    clearInterval(this.timerInterval);
    setTimeout(() => {
      alert(`¡Ganaste! Completado en ${this.moves} movimientos y ${this.formatTime(this.timer)}`);
    }, 500);
  }

  restart() {
    this.flippedCards = [];
    this.moves = 0;
    this.timer = 0;
    clearInterval(this.timerInterval);
    this.startTimer();
    // Re-attach board listeners if needed
    this.renderBoard();
  }
}

// Start game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load pdf.js first
  if (!window.pdfjsLib) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => { window.game = new MatchingGame(); };
    document.head.appendChild(script);
  } else {
    window.game = new MatchingGame();
  }
});