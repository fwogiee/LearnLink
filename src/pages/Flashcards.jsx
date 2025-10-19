import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { http } from '../lib/api.js';
import useDebounce from '../hooks/useDebounce.js';

export default function FlashcardsPage() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debounced = useDebounce(searchTerm, 200);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await http('/sets?owner=me&limit=200');
        if (!alive) return;
        setSets(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Failed to load flashcard sets.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const cloneId = searchParams.get('clone');
    if (cloneId) {
      navigate(`/flashcards/new?clone=${cloneId}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const filteredSets = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return sets;
    return sets.filter((set) =>
      [set.title, set.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [sets, debounced]);

  const removeSet = async (id) => {
    if (!window.confirm('Delete this set?')) return;
    try {
      await http(`/sets/${id}`, { method: 'DELETE' });
      setSets((prev) => prev.filter((set) => set._id !== id));
    } catch (err) {
      window.alert(err.message || 'Failed to delete set');
    }
  };

  return (
    <Page
      title="Flashcard sets"
      subtitle="Create, browse, and manage your study decks"
      actions={<Link to="/flashcards/new" className="btn-primary">New set</Link>}
    >
      <div className="card mb-6 flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by title or description"
          className="input md:w-80"
        />
        <div className="text-xs text-neutral-500">
          Showing {filteredSets.length} of {sets.length} sets
        </div>
      </div>

      {error ? <StatusMessage tone="error" className="mb-6">{error}</StatusMessage> : null}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-neutral-100" />
          ))}
        </div>
      ) : filteredSets.length === 0 ? (
        <StatusMessage tone="info">No sets match your search. Try a different keyword.</StatusMessage>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredSets.map((set) => (
            <article key={set._id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-neutral-900">{set.title || '(untitled set)'}</h3>
                  {set.description ? (
                    <p className="text-xs text-neutral-600 line-clamp-2">{set.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeSet(set._id)}
                  className="btn-ghost text-xs text-red-600"
                >
                  Delete
                </button>
              </div>
              <div className="mt-4 flex gap-2 text-sm">
                <Link to={`/flashcards/${set._id}`} className="btn-outline flex-1 text-center">
                  Study
                </Link>
                <Link to={`/flashcards/new?clone=${set._id}`} className="btn-ghost flex-1 text-center">
                  Duplicate
                </Link>
              </div>
              <div className="mt-3 text-xs text-neutral-500">
                {set.cardsCount ?? set.cards?.length ?? 0} cards • updated {formatRelativeDate(set.updatedAt || set.createdAt)}
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}

function formatRelativeDate(value) {
  if (!value) return 'recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  const diff = Date.now() - date.getTime();
  const hours = Math.round(diff / (1000 * 60 * 60));
  if (hours < 24) return `${Math.max(1, hours)}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
