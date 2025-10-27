import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { http } from '../lib/api.js';

export default function FlashcardDetailPage() {
  const { id } = useParams();
  const [setData, setSetData] = useState(null);
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await http(`/sets/${id}?includeCards=true`);
        if (!alive) return;
        setSetData(data);
        const normalized = (data.cards || []).map((card) => ({
          id: card._id || crypto.randomUUID(),
          term: card.term ?? card.front ?? '',
          definition: card.definition ?? card.back ?? '',
        }));
        setCards(normalized);
        setIndex(0);
        setFlipped(false);
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Failed to load set.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const total = cards.length;
  const current = total ? cards[index] : null;

  const goPrev = useCallback(() => {
    if (!total) return;
    setIndex((prev) => (prev - 1 + total) % total);
    setFlipped(false);
  }, [total]);

  const goNext = useCallback(() => {
    if (!total) return;
    setIndex((prev) => (prev + 1) % total);
    setFlipped(false);
  }, [total]);

  const shuffle = () => {
    if (!total) return;
    setCards((prev) => shuffleArray(prev));
    setIndex(0);
    setFlipped(false);
  };

  useEffect(() => {
    const listener = (event) => {
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === ' ') {
        event.preventDefault();
        setFlipped((state) => !state);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [goPrev, goNext]);

  const subtitle = useMemo(() => {
    if (!setData) return '';
    const count = total;
    return `${count} card${count === 1 ? '' : 's'}`;
  }, [setData, total]);

  if (loading) {
    return (
      <Page title="Loading set" subtitle="Please wait">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="Flashcard set" subtitle="">
        <StatusMessage tone="error">{error}</StatusMessage>
        <Link to="/flashcards" className="btn-outline mt-4 inline-flex" >Back to sets</Link>
      </Page>
    );
  }

  return (
    <Page
      title={setData?.title || 'Flashcard set'}
      subtitle={subtitle}
      actions={
        <div className="flex gap-2">
          <Link to={`/flashcards/new?edit=${setData?._id}`} className="btn-outline">Edit</Link>
          <button type="button" className="btn-ghost" onClick={shuffle}>Shuffle</button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-4">
          <div
            className="card relative flex min-h-[16rem] cursor-pointer select-none flex-col items-center justify-center gap-4 p-10 text-center transition hover:shadow-lg"
            onClick={() => setFlipped((state) => !state)}
          >
            {current ? (
              <>
                <div className="text-2xl font-semibold leading-snug text-neutral-900">
                  {flipped
                    ? current.definition || <span className="text-base text-neutral-500">(no definition)</span>
                    : current.term || <span className="text-base text-neutral-500">(no term)</span>}
                </div>
                <div className="text-xs uppercase tracking-wide text-neutral-400">
                  {flipped ? 'Definition' : 'Term'} • Card {index + 1} of {total}
                </div>
              </>
            ) : (
              <div className="text-sm text-neutral-600">No cards in this set yet.</div>
            )}
          </div>

          {setData?.description ? (
            <div className="card p-4 text-sm text-neutral-600">
              <p className="font-medium text-neutral-900">Description</p>
              <p className="mt-1">{setData.description}</p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-3">
          <div className="card p-4 space-y-3 text-sm">
            <button type="button" onClick={goPrev} className="btn-outline w-full" disabled={!total}>
              Previous
            </button>
            <button type="button" onClick={goNext} className="btn-primary w-full" disabled={!total}>
              Next
            </button>
            <button type="button" onClick={shuffle} className="btn-ghost w-full" disabled={!total}>
              Shuffle cards
            </button>
            <p className="text-xs text-neutral-500">Use ← → keys to navigate, spacebar to flip.</p>
          </div>

          {cards.length ? (
            <div className="card max-h-[320px] overflow-y-auto p-3 text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Quick navigator</p>
              <ul className="space-y-1">
                {cards.map((card, i) => (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setIndex(i);
                        setFlipped(false);
                      }}
                      className={`w-full truncate rounded-lg px-3 py-2 text-left transition ${
                        i === index ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
                      }`}
                    >
                      {card.term || '(no term)'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="card p-4 text-sm text-neutral-600">
            <p className="font-medium text-neutral-900">Need to review later?</p>
            <p className="mt-1">Consider exporting this set or sharing the study link with your group.</p>
          </div>
        </aside>
      </div>
    </Page>
  );
}

function shuffleArray(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
