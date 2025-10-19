import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Page from '../components/Page.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { http } from '../lib/api.js';

const emptyQuestion = () => ({
  id: crypto.randomUUID(),
  prompt: '',
  options: { A: '', B: '', C: '', D: '' },
  correct: '',
});

export default function QuizBuilderPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      setListLoading(true);
      setListError('');
      try {
        const data = await http('/quizzes?owner=me&limit=100');
        if (!alive) return;
        setQuizzes(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!alive) return;
        setListError(error.message || 'Failed to load quizzes.');
      } finally {
        if (alive) setListLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

  const updateQuestion = (id, field, value) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== id) return question;
        if (field === 'prompt' || field === 'correct') {
          return { ...question, [field]: value };
        }
        if (field.startsWith('option.')) {
          const key = field.split('.')[1];
          return { ...question, options: { ...question.options, [key]: value } };
        }
        return question;
      }),
    );
  };

  const removeQuestion = (id) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((question) => question.id !== id)));
  };

  const formattedQuestions = useMemo(
    () =>
      questions
        .map((q) => ({
          question: q.prompt.trim(),
          options: ['A', 'B', 'C', 'D'].map((letter) => q.options[letter]?.trim()).filter(Boolean),
          correct: q.correct,
        }))
        .filter((q) => q.question && q.options.length >= 2 && q.correct),
    [questions],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || formattedQuestions.length === 0) {
      setStatus({ tone: 'error', text: 'Please add a title and at least one fully configured question.' });
      return;
    }

    setLoading(true);
    setStatus({ tone: 'info', text: 'Saving quiz...' });
    try {
      await http('/quizzes', {
        method: 'POST',
        body: JSON.stringify({ title: trimmedTitle, description: trimmedDescription, questions: formattedQuestions }),
      });
      setStatus({ tone: 'success', text: 'Quiz saved successfully!' });
      setTitle('');
      setDescription('');
      setQuestions([emptyQuestion()]);
      const refreshed = await http('/quizzes?owner=me&limit=100');
      setQuizzes(Array.isArray(refreshed) ? refreshed : []);
    } catch (error) {
      setStatus({ tone: 'error', text: error.message || 'Failed to save quiz.' });
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (id) => {
    if (!window.confirm('Delete this quiz?')) return;
    try {
      await http(`/quizzes/${id}`, { method: 'DELETE' });
      setQuizzes((prev) => prev.filter((quiz) => quiz._id !== id));
    } catch (error) {
      window.alert(error.message || 'Failed to delete quiz.');
    }
  };

  return (
    <Page
      title="Quiz builder"
      subtitle="Author multiple-choice quizzes for your classmates or students"
      actions={<Link to="/dashboard" className="btn-ghost">Back to dashboard</Link>}
    >
      {status ? <StatusMessage tone={status.tone} className="mb-4">{status.text}</StatusMessage> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card space-y-4 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700" htmlFor="quiz-title">Quiz title</label>
            <input
              id="quiz-title"
              className="input"
              placeholder="e.g. Algebra fundamentals"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700" htmlFor="quiz-description">Description</label>
            <textarea
              id="quiz-description"
              className="input min-h-[96px] resize-y"
              placeholder="Optional summary"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Questions</h2>
            <button type="button" className="btn-outline" onClick={addQuestion}>Add question</button>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <article key={question.id} className="card space-y-4 p-5">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500">
                  <span>Question {index + 1}</span>
                  {questions.length > 1 ? (
                    <button type="button" className="text-red-600 hover:underline" onClick={() => removeQuestion(question.id)}>
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Prompt</label>
                  <textarea
                    className="input min-h-[96px] resize-y"
                    placeholder="Question text"
                    value={question.prompt}
                    onChange={(event) => updateQuestion(question.id, 'prompt', event.target.value)}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {['A', 'B', 'C', 'D'].map((option) => (
                    <div key={option} className="space-y-1">
                      <label className="text-xs font-medium text-neutral-600">Option {option}</label>
                      <input
                        className="input"
                        placeholder={`Option ${option}`}
                        value={question.options[option]}
                        onChange={(event) => updateQuestion(question.id, `option.${option}`, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">Correct answer</label>
                  <select
                    className="input"
                    value={question.correct}
                    onChange={(event) => updateQuestion(question.id, 'correct', event.target.value)}
                    required
                  >
                    <option value="">Select the correct option</option>
                    {['A', 'B', 'C', 'D'].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button type="reset" className="btn-ghost" onClick={() => {
            setTitle('');
            setDescription('');
            setQuestions([emptyQuestion()]);
            setStatus(null);
          }}>
            Reset
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save quiz'}
          </button>
        </div>
      </form>

      <section className="mt-10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Saved quizzes</h2>
          <span className="text-xs text-neutral-500">{quizzes.length} total</span>
        </div>
        {listLoading ? (
          <div className="card p-5 text-sm text-neutral-600">Loading quizzes...</div>
        ) : listError ? (
          <StatusMessage tone="error">{listError}</StatusMessage>
        ) : quizzes.length === 0 ? (
          <div className="card p-5 text-sm text-neutral-600">No quizzes yet. Create your first one above.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {quizzes.map((quiz) => (
              <article key={quiz._id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-neutral-900">{quiz.title || '(untitled quiz)'}</h3>
                    {quiz.description ? (
                      <p className="text-xs text-neutral-600 line-clamp-2">{quiz.description}</p>
                    ) : null}
                  </div>
                  <button type="button" className="btn-ghost text-xs text-red-600" onClick={() => deleteQuiz(quiz._id)}>
                    Delete
                  </button>
                </div>
                <div className="mt-3 flex gap-2 text-sm">
                  <button type="button" className="btn-outline flex-1" onClick={() => navigate(`/quizzes/${quiz._id}/play`)}>
                    Play
                  </button>
                  <a href={`/takeQuiz.html?id=${quiz._id}`} className="btn-ghost flex-1 text-center">
                    Classic view
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
