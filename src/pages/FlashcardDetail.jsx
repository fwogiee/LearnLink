import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  const [matchingTerms, setMatchingTerms] = useState([]);
  const [matchingDefinitions, setMatchingDefinitions] = useState([]);
  const [matchingSelections, setMatchingSelections] = useState({ term: null, definition: null });
  const [matchingIncorrect, setMatchingIncorrect] = useState(null);
  const [matchingStarted, setMatchingStarted] = useState(false);
  const mismatchTimeoutRef = useRef(null);

  const clearMismatchFeedback = useCallback(() => {
    if (mismatchTimeoutRef.current) {
      window.clearTimeout(mismatchTimeoutRef.current);
      mismatchTimeoutRef.current = null;
    }
    setMatchingIncorrect(null);
  }, []);

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
  const validMatchingCards = useMemo(
    () => cards.filter((card) => (card.term?.trim() ?? '') !== '' && (card.definition?.trim() ?? '') !== ''),
    [cards],
  );

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

  const handleFlipToggle = useCallback(() => {
    if (!total) return;
    setFlipped((state) => !state);
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
        handleFlipToggle();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [goPrev, goNext, handleFlipToggle]);

  useEffect(() => {
    setMatchingStarted(false);
    setMatchingTerms([]);
    setMatchingDefinitions([]);
    setMatchingSelections({ term: null, definition: null });
    clearMismatchFeedback();
  }, [id, clearMismatchFeedback]);

  useEffect(
    () => () => {
      if (mismatchTimeoutRef.current) {
        window.clearTimeout(mismatchTimeoutRef.current);
        mismatchTimeoutRef.current = null;
      }
    },
    [],
  );

  const startMatchingGame = useCallback(() => {
    const playableCards = validMatchingCards.map((card) => ({
      cardId: card.id,
      term: card.term.trim(),
      definition: card.definition.trim(),
    }));
    const terms = shuffleArray(playableCards).map((card) => ({
      cardId: card.cardId,
      text: card.term,
    }));
    const definitions = shuffleArray(playableCards).map((card) => ({
      cardId: card.cardId,
      text: card.definition,
    }));

    clearMismatchFeedback();
    setMatchingTerms(terms);
    setMatchingDefinitions(definitions);
    setMatchingSelections({ term: null, definition: null });
    setMatchingStarted(true);
  }, [clearMismatchFeedback, validMatchingCards]);

  const resolveMatchAttempt = useCallback(
    (termItem, definitionItem) => {
      if (!termItem || !definitionItem) return;

      if (termItem.cardId === definitionItem.cardId) {
        clearMismatchFeedback();
        setMatchingTerms((prev) => prev.filter((entry) => entry.cardId !== termItem.cardId));
        setMatchingDefinitions((prev) => prev.filter((entry) => entry.cardId !== definitionItem.cardId));
        setMatchingSelections({ term: null, definition: null });
      } else {
        if (mismatchTimeoutRef.current) {
          window.clearTimeout(mismatchTimeoutRef.current);
          mismatchTimeoutRef.current = null;
        }
        const timestamp = Date.now();
        setMatchingIncorrect({ term: termItem.cardId, definition: definitionItem.cardId, key: timestamp });
        setMatchingSelections({ term: null, definition: null });
        mismatchTimeoutRef.current = window.setTimeout(() => {
          clearMismatchFeedback();
        }, 450);
      }
    },
    [clearMismatchFeedback],
  );

  const handleTermSelect = useCallback(
    (item) => {
      if (matchingIncorrect) clearMismatchFeedback();
      const alreadySelected = matchingSelections.term?.cardId === item.cardId;

      if (alreadySelected) {
        setMatchingSelections((prev) => ({ ...prev, term: null }));
        return;
      }

      if (matchingSelections.definition) {
        resolveMatchAttempt(item, matchingSelections.definition);
      } else {
        setMatchingSelections((prev) => ({ ...prev, term: item }));
      }
    },
    [clearMismatchFeedback, matchingIncorrect, matchingSelections, resolveMatchAttempt],
  );

  const handleDefinitionSelect = useCallback(
    (item) => {
      if (matchingIncorrect) clearMismatchFeedback();
      const alreadySelected = matchingSelections.definition?.cardId === item.cardId;

      if (alreadySelected) {
        setMatchingSelections((prev) => ({ ...prev, definition: null }));
        return;
      }

      if (matchingSelections.term) {
        resolveMatchAttempt(matchingSelections.term, item);
      } else {
        setMatchingSelections((prev) => ({ ...prev, definition: item }));
      }
    },
    [clearMismatchFeedback, matchingIncorrect, matchingSelections, resolveMatchAttempt],
  );

  const subtitle = useMemo(() => {
    if (!setData) return '';
    const count = total;
    return `${count} card${count === 1 ? '' : 's'}`;
  }, [setData, total]);

  const handleCardKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleFlipToggle();
      }
    },
    [handleFlipToggle],
  );

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
            className="flashcard-container cursor-pointer select-none text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
            onClick={handleFlipToggle}
            onKeyDown={handleCardKeyDown}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
          >
            {current ? (
              <div className={`flashcard-card${flipped ? ' is-flipped' : ''}`}>
                <div className="flashcard-face flashcard-face-front">
                  <div className="flashcard-face-content">
                    <div className="flashcard-text">
                      {current.term || <span className="flashcard-text-empty">(no term)</span>}
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-neutral-400">
                    Term | Card {index + 1} of {total}
                  </div>
                </div>
                <div className="flashcard-face flashcard-face-back">
                  <div className="flashcard-face-content">
                    <div className="flashcard-text">
                      {current.definition || <span className="flashcard-text-empty">(no definition)</span>}
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-neutral-400">
                    Definition | Card {index + 1} of {total}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flashcard-empty">
                No cards in this set yet.
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                <button type="button" onClick={goPrev} className="btn-outline w-full sm:w-auto" disabled={!total}>
                  Previous
                </button>
                <button type="button" onClick={goNext} className="btn-primary w-full sm:w-auto" disabled={!total}>
                  Next
                </button>
                <button type="button" onClick={shuffle} className="btn-ghost w-full sm:w-auto" disabled={!total}>
                  Shuffle cards
                </button>
              </div>
              <p className="text-xs text-neutral-500 md:text-right">
                Use arrow keys to navigate, spacebar to flip.
              </p>
            </div>
          </div>

          {setData?.description ? (
            <div className="card p-4 text-sm text-neutral-600">
              <p className="font-medium text-neutral-900">Description</p>
              <p className="mt-1">{setData.description}</p>
            </div>
          ) : null}

          <div className="card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-base font-semibold text-neutral-900">Matching game</p>
                <p className="text-sm text-neutral-500">Pair each term with its definition to clear the board.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={startMatchingGame}
                  disabled={!validMatchingCards.length}
                >
                  {matchingStarted ? 'Reset game' : 'Start game'}
                </button>
              </div>
            </div>

            {!validMatchingCards.length ? (
              <p className="mt-4 text-sm text-neutral-500">
                Add terms and definitions to this set to unlock the matching game.
              </p>
            ) : null}

            {matchingStarted && validMatchingCards.length ? (
              <div className="mt-4 space-y-4">
                {matchingTerms.length === 0 && matchingDefinitions.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    All matches found! Great job.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Terms</p>
                        <ul className="space-y-2">
                          {matchingTerms.map((item) => {
                            const isSelected = matchingSelections.term?.cardId === item.cardId;
                            const isError = matchingIncorrect?.term === item.cardId;
                            return (
                              <li key={`term-${item.cardId}`}>
                                <button
                                  type="button"
                                  onClick={() => handleTermSelect(item)}
                                  className={`group w-full rounded-xl border bg-white p-4 text-left text-sm transition focus:outline-none ${
                                    isSelected ? 'border-neutral-900 bg-neutral-900/5 ring-2 ring-neutral-900/60' : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                  } ${isError ? 'border-red-400 bg-red-50 match-shake' : ''}`}
                                  disabled={!!matchingIncorrect && !isError}
                                >
                                  <span className="block font-medium text-neutral-900">{item.text}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Definitions</p>
                        <ul className="space-y-2">
                          {matchingDefinitions.map((item) => {
                            const isSelected = matchingSelections.definition?.cardId === item.cardId;
                            const isError = matchingIncorrect?.definition === item.cardId;
                            return (
                              <li key={`definition-${item.cardId}`}>
                                <button
                                  type="button"
                                  onClick={() => handleDefinitionSelect(item)}
                                  className={`group w-full rounded-xl border bg-white p-4 text-left text-sm transition focus:outline-none ${
                                    isSelected ? 'border-neutral-900 bg-neutral-900/5 ring-2 ring-neutral-900/60' : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                                  } ${isError ? 'border-red-400 bg-red-50 match-shake' : ''}`}
                                  disabled={!!matchingIncorrect && !isError}
                                >
                                  <span className="block text-neutral-700">{item.text}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-500">Pairs remaining: {matchingTerms.length}</p>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-3">
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
