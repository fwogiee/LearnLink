import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { http } from '../lib/api.js';

const EMPTY_CARD = () => ({ id: crypto.randomUUID(), term: '', definition: '' });

export default function FlashcardBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState([EMPTY_CARD()]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const cloneId = searchParams.get('clone');
  const editId = searchParams.get('edit');

  const mode = useMemo(() => (editId ? 'edit' : cloneId ? 'duplicate' : 'create'), [cloneId, editId]);

  useEffect(() => {
    const id = editId || cloneId;
    if (!id) return;
    let alive = true;
    setLoading(true);
    async function load() {
      try {
        const data = await http(`/sets/${id}?includeCards=true`);
        if (!alive) return;
        setTitle(data.title || '');
        setDescription(data.description || '');
        setCards((data.cards || []).map((card) => ({ id: crypto.randomUUID(), term: card.term || card.front || '', definition: card.definition || card.back || '' })) || [EMPTY_CARD()]);
        setStatus(null);
      } catch (error) {
        if (!alive) return;
        setStatus({ tone: 'error', text: error.message || 'Failed to load set for editing.' });
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [cloneId, editId]);

  const headerTitle = mode === 'edit' ? 'Edit flashcard set' : mode === 'duplicate' ? 'Duplicate flashcard set' : 'Create a flashcard set';

  const addCard = () => setCards((prev) => [...prev, EMPTY_CARD()]);

  const updateCard = (id, field, value) => {
    setCards((prev) => prev.map((card) => (card.id === id ? { ...card, [field]: value } : card)));
  };

  const removeCard = (id) => {
    setCards((prev) => (prev.length <= 1 ? prev : prev.filter((card) => card.id !== id)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const payloadCards = cards
      .map(({ term, definition }) => ({ term: term.trim(), definition: definition.trim() }))
      .filter((card) => card.term || card.definition);

    if (!trimmedTitle || payloadCards.length === 0) {
      setStatus({ tone: 'error', text: 'Please add a title and at least one card with content.' });
      return;
    }

    setStatus({ tone: 'info', text: mode === 'edit' ? 'Updating set...' : 'Saving set...' });
    setLoading(true);

    try {
      let targetSetId = editId;
      if (mode !== 'edit') {
        const created = await http('/sets', {
          method: 'POST',
          body: JSON.stringify({ title: trimmedTitle, description: trimmedDescription }),
        });
        targetSetId = created._id;
      } else {
        await http(`/sets/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ title: trimmedTitle, description: trimmedDescription }),
        });
      }

      if (payloadCards.length) {
        await http(`/sets/${targetSetId}/cards`, {
          method: mode === 'edit' ? 'PUT' : 'POST',
          body: JSON.stringify({ cards: payloadCards }),
        });
      }

      setStatus({ tone: 'success', text: 'Flashcard set saved successfully!' });
      navigate(`/flashcards/${targetSetId}`);
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Failed to save set.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page
      title={headerTitle}
      subtitle="Keep terms concise and definitions memorable."
      actions={<Link to="/flashcards" className="btn-outline">Back to sets</Link>}
    >
      {status ? <StatusMessage tone={status.tone} className="mb-4">{status.text}</StatusMessage> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card space-y-4 p-6">
          <div className="space-y-2">
            <label htmlFor="set-title" className="text-sm font-medium text-neutral-700">Set title</label>
            <input
              id="set-title"
              className="input"
              placeholder="e.g. Biology: Cell Structure"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="set-description" className="text-sm font-medium text-neutral-700">Description</label>
            <textarea
              id="set-description"
              className="input min-h-[96px] resize-y"
              placeholder="Optional description for context"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Cards</h2>
            <button type="button" className="btn-outline" onClick={addCard}>Add card</button>
          </div>

          <div className="space-y-4">
            {cards.map((card, index) => (
              <article key={card.id} className="card space-y-3 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500">
                  <span>Card {index + 1}</span>
                  {cards.length > 1 ? (
                    <button type="button" className="text-red-600 hover:underline" onClick={() => removeCard(card.id)}>
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600">Term</label>
                    <textarea
                      className="input min-h-[96px] resize-y"
                      placeholder="Term"
                      value={card.term}
                      onChange={(event) => updateCard(card.id, 'term', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600">Definition</label>
                    <textarea
                      className="input min-h-[96px] resize-y"
                      placeholder="Definition"
                      value={card.definition}
                      onChange={(event) => updateCard(card.id, 'definition', event.target.value)}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Link to="/flashcards" className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : mode === 'edit' ? 'Update set' : 'Save set'}
          </button>
        </div>
      </form>
    </Page>
  );
}
