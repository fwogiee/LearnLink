import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { API_BASE, authHeaders, http } from '../lib/api.js';
import { useClassManagement } from '../hooks/useClassManagement.js';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function LearningMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [uploadState, setUploadState] = useState({ uploading: false, error: '', success: '' });
  const [analysisState, setAnalysisState] = useState({ loading: '', error: '', success: null });
  const [ragState, setRagState] = useState({
    question: '',
    loading: false,
    error: '',
    answer: '',
    sources: [],
  });

  const { classes, selectedClass, setSelectedClass, addNewClass, removeClassLocally } = useClassManagement(materials);
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#3b82f6');
  const [showNewClassForm, setShowNewClassForm] = useState(false);
  const [collapsedClasses, setCollapsedClasses] = useState(new Set());

  useEffect(() => {
    let alive = true;
    async function loadMaterials() {
      setListLoading(true);
      setListError('');
      try {
        const response = await http('/materials');
        if (!alive) return;
        const items = Array.isArray(response) ? response : [];
        setMaterials(items);
        setSelectedId((prev) => (prev || (items[0]?.id ?? '')));
      } catch (error) {
        if (!alive) return;
        setListError(error.message || 'Failed to load learning materials.');
      } finally {
        if (alive) setListLoading(false);
      }
    }
    loadMaterials();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }

    let alive = true;
    async function loadDetail() {
      setDetailLoading(true);
      setDetailError('');
      try {
        const material = await http(`/materials/${selectedId}`);
        if (!alive) return;
        setSelected(material);
      } catch (error) {
        if (!alive) return;
        setDetailError(error.message || 'Failed to load material.');
      } finally {
        if (alive) setDetailLoading(false);
      }
    }
    loadDetail();
    return () => {
      alive = false;
    };
  }, [selectedId]);

  useEffect(() => {
    setAnalysisState({ loading: '', error: '', success: null });
    setRagState({ question: '', loading: false, error: '', answer: '', sources: [] });
  }, [selectedId]);

  const handleUpload = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.material?.files?.[0];
    if (!file) {
      setUploadState({ uploading: false, error: 'Select a PDF or text file to upload.', success: '' });
      return;
    }

    const formData = new FormData();
    formData.append('material', file);

    // Add class info if selected
    if (selectedClass) {
      const classInfo = classes.find((c) => c.name === selectedClass);
      if (classInfo) {
        formData.append('className', classInfo.name);
        formData.append('classColor', classInfo.color);
      }
    }

    setUploadState({ uploading: true, error: '', success: '' });

    try {
      const headers = authHeaders();
      headers.delete('Content-Type');

      const response = await fetch(`${API_BASE}/materials/upload`, {
        method: 'POST',
        body: formData,
        headers,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Upload failed.');
      }

      setMaterials((prev) => [payload, ...prev]);
      setSelectedId(payload.id);
      setUploadState({ uploading: false, error: '', success: 'Upload successful.' });
      form.reset();
    } catch (error) {
      setUploadState({ uploading: false, error: error.message || 'Upload failed.', success: '' });
    }
  };

  const handleCreateClass = () => {
    try {
      const className = addNewClass(newClassName.trim(), newClassColor);
      setNewClassName('');
      setNewClassColor('#3b82f6');
      setShowNewClassForm(false);
      setUploadState({ uploading: false, error: '', success: `Class "${className}" created.` });
    } catch (error) {
      setUploadState({ uploading: false, error: error.message, success: '' });
    }
  };

  const handleDeleteClass = async (className) => {
    const materialsInClass = materials.filter((m) => m.className === className);
    if (materialsInClass.length > 0) {
      const confirmation = window.confirm(
        `This class contains ${materialsInClass.length} file(s). Delete all files in this class?`,
      );
      if (!confirmation) return;

      // Delete all materials in the class
      try {
        const deletePromises = materialsInClass.map((m) =>
          http(`/materials/${m.id}`, { method: 'DELETE' })
        );
        const results = await Promise.allSettled(deletePromises);

        // Check if any deletions failed
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          console.warn(`Failed to delete ${failures.length} material(s)`);
        }

        setMaterials((prev) => prev.filter((m) => m.className !== className));
        if (materialsInClass.some((m) => m.id === selectedId)) {
          setSelectedId('');
        }
      } catch (error) {
        setListError(error.message || 'Failed to delete materials.');
        return;
      }
    } else {
      const confirmation = window.confirm(`Delete class "${className}"?`);
      if (!confirmation) return;
    }

    removeClassLocally(className);
  };

  const handleDelete = async (materialId) => {
    const confirmation = window.confirm('Delete this material? This cannot be undone.');
    if (!confirmation) return;
    try {
      await http(`/materials/${materialId}`, { method: 'DELETE' });
      setMaterials((prev) => {
        const nextList = prev.filter((item) => item.id !== materialId);
        if (selectedId === materialId) {
          setSelectedId(nextList[0]?.id || '');
        }
        return nextList;
      });
    } catch (error) {
      setDetailError(error.message || 'Failed to delete material.');
    }
  };

  const handleAnalyze = async (action) => {
    if (!selectedId || analysisState.loading) return;
    setAnalysisState({ loading: action, error: '', success: null });
    try {
      const result = await http(`/materials/${selectedId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });

      setMaterials((prev) => prev.map((item) => {
        if (item.id !== selectedId) return item;
        if (action === 'summary') return { ...item, hasSummary: true };
        if (action === 'flashcards') {
          const setId = result?.set?._id || result?.set?.id || item.flashcardSetId;
          return { ...item, flashcardSetId: setId };
        }
        if (action === 'quiz') {
          const quizId = result?.quiz?._id || result?.quiz?.id || item.quizId;
          return { ...item, quizId };
        }
        return item;
      }));

      if (action === 'summary') {
        const summaryText = result?.summary || '';
        setSelected((prev) => (prev ? { ...prev, summary: summaryText } : prev));
        setAnalysisState({ loading: '', error: '', success: { action: 'summary' } });
      } else if (action === 'flashcards') {
        const setPayload = result?.set || null;
        const setId = setPayload?._id || setPayload?.id || null;
        setSelected((prev) => (prev ? { ...prev, flashcardSetId: setId } : prev));
        setAnalysisState({ loading: '', error: '', success: { action: 'flashcards', set: setPayload } });
      } else if (action === 'quiz') {
        const quizPayload = result?.quiz || null;
        const quizId = quizPayload?._id || quizPayload?.id || null;
        setSelected((prev) => (prev ? { ...prev, quizId } : prev));
        setAnalysisState({ loading: '', error: '', success: { action: 'quiz', quiz: quizPayload } });
      } else {
        setAnalysisState({ loading: '', error: '', success: null });
      }
    } catch (error) {
      setAnalysisState({ loading: '', error: error.message || 'Failed to analyze material.', success: null });
    }
  };

  const handleAskRag = async (event) => {
    event.preventDefault();
    if (!selectedId || ragState.loading) return;
    const question = ragState.question.trim();
    if (!question) {
      setRagState((prev) => ({ ...prev, error: 'Enter a question to ask.', answer: '', sources: [] }));
      return;
    }

    setRagState((prev) => ({ ...prev, loading: true, error: '', answer: '', sources: [] }));
    try {
      const payload = await http('/rag/answer', {
        method: 'POST',
        body: JSON.stringify({
          materialId: selectedId,
          query: question,
          className: selected?.className,
        }),
      });

      setRagState((prev) => ({
        ...prev,
        loading: false,
        answer: payload?.answer || '',
        sources: Array.isArray(payload?.sources) ? payload.sources : [],
      }));
    } catch (error) {
      setRagState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to get an answer.',
        answer: '',
        sources: [],
      }));
    }
  };

  const viewerSource = useMemo(() => {
    if (!selected?.fileUrl) return '';
    return `${API_BASE}${selected.fileUrl}`;
  }, [selected]);

  const analyzing = Boolean(analysisState.loading);

  const materialsByClass = useMemo(() => {
    const grouped = {};
    materials.forEach((material) => {
      const className = material.className || 'Uncategorized';
      if (!grouped[className]) {
        grouped[className] = [];
      }
      grouped[className].push(material);
    });
    return grouped;
  }, [materials]);

  const toggleClassCollapse = (className) => {
    setCollapsedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(className)) {
        next.delete(className);
      } else {
        next.add(className);
      }
      return next;
    });
  };

  return (
    <Page
      title="Learning Materials"
      subtitle="Upload, read, and review PDFs or text notes alongside your study sets."
    >
      {listError ? <StatusMessage tone="error" className="mb-4">{listError}</StatusMessage> : null}
      {uploadState.error ? <StatusMessage tone="error" className="mb-4">{uploadState.error}</StatusMessage> : null}
      {uploadState.success ? <StatusMessage tone="success" className="mb-4">{uploadState.success}</StatusMessage> : null}
      {analysisState.error ? <StatusMessage tone="error" className="mb-4">{analysisState.error}</StatusMessage> : null}
      {analysisState.success ? (
        <StatusMessage tone="success" className="mb-4">
          {analysisState.success.action === 'summary' ? (
            'Summary updated.'
          ) : null}
          {analysisState.success.action === 'flashcards' ? (
            <>
              Flashcard set ready{analysisState.success.set?.title ? `: ${analysisState.success.set.title}` : '.'}{' '}
              {analysisState.success.set?._id ? (
                <Link className="text-neutral-900 underline" to={`/flashcards/${analysisState.success.set._id}`}>
                  Open set
                </Link>
              ) : null}
            </>
          ) : null}
          {analysisState.success.action === 'quiz' ? (
            <>
              Quiz ready{analysisState.success.quiz?.title ? `: ${analysisState.success.quiz.title}` : '.'}{' '}
              {analysisState.success.quiz?._id ? (
                <Link className="text-neutral-900 underline" to={`/quizzes/${analysisState.success.quiz._id}/play`}>
                  Take quiz
                </Link>
              ) : null}
            </>
          ) : null}
        </StatusMessage>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-6">
          <section className="card space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Upload material</h2>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  Select Class <span className="text-neutral-400">(optional)</span>
                </label>
                {!showNewClassForm ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    >
                      <option value="">-- None (Uncategorized) --</option>
                      {classes.map((cls) => (
                        <option key={cls.name} value={cls.name}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewClassForm(true)}
                      className="btn-outline text-sm"
                      title="Create new class"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-neutral-300 p-3">
                    <input
                      type="text"
                      placeholder="Class name"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                      maxLength={50}
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-neutral-600">Color:</label>
                      <input
                        type="color"
                        value={newClassColor}
                        onChange={(e) => setNewClassColor(e.target.value)}
                        className="h-8 w-16 cursor-pointer rounded border border-neutral-300"
                      />
                    </div>
                    {newClassName.trim() && classes.some((c) => c.name.toLowerCase() === newClassName.trim().toLowerCase()) && (
                      <p className="text-xs text-red-600">A class with this name already exists.</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateClass}
                        className="btn-primary flex-1 text-xs"
                        disabled={!newClassName.trim() || classes.some((c) => c.name.toLowerCase() === newClassName.trim().toLowerCase())}
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewClassForm(false);
                          setNewClassName('');
                          setNewClassColor('#3b82f6');
                        }}
                        className="btn-ghost flex-1 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                name="material"
                accept=".pdf,.txt"
                className="w-full text-sm"
              />
              <button
                type="submit"
                className="btn-primary w-full justify-center"
                disabled={uploadState.uploading}
              >
                {uploadState.uploading ? 'Uploading...' : 'Upload'}
              </button>
              <p className="text-xs text-neutral-500">
                PDF or text files up to 50MB. Text is extracted so you can skim and copy notes.
              </p>
            </form>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Your files</h2>
              {listLoading ? <LoadingSpinner label="Loading" /> : null}
            </div>
            {materials.length === 0 && !listLoading ? (
              <p className="mt-3 text-sm text-neutral-600">
                Nothing here yet. Upload a PDF or note to get started.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {Object.entries(materialsByClass).map(([className, classMaterials]) => {
                  const classColor = classMaterials[0]?.classColor || '#3b82f6';
                  const isCollapsed = collapsedClasses.has(className);
                  return (
                    <div key={className} className="rounded-lg border border-neutral-200">
                      <div className="flex items-center justify-between gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => toggleClassCollapse(className)}
                          className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-neutral-700 hover:text-neutral-900"
                        >
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: classColor }}
                          />
                          <span>{className}</span>
                          <span className="text-xs text-neutral-500">({classMaterials.length})</span>
                          <span className="ml-auto text-neutral-400">{isCollapsed ? '▶' : '▼'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(className)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          title="Delete class"
                        >
                          ×
                        </button>
                      </div>
                      {!isCollapsed && (
                        <ul className="space-y-1 p-2 pt-0">
                          {classMaterials.map((material) => {
                            const isActive = material.id === selectedId;
                            return (
                              <li key={material.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedId(material.id)}
                                  className={[
                                    'w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                                    isActive
                                      ? 'border-neutral-900 bg-neutral-900 text-white'
                                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50',
                                  ].join(' ')}
                                >
                                  <div className="font-medium">{material.originalName}</div>
                                  <div className={isActive ? 'text-xs text-neutral-200' : 'text-xs text-neutral-500'}>
                                    {formatBytes(material.size)} | {dateFormatter.format(new Date(material.createdAt))}
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>

        <section className="card flex min-h-[480px] flex-col p-6">
          {detailLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <LoadingSpinner label="Loading material..." />
            </div>
          ) : null}

          {detailError && !detailLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <StatusMessage tone="error">{detailError}</StatusMessage>
            </div>
          ) : null}

          {!selected && !detailLoading && !detailError ? (
            <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
              Choose a file from the list to preview its contents.
            </div>
          ) : null}

          {selected && !detailLoading && !detailError ? (
            <>
              <header className="mb-4 flex flex-col gap-2 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">{selected.originalName}</h2>
                  <div className="text-xs text-neutral-500">
                    {selected.mimeType} | {formatBytes(selected.size)}
                  </div>
                </div>
                <div className="flex gap-2 text-sm">
                  <a
                    className="btn-ghost"
                    href={viewerSource}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in new tab
                  </a>
                  <button
                    type="button"
                    className="btn-outline text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(selected.id)}
                  >
                    Delete
                  </button>
                </div>
              </header>

              <div className="mb-4 flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={analyzing}
                  onClick={() => handleAnalyze('summary')}
                >
                  {analysisState.loading === 'summary'
                    ? 'Summarizing...'
                    : selected.summary
                      ? 'Regenerate summary'
                      : 'Generate summary'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={analyzing}
                  onClick={() => handleAnalyze('flashcards')}
                >
                  {analysisState.loading === 'flashcards'
                    ? 'Creating flashcards...'
                    : selected.flashcardSetId
                      ? 'Refresh flashcards'
                      : 'Create flashcards'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={analyzing}
                  onClick={() => handleAnalyze('quiz')}
                >
                  {analysisState.loading === 'quiz'
                    ? 'Building quiz...'
                    : selected.quizId
                      ? 'Refresh quiz'
                      : 'Create quiz'}
                </button>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                <span className={selected.summary ? 'rounded-full bg-emerald-100 px-3 py-1 text-emerald-700' : ''}>
                  {selected.summary ? 'Summary ready' : 'No summary yet'}
                </span>
                {selected.flashcardSetId ? (
                  <Link className="rounded-full bg-neutral-200 px-3 py-1 text-neutral-700" to={`/flashcards/${selected.flashcardSetId}`}>
                    View flashcards
                  </Link>
                ) : (
                  <span>Flashcards not generated</span>
                )}
                {selected.quizId ? (
                  <Link className="rounded-full bg-neutral-200 px-3 py-1 text-neutral-700" to={`/quizzes/${selected.quizId}/play`}>
                    Take quiz
                  </Link>
                ) : (
                  <span>Quiz not generated</span>
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                {selected.mimeType === 'application/pdf' && viewerSource ? (
                  <iframe
                    title={selected.originalName}
                    src={viewerSource}
                    className="min-h-[420px] h-full w-full rounded-lg border border-neutral-200"
                  />
                ) : (
                  <article className="prose prose-sm max-w-none h-full overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <pre className="whitespace-pre-wrap break-words text-sm text-neutral-800">
                      {selected.content || 'No text content available for this file.'}
                    </pre>
                  </article>
                )}
              </div>

              <section className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Summary</h3>
                  {analysisState.loading === 'summary' ? <LoadingSpinner label="Summarizing" /> : null}
                </div>
                {selected.summary ? (
                  <article className="prose prose-sm max-w-none rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
                    <pre className="whitespace-pre-wrap break-words">{selected.summary}</pre>
                  </article>
                ) : (
                  <p className="text-sm text-neutral-600">
                    No summary yet. Click "Generate summary" to distill the key points from this material.
                  </p>
                )}
              </section>

              <section className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Ask this material</h3>
                  {ragState.loading ? <LoadingSpinner label="Thinking" /> : null}
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <form className="space-y-3" onSubmit={handleAskRag}>
                    <label className="block text-xs font-medium text-neutral-600">
                      Question
                      <textarea
                        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Ask a question about this material..."
                        value={ragState.question}
                        onChange={(event) =>
                          setRagState((prev) => ({ ...prev, question: event.target.value, error: '' }))
                        }
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <button type="submit" className="btn-primary text-sm" disabled={ragState.loading}>
                        {ragState.loading ? 'Asking...' : 'Ask'}
                      </button>
                      <span>
                        Index status:{' '}
                        {selected.ragStatus === 'ready'
                          ? 'Ready'
                          : selected.ragStatus === 'indexing'
                            ? 'Indexing...'
                            : selected.ragStatus === 'failed'
                              ? 'Failed'
                              : 'Idle'}
                      </span>
                      {selected.ragUpdatedAt ? (
                        <span>Updated {dateFormatter.format(new Date(selected.ragUpdatedAt))}</span>
                      ) : null}
                    </div>
                  </form>

                  {ragState.error ? (
                    <p className="mt-3 text-xs text-red-600">{ragState.error}</p>
                  ) : null}

                  {ragState.answer ? (
                    <article className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                      <pre className="whitespace-pre-wrap break-words">{ragState.answer}</pre>
                    </article>
                  ) : null}

                  {ragState.sources.length ? (
                    <div className="mt-3 text-xs text-neutral-500">
                      <p className="font-medium text-neutral-700">Sources</p>
                      <ul className="mt-2 space-y-2">
                        {ragState.sources.map((source) => (
                          <li key={source.id} className="rounded border border-neutral-200 bg-white p-2">
                            <div className="font-semibold text-neutral-700">
                              {source.sourceFile || 'Unknown'} {source.page != null ? `(p. ${source.page})` : ''}
                            </div>
                            <div>Score: {typeof source.score === 'number' ? source.score.toFixed(3) : source.score}</div>
                            {source.section ? <div>Section: {source.section}</div> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}
        </section>
      </div>
    </Page>
  );
}
