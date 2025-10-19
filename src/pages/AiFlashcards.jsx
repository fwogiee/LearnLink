import { useState } from 'react';
import Page from '../components/Page.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { http } from '../lib/api.js';

export default function AiFlashcardsPage() {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!topic.trim()) {
      setError('Please provide a topic.');
      return;
    }
    setLoading(true);
    setError('');
    setCards([]);
    try {
      const data = await http('/ai/flashcards', {
        method: 'POST',
        body: JSON.stringify({ topic: topic.trim(), count: Number(count) || 5 }),
      });
      const generated = Array.isArray(data?.cards) ? data.cards : Array.isArray(data) ? data : [];
      const mapped = generated.map((card, index) => ({
        id: card.id || index,
        term: card.front ?? card.term ?? card.word ?? 'Untitled',
        definition: card.back ?? card.definition ?? card.meaning ?? '',
        example: card.example ?? card.usage ?? '',
      }));
      setCards(mapped);
      if (!mapped.length) {
        setError('The AI did not return any flashcards. Try a different prompt.');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate flashcards.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page
      title="AI flashcards"
      subtitle="Let the assistant draft study cards, then refine them before saving."
    >
      <section className="card p-6">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[2fr,120px,120px] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700" htmlFor="topic">Topic or prompt</label>
            <input
              id="topic"
              className="input"
              placeholder="e.g. Photosynthesis basics"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700" htmlFor="count">Cards</label>
            <input
              id="count"
              type="number"
              min="3"
              max="20"
              className="input"
              value={count}
              onChange={(event) => setCount(event.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </form>
        {error ? <StatusMessage tone="error" className="mt-4">{error}</StatusMessage> : null}
      </section>

      <section className="mt-6 space-y-3">
        {loading ? (
          <div className="card p-6 text-sm text-neutral-600">Thinking up flashcards...</div>
        ) : cards.length ? (
          cards.map((card) => (
            <article key={card.id} className="card p-4 text-left">
              <h3 className="text-base font-semibold text-neutral-900">{card.term}</h3>
              {card.definition ? (
                <p className="mt-2 text-sm text-neutral-700">
                  <span className="font-medium text-neutral-900">Definition:</span> {card.definition}
                </p>
              ) : null}
              {card.example ? (
                <p className="mt-2 text-sm text-neutral-700">
                  <span className="font-medium text-neutral-900">Example:</span> {card.example}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="card p-6 text-sm text-neutral-600">No flashcards yet. Request a topic above.</div>
        )}
      </section>
    </Page>
  );
}
