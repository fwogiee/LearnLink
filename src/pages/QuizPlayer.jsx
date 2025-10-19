import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { http } from '../lib/api.js';

export default function QuizPlayerPage() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await http(`/quizzes/${id}`);
        if (!alive) return;
        setQuiz(data);
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Failed to load quiz.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!quiz?.questions?.length) return;
    const form = new FormData(event.currentTarget);
    let correct = 0;
    quiz.questions.forEach((question, index) => {
      const answer = form.get(`q${index}`);
      if (answer && String(answer).trim() === String(question.correct).trim()) {
        correct += 1;
      }
    });
    setScore({ correct, total: quiz.questions.length });
    setSubmitted(true);
  };

  if (loading) {
    return (
      <Page title="Loading quiz" subtitle="">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="Quiz" subtitle="">
        <StatusMessage tone="error">{error}</StatusMessage>
        <Link to="/quizzes" className="btn-outline mt-4 inline-flex">Back to quizzes</Link>
      </Page>
    );
  }

  if (!quiz) {
    return (
      <Page title="Quiz" subtitle="">
        <StatusMessage tone="error">Quiz not found.</StatusMessage>
      </Page>
    );
  }

  return (
    <Page
      title={quiz.title || 'Quiz'}
      subtitle={quiz.description || `${quiz.questions?.length || 0} questions`}
      actions={<Link to="/quizzes" className="btn-outline">Back to quizzes</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {quiz.questions?.map((question, index) => (
          <article key={question._id || index} className="card space-y-3 p-5">
            <h3 className="text-sm font-semibold text-neutral-900">Q{index + 1}. {question.question}</h3>
            <div className="space-y-2">
              {question.options?.map((option, optIndex) => (
                <label key={optIndex} className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm hover:bg-neutral-50">
                  <input
                    type="radio"
                    name={`q${index}`}
                    value={option}
                    className="h-4 w-4"
                    required
                    disabled={submitted}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
        <div className="flex items-center justify-end gap-3">
          {submitted ? (
            <button type="button" className="btn-ghost" onClick={() => { setSubmitted(false); setScore(null); }}>
              Reset answers
            </button>
          ) : null}
          <button type="submit" className="btn-primary" disabled={submitted}>
            {submitted ? 'Submitted' : 'Submit answers'}
          </button>
        </div>
      </form>

      {score ? (
        <StatusMessage tone="success" className="mt-6">
          You scored {score.correct} out of {score.total}.
        </StatusMessage>
      ) : null}
    </Page>
  );
}
