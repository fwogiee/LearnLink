import { useState } from 'react';
import Page from '../components/Page.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { http } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminPage() {
  const { role } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  if (role !== 'admin') {
    return (
      <Page title="Admin dashboard" subtitle="">
        <StatusMessage tone="error">Only administrators can access this workspace.</StatusMessage>
      </Page>
    );
  }

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!username.trim()) {
      setError('Enter a username to search.');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await http(`/admin/user-data?username=${encodeURIComponent(username.trim())}`);
      setData(res);
      if (!res?.user) {
        setError('User not found.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load user data.');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (type, id) => {
    if (!data?.user?.username) return;
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      await http(`/admin/delete/${encodeURIComponent(data.user.username)}/${type}/${id}`, {
        method: 'DELETE',
      });
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (type === 'set') next.sets = prev.sets?.filter((item) => item._id !== id) || [];
        if (type === 'card') next.cards = prev.cards?.filter((item) => item._id !== id) || [];
        if (type === 'quiz') next.quizzes = prev.quizzes?.filter((item) => item._id !== id) || [];
        return next;
      });
    } catch (err) {
      window.alert(err.message || 'Failed to delete item.');
    }
  };

  return (
    <Page
      title="Admin dashboard"
      subtitle="Lookup learners, review their content, and moderate when necessary"
    >
      <form onSubmit={handleSearch} className="card mb-6 flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <input
          className="input md:w-72"
          placeholder="Enter username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>Search</button>
      </form>

      {error ? <StatusMessage tone="error" className="mb-4">{error}</StatusMessage> : null}

      {loading ? (
        <div className="card p-6">
          <LoadingSpinner label="Fetching user data..." />
        </div>
      ) : data?.user ? (
        <div className="space-y-6">
          <section className="card p-5 text-sm text-neutral-700">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Username</p>
                <p className="text-base font-semibold text-neutral-900">{data.user.username}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Role</p>
                <p className="text-base font-semibold text-neutral-900">{data.user.role}</p>
              </div>
              <div className="flex gap-4 text-xs text-neutral-500">
                <span><strong>{data.counts?.sets ?? 0}</strong> sets</span>
                <span><strong>{data.counts?.cards ?? 0}</strong> cards</span>
                <span><strong>{data.counts?.quizzes ?? 0}</strong> quizzes</span>
              </div>
            </div>
          </section>

          <ContentList
            title="Sets"
            items={data.sets}
            emptyLabel="No sets for this user."
            getDescription={(item) => item.description}
            onDelete={(id) => deleteItem('set', id)}
            viewLink={(item) => `/flashcards/${item._id}`}
          />

          <ContentList
            title="Cards"
            items={data.cards}
            emptyLabel="No standalone cards."
            getDescription={(item) => item.definition}
            onDelete={(id) => deleteItem('card', id)}
          />

          <ContentList
            title="Quizzes"
            items={data.quizzes}
            emptyLabel="No quizzes for this user."
            getDescription={(item) => item.description}
            onDelete={(id) => deleteItem('quiz', id)}
            viewLink={(item) => `/quizzes/${item._id}/play`}
          />
        </div>
      ) : null}
    </Page>
  );
}

function ContentList({ title, items = [], emptyLabel, onDelete, getDescription, viewLink }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
        <span className="text-xs text-neutral-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="card p-4 text-sm text-neutral-600">{emptyLabel}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item._id} className="card p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-neutral-900">{item.title || item.term || item.question || '(untitled)'}</p>
                  {getDescription?.(item) ? (
                    <p className="text-xs text-neutral-600 line-clamp-2">{getDescription(item)}</p>
                  ) : null}
                  <p className="text-[11px] uppercase tracking-wide text-neutral-400">ID: {item._id}</p>
                </div>
                <div className="flex gap-2">
                  {viewLink ? (
                    <LinkButton to={viewLink(item)}>View</LinkButton>
                  ) : null}
                  <button type="button" className="btn-ghost text-xs text-red-600" onClick={() => onDelete(item._id)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function LinkButton({ to, children }) {
  return (
    <a href={to} className="btn-outline text-xs">{children}</a>
  );
}
