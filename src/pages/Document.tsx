import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Calendar, Loader2, Share, CloudCheck, Sparkles, Lock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { ChatBot } from '@/components/ui/ChatBot';
import { api } from '@/services/api';
import type { CoordinationDocument, ChatMessage, StrategyType } from '@/types';

// Loader con halo pulsante usado tanto en el contenido como al crear las clases.
function AiSpinner() {
  return (
    <div className="relative">
      <span className="absolute -inset-2 rounded-full bg-primary/15 blur-md animate-pulse" />
      <div className="relative w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    </div>
  );
}

export function Document() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docId = parseInt(id || '0');
  const isReadOnly = searchParams.get('readonly') === 'true';

  const {
    currentDocument,
    setCurrentDocument,
    chatHistory,
    addChatMessage,
    clearChatHistory,
    isGenerating,
    setIsGenerating,
  } = useStore();

  const [isChatGenerating, setIsChatGenerating] = useState(false);
  const [isGeneratingClasses, setIsGeneratingClasses] = useState(false);
  const [visibleClasses, setVisibleClasses] = useState<Set<string>>(new Set());
  const [editingContent, setEditingContent] = useState<{
    strategy?: string;
    title?: string;
    problem_edge?: string;
    eval_criteria?: string;
  }>({});
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isClassesCollapsed, setIsClassesCollapsed] = useState(false);
  const [editingClassTitle, setEditingClassTitle] = useState<{ subjectId: number; classNumber: number } | null>(null);
  const [editingLearningObjective, setEditingLearningObjective] = useState<{
    subjectId: number;
    classNumber: number;
    value: string;
  } | null>(null);
  const [editingStrategyType, setEditingStrategyType] = useState(false);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());

  const toggleWeekCollapse = (weekLabel: string) => {
    setCollapsedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekLabel)) {
        newSet.delete(weekLabel);
      } else {
        newSet.add(weekLabel);
      }
      return newSet;
    });
  };

  const STRATEGY_TYPE_OPTIONS: { value: StrategyType; label: string }[] = [
    { value: 'proyecto', label: 'Proyecto' },
    { value: 'taller_laboratorio', label: 'Taller/laboratorio' },
    { value: 'ateneo_debate', label: 'Ateneo/Debate' },
  ];

  useEffect(() => {
    loadDocument();
    return () => {
      clearChatHistory();
    };
  }, [docId]);

  // Auto-generate content when document loads for the first time
  useEffect(() => {
    if (currentDocument && !hasContent && !isGenerating) {
      handleGenerateContent();
    }
  }, [currentDocument?.id]); // Only trigger on document load, not on every update

  const loadDocument = async () => {
    try {
      const doc = await api.documents.getById(docId);
      setCurrentDocument(doc as CoordinationDocument);
    } catch (error) {
      console.error('Error loading document:', error);
    }
  };

  const handleChatMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
    };

    addChatMessage(userMessage);
    setIsChatGenerating(true);

    try {
      // Send full history to backend (exactly like original frontend)
      const chatResult = await api.chat.sendMessage(`/coordination-documents/${docId}/chat`, {
        history: chatHistory.concat(userMessage), // Send complete history
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: chatResult.response,
      };

      addChatMessage(assistantMessage);

      // Update document with any changes (exactly like original frontend)
      if (chatResult.document) {
        setCurrentDocument({ ...currentDocument, ...chatResult.document });
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Lo siento, hubo un error. Intenta de nuevo.',
      };
      addChatMessage(errorMessage);
    } finally {
      setIsChatGenerating(false);
    }
  };

  // Stagger the appearance of each class, in the same order as the render
  const animateClassesAppearing = (finalDoc: CoordinationDocument) => {
    const finalSubjectsData = finalDoc.subjects_data || {};
    const finalSubjects = finalDoc.subjects || [];
    const allClassesForAnimation: { class_number: number; subject_id: number; subject_name: string }[] = [];

    finalSubjects.forEach((s: any) => {
      const sData = finalSubjectsData[s.id] || {};
      const classPlan = sData.class_plan || [];
      classPlan.forEach((c: any) => {
        allClassesForAnimation.push({
          class_number: c.class_number,
          subject_id: s.id,
          subject_name: s.name,
        });
      });
    });

    // Sort in same order as render: by class_number, then by subject_name
    allClassesForAnimation.sort((a, b) => {
      if (a.class_number !== b.class_number) {
        return a.class_number - b.class_number;
      }
      return a.subject_name.localeCompare(b.subject_name);
    });

    allClassesForAnimation.forEach((c, index) => {
      setTimeout(() => {
        setVisibleClasses((prev) => new Set([...prev, `${c.class_number}-${c.subject_id}`]));
      }, index * 150); // 150ms delay between each class
    });
  };

  // Generates the itinerary content only (strategy, problem_edge, eval_criteria).
  // Class plans are generated on demand via handleGenerateClasses ("Crear clases").
  const handleGenerateContent = async () => {
    if (!currentDocument) return;

    setIsGenerating(true);
    setVisibleClasses(new Set());

    try {
      await api.documents.generate(docId, {
        generate_strategy: true,
        generate_class_plans: false,
      });

      // Reload document to show the generated content
      const docWithStrategy = await api.documents.getById(docId);
      setCurrentDocument(docWithStrategy);
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Error al generar contenido con IA');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generates the class plans (triggered by the "Crear clases" button).
  const handleGenerateClasses = async () => {
    if (!currentDocument) return;

    setIsGeneratingClasses(true);
    setVisibleClasses(new Set());

    try {
      await api.documents.generate(docId, {
        generate_strategy: false,
        generate_class_plans: true,
      });

      const finalDoc = await api.documents.getById(docId);
      setCurrentDocument(finalDoc);
      animateClassesAppearing(finalDoc);
    } catch (error) {
      console.error('Error generating classes:', error);
      alert('Error al generar las clases con IA');
    } finally {
      setIsGeneratingClasses(false);
    }
  };

  const handleSaveClassTitle = async (subjectId: number, classNumber: number, newTitle: string) => {
    if (!currentDocument || !currentDocument.subjects_data) return;

    const subjectsDataCopy = JSON.parse(JSON.stringify(currentDocument.subjects_data));
    if (subjectsDataCopy[subjectId]?.class_plan) {
      const classItem = subjectsDataCopy[subjectId].class_plan.find(
        (c: { class_number: number }) => c.class_number === classNumber,
      );
      if (classItem && classItem.title !== newTitle) {
        classItem.title = newTitle;
        try {
          await api.documents.update(docId, { subjects_data: subjectsDataCopy });
          setCurrentDocument({
            ...currentDocument,
            subjects_data: subjectsDataCopy,
          });
        } catch (error) {
          console.error('Error saving class title:', error);
        }
      }
    }
  };

  const handleSaveLearningObjective = async (subjectId: number, classNumber: number, newObjective: string) => {
    if (!currentDocument || !currentDocument.subjects_data) return;

    const subjectsDataCopy = JSON.parse(JSON.stringify(currentDocument.subjects_data));
    if (subjectsDataCopy[subjectId]?.class_plan) {
      const classItem = subjectsDataCopy[subjectId].class_plan.find(
        (c: { class_number: number }) => c.class_number === classNumber,
      );
      if (classItem && classItem.objective !== newObjective) {
        classItem.objective = newObjective;
        try {
          await api.documents.update(docId, { subjects_data: subjectsDataCopy });
          setCurrentDocument({
            ...currentDocument,
            subjects_data: subjectsDataCopy,
          });
        } catch (error) {
          console.error('Error saving learning objective:', error);
        }
      }
    }
  };

  const handlePublishDocument = async () => {
    if (!currentDocument) return;

    try {
      await api.documents.publish(docId);
      const updatedDoc = await api.documents.getById(docId);
      setCurrentDocument(updatedDoc as CoordinationDocument);
      alert('Documento publicado exitosamente');
    } catch (error) {
      console.error('Error publishing document:', error);
      alert('Error al publicar el documento');
    }
  };

  const handleContentEdit = (field: 'strategy' | 'title' | 'problem_edge' | 'eval_criteria', content: string) => {
    setEditingContent((prev) => ({
      ...prev,
      [field]: content,
    }));
  };

  const handleSaveContent = async (field: 'strategy' | 'title' | 'problem_edge' | 'eval_criteria') => {
    try {
      const updatedContent = editingContent[field];
      if (!updatedContent || !currentDocument) return;

      let updateData: any = {};

      if (field === 'title') {
        updateData = { name: updatedContent };
      } else if (field === 'strategy') {
        // Mantener el type existente y actualizar solo el context
        const currentStrategies = currentDocument.methodological_strategies;
        updateData = {
          methodological_strategies: {
            type: currentStrategies?.type || 'proyecto',
            context: updatedContent,
          },
        };
      } else if (field === 'problem_edge') {
        updateData = { problem_edge: updatedContent };
      } else if (field === 'eval_criteria') {
        updateData = { eval_criteria: updatedContent };
      }

      await api.documents.update(docId, updateData);
      // Update local state
      setCurrentDocument({
        ...currentDocument,
        ...updateData,
      });

      // Clear editing state for this field
      setEditingContent((prev) => {
        const newState = { ...prev };
        delete newState[field];
        return newState;
      });
    } catch (error) {
      console.error('Error saving content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar el contenido: ${errorMessage}`);
    }
  };

  if (!currentDocument) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  const subjectsData = currentDocument.subjects_data || {};
  const subjects = currentDocument.subjects || [];
  const hasContent = !!currentDocument.methodological_strategies;
  const hasClasses = subjects.some((s: any) => ((subjectsData[s.id] || {}).class_plan || []).length > 0);

  return (
    <div className="h-screen flex flex-col gradient-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#DAD5F6] bg-[#FFFFFF26] backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="cursor-pointer hover:opacity-70">
            <ChevronLeft className="w-6 h-6 text-[#324155]" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="header-title text-[#10182B]">
            Itinerario del Área de {currentDocument.area?.name || 'Área'}
          </h1>
          <CloudCheck className="w-5 h-5 text-[#324155]" />
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={currentDocument.status !== 'published' && !isGenerating ? handlePublishDocument : undefined}
            disabled={currentDocument.status === 'published' || isGenerating}
            className={`flex items-center gap-2 text-primary bg-muted border-none rounded-xl ${
              currentDocument.status === 'published' || isGenerating
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:bg-muted hover:text-primary'
            }`}
          >
            <Share className="w-4 h-4 text-primary" />
            {currentDocument.status === 'published' ? 'Publicado' : 'Compartir'}
          </Button>
          <button onClick={() => navigate('/')} className="cursor-pointer hover:opacity-70">
            <X className="w-6 h-6 text-[#324155]" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Sidebar - Chat */}
        {!isReadOnly && (
          <div className={`${isChatCollapsed ? 'w-12' : 'w-80'} flex flex-col transition-all duration-300 ease-in-out`}>
            <ChatBot
              messages={chatHistory}
              onSendMessage={handleChatMessage}
              isGenerating={isGenerating || isChatGenerating}
              placeholder="Escribí tu mensaje para Alizia..."
              welcomeMessage={{
                title: 'Documento creado',
                content: 'Si necesitás realizar algún cambio, podés escribirme y lo ajustamos.',
              }}
              isCollapsed={isChatCollapsed}
              onToggleCollapse={() => setIsChatCollapsed(!isChatCollapsed)}
            />
          </div>
        )}

        {/* Center - AI Generated Content */}
        <div className="flex-1 flex flex-col activity-card-bg rounded-2xl overflow-hidden">
          {/* Document Title Header */}
          <div className="p-4 px-6 border-b border-muted flex flex-row items-center justify-between h-14">
            <div className="flex-1 min-w-0 mr-4">
              {editingContent.title !== undefined ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingContent.title}
                    onChange={(e) => handleContentEdit('title', e.target.value)}
                    className="headline-1-bold text-[#10182B] bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 px-1 py-0 max-w-md"
                    placeholder="Título del documento"
                  />
                  <button
                    onClick={() => handleSaveContent('title')}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 cursor-pointer"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setEditingContent((prev) => {
                        const newState = { ...prev };
                        delete newState.title;
                        return newState;
                      });
                    }}
                    className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <h2
                  className={`headline-1-bold text-[#10182B] truncate ${!isReadOnly ? 'cursor-pointer hover:bg-[#F5F3FF] px-2 py-1 rounded transition-colors' : ''}`}
                  onClick={!isReadOnly ? () => handleContentEdit('title', currentDocument.name) : undefined}
                  title={!isReadOnly ? 'Clic para editar' : currentDocument.name}
                >
                  {currentDocument.name}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-2 text-[#47566C] text-sm">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(currentDocument.start_date).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}{' '}
                -{' '}
                {new Date(currentDocument.end_date).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Eje Problemático Section */}
                <div className="space-y-4">
                  <h3 className="section-title text-[#10182B]">Eje problemático</h3>
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <AiSpinner />
                      <p className="body-2-regular text-[#47566C] mt-4">Generando contenido con IA...</p>
                    </div>
                  ) : (
                    <div>
                      {editingContent.problem_edge !== undefined && !isReadOnly ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingContent.problem_edge}
                            onChange={(e) => handleContentEdit('problem_edge', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg section-description text-[#324155] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap"
                            rows={8}
                            placeholder="Editá el eje problemático..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveContent('problem_edge')}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setEditingContent((prev) => {
                                  const newState = { ...prev };
                                  delete newState.problem_edge;
                                  return newState;
                                });
                              }}
                              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`section-description text-[#324155] leading-relaxed whitespace-pre-wrap ${!isReadOnly ? 'cursor-pointer hover:bg-[#F5F3FF] p-2 rounded transition-colors' : 'p-2'}`}
                          onClick={
                            !isReadOnly
                              ? () => handleContentEdit('problem_edge', currentDocument.problem_edge || '')
                              : undefined
                          }
                          title={!isReadOnly ? 'Clic para editar' : ''}
                        >
                          {hasContent ? (
                            currentDocument.problem_edge || ''
                          ) : (
                            <p className="text-[#47566C]/60 italic">Generando contenido con IA...</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div className="border-t border-[#DAD5F6] my-6"></div>

                {/* Estrategia Metodológica Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="section-title text-[#10182B]">Estrategia metodológica</h3>
                    {hasContent && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-1 h-5 bg-[#10182B] rounded-full" />
                        {editingStrategyType && !isReadOnly ? (
                          <select
                            value={currentDocument.methodological_strategies?.type || 'proyecto'}
                            onChange={async (e) => {
                              const newType = e.target.value as StrategyType;
                              try {
                                const updatedStrategies = {
                                  type: newType,
                                  context: currentDocument.methodological_strategies?.context || '',
                                };
                                await api.documents.update(docId, { methodological_strategies: updatedStrategies });
                                setCurrentDocument({
                                  ...currentDocument,
                                  methodological_strategies: updatedStrategies,
                                });
                              } catch (error) {
                                console.error('Error saving strategy type:', error);
                              }
                              setEditingStrategyType(false);
                            }}
                            onBlur={() => setEditingStrategyType(false)}
                            className="font-semibold text-[#10182B] bg-transparent border-b-2 border-[#10182B] focus:outline-none cursor-pointer"
                            autoFocus
                          >
                            {STRATEGY_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`font-semibold text-[#10182B] ${!isReadOnly ? 'cursor-pointer hover:opacity-70' : ''}`}
                            onClick={!isReadOnly ? () => setEditingStrategyType(true) : undefined}
                            title={!isReadOnly ? 'Clic para editar' : ''}
                          >
                            {STRATEGY_TYPE_OPTIONS.find(
                              (o) => o.value === currentDocument.methodological_strategies?.type,
                            )?.label || 'Proyecto'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <AiSpinner />
                      <p className="body-2-regular text-[#47566C] mt-4">Generando contenido con IA...</p>
                    </div>
                  ) : (
                    <div>
                      {editingContent.strategy !== undefined && !isReadOnly ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingContent.strategy}
                            onChange={(e) => handleContentEdit('strategy', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg section-description text-[#324155] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap"
                            rows={12}
                            placeholder="Editá la estrategia metodológica..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveContent('strategy')}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setEditingContent((prev) => {
                                  const newState = { ...prev };
                                  delete newState.strategy;
                                  return newState;
                                });
                              }}
                              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`section-description text-[#324155] leading-relaxed whitespace-pre-wrap ${!isReadOnly ? 'cursor-pointer hover:bg-[#F5F3FF] p-2 rounded transition-colors' : 'p-2'}`}
                          onClick={
                            !isReadOnly
                              ? () =>
                                  handleContentEdit(
                                    'strategy',
                                    currentDocument.methodological_strategies?.context || '',
                                  )
                              : undefined
                          }
                          title={!isReadOnly ? 'Clic para editar' : ''}
                        >
                          {hasContent ? (
                            currentDocument.methodological_strategies?.context || ''
                          ) : (
                            <p className="text-[#47566C]/60 italic">Generando contenido con IA...</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div className="border-t border-[#DAD5F6] my-6"></div>

                {/* Criterios de Evaluación Section */}
                <div className="space-y-4">
                  <h3 className="section-title text-[#10182B]">Criterios de evaluación</h3>
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <AiSpinner />
                      <p className="body-2-regular text-[#47566C] mt-4">Generando contenido con IA...</p>
                    </div>
                  ) : (
                    <div>
                      {editingContent.eval_criteria !== undefined && !isReadOnly ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingContent.eval_criteria}
                            onChange={(e) => handleContentEdit('eval_criteria', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg section-description text-[#324155] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap"
                            rows={8}
                            placeholder="Editá los criterios de evaluación..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveContent('eval_criteria')}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setEditingContent((prev) => {
                                  const newState = { ...prev };
                                  delete newState.eval_criteria;
                                  return newState;
                                });
                              }}
                              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`section-description text-[#324155] leading-relaxed ${!isReadOnly ? 'cursor-pointer hover:bg-[#F5F3FF] p-2 rounded transition-colors' : 'p-2'}`}
                          onClick={
                            !isReadOnly
                              ? () => handleContentEdit('eval_criteria', currentDocument.eval_criteria || '')
                              : undefined
                          }
                          title={!isReadOnly ? 'Clic para editar' : ''}
                        >
                          {hasContent ? (
                            <ul className="space-y-2">
                              {(currentDocument.eval_criteria || '')
                                .split(/\\n|\n/)
                                .filter((line: string) => line.trim())
                                .map((line: string, index: number) => {
                                  const trimmedLine = line.trim();
                                  const isBullet = trimmedLine.startsWith('-');
                                  const content = isBullet ? trimmedLine.slice(1).trim() : trimmedLine;
                                  return (
                                    <li key={index} className="flex items-start gap-2">
                                      {isBullet && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#324155] mt-2 shrink-0" />
                                      )}
                                      <span className={isBullet ? '' : 'ml-3.5'}>{content}</span>
                                    </li>
                                  );
                                })}
                            </ul>
                          ) : (
                            <p className="text-[#47566C]/60 italic">Generando contenido con IA...</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Class Schedule Section - Fixed at bottom */}
            {hasContent && !isGenerating && (
              <div className="p-6 bg-[#FFFFFF26] backdrop-blur-sm shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between">
                  <h3 className="schedule-title text-[#324155]">Cronograma de clases por disciplinas</h3>
                  <Button
                    onClick={() => setIsClassesCollapsed(false)}
                    className="flex items-center gap-2 text-primary bg-transparent border-none cursor-pointer rounded-xl hover:bg-muted hover:text-primary"
                  >
                    Ver clases
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Classes by Discipline */}
        {!isClassesCollapsed && (
          <div className="w-80 flex flex-col activity-card-bg rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#DAD5F6] flex items-center justify-between h-14">
              <h3 className="headline-1-bold text-[#10182B]">Clases por disciplinas</h3>
              <button
                onClick={() => setIsClassesCollapsed(true)}
                className="cursor-pointer hover:opacity-70"
                title="Cerrar clases"
              >
                <X className="w-5 h-5 text-[#324155]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {isGenerating ? (
                /* Estado A: el itinerario se está generando → clases en espera, bloqueadas (sin loader) */
                <div className="h-full flex flex-col items-center justify-center px-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#ECE8FB] flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-[#9B8FD9]" />
                  </div>
                  <p className="headline-1-bold text-[#10182B]">Generá las clases</p>
                  <p className="body-2-regular text-[#47566C] mt-2">
                    Estamos armando el itinerario del área. En cuanto esté listo vas a poder crear las clases.
                  </p>
                </div>
              ) : isGeneratingClasses ? (
                /* Estado C: generando las clases tras presionar "Crear clases" */
                <div className="h-full flex flex-col items-center justify-center px-6 text-center">
                  <AiSpinner />
                  <p className="headline-1-bold text-[#10182B] mt-4">Creando clases</p>
                  <p className="body-2-regular text-[#47566C] mt-2">
                    Generando el cronograma de clases por disciplina con IA…
                  </p>
                </div>
              ) : !hasClasses ? (
                /* Estado B: contenido listo, sin clases aún → CTA para crearlas */
                <div className="h-full flex flex-col items-center justify-center px-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary-gradient flex items-center justify-center shadow-[0_8px_24px_rgba(115,95,227,0.35)] mb-4">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <p className="headline-1-bold text-[#10182B]">Generá las clases</p>
                  <p className="body-2-regular text-[#47566C] mt-2 mb-5">
                    El itinerario ya está listo. Creá el cronograma de clases por disciplina con un solo clic.
                  </p>
                  {!isReadOnly && (
                    <button
                      onClick={handleGenerateClasses}
                      className="w-full h-11 rounded-xl bg-primary-gradient text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition-opacity shadow-[0_8px_24px_rgba(115,95,227,0.35)]"
                    >
                      <Sparkles className="w-4 h-4" />
                      Crear clases
                    </button>
                  )}
                </div>
              ) : (
              <>
              {(() => {
                // Collect all classes from all subjects separately
                const allClasses: any[] = [];
                const subjectColors: Record<number, string> = {};
                const colorPalette = [
                  '#8B5CF6', // purple
                  '#10B981', // green
                  '#F59E0B', // orange
                  '#EF4444', // red
                  '#3B82F6', // blue
                  '#EC4899', // pink
                  '#14B8A6', // teal
                ];

                subjects.forEach((s: any, idx: number) => {
                  subjectColors[s.id] = colorPalette[idx % colorPalette.length];
                  const sData = subjectsData[s.id] || {};
                  const classPlan = sData.class_plan || [];

                  classPlan.forEach((c: any) => {
                    // Add each class separately for each subject
                    allClasses.push({
                      class_number: c.class_number,
                      title: c.title || 'Título clase',
                      date: c.date || '',
                      subject_id: s.id,
                      subject_name: s.name,
                      category_ids: c.category_ids || [],
                    });
                  });
                });

                // Sort classes by class_number, then by subject
                allClasses.sort((a, b) => {
                  if (a.class_number !== b.class_number) {
                    return a.class_number - b.class_number;
                  }
                  return a.subject_name.localeCompare(b.subject_name);
                });

                // Helper function to get week date range
                const getWeekLabel = (classNumber: number, startDate: string) => {
                  if (!startDate) return `Semana ${Math.floor((classNumber - 1) / 4) + 1}`;

                  const start = new Date(startDate);
                  const weekNumber = Math.floor((classNumber - 1) / 4);
                  const weekStart = new Date(start);
                  weekStart.setDate(start.getDate() + weekNumber * 7);
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);

                  const formatDate = (date: Date) => {
                    const day = date.getDate();
                    const months = [
                      'enero',
                      'febrero',
                      'marzo',
                      'abril',
                      'mayo',
                      'junio',
                      'julio',
                      'agosto',
                      'septiembre',
                      'octubre',
                      'noviembre',
                      'diciembre',
                    ];
                    return `${day} de ${months[date.getMonth()]}`;
                  };

                  return `Semana del ${formatDate(weekStart)} al ${formatDate(weekEnd)}`;
                };

                // Group classes by week
                const groupedByWeek: Record<string, any[]> = {};
                allClasses.forEach((c) => {
                  const weekKey = getWeekLabel(c.class_number, currentDocument?.start_date || '');
                  if (!groupedByWeek[weekKey]) {
                    groupedByWeek[weekKey] = [];
                  }
                  groupedByWeek[weekKey].push(c);
                });

                return Object.entries(groupedByWeek).map(([weekLabel, classes], weekIndex) => (
                  <div
                    key={weekLabel}
                    className={`space-y-3 ${weekIndex > 0 ? 'border-t border-[#DAD5F6] pt-6' : ''}`}
                  >
                    <h4
                      className="body-2-medium text-[#47566C] text-sm cursor-pointer hover:opacity-70 select-none"
                      onClick={() => toggleWeekCollapse(weekLabel)}
                    >
                      {weekLabel}
                    </h4>
                    {!collapsedWeeks.has(weekLabel) && (
                      <div className="space-y-2">
                        {classes.map((c, idx: number) => {
                        const getObjective = () => {
                          const sData = currentDocument.subjects_data || {};
                          const subjectData = sData[c.subject_id] || { class_plan: [] };
                          const classPlan = subjectData.class_plan || [];
                          const classItem = classPlan.find((item) => item.class_number === c.class_number);
                          return classItem?.objective || '...';
                        };

                        const classKey = `${c.class_number}-${c.subject_id}`;
                        const isVisible = visibleClasses.size === 0 || visibleClasses.has(classKey);

                        return (
                          <div
                            key={`${c.class_number}-${c.subject_id}-${idx}`}
                            className={`bg-[#F3F0FF] rounded-2xl p-4 transition-all duration-500 ease-out ${
                              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                            }`}
                          >
                            {/* Title */}
                            {editingClassTitle &&
                            editingClassTitle.subjectId === c.subject_id &&
                            editingClassTitle.classNumber === c.class_number ? (
                              <input
                                type="text"
                                value={c.title || ''}
                                onChange={(e) => {
                                  if (!currentDocument.subjects_data) return;
                                  const sDataCopy = JSON.parse(JSON.stringify(currentDocument.subjects_data));
                                  if (sDataCopy[c.subject_id]?.class_plan) {
                                    const classItem = sDataCopy[c.subject_id].class_plan.find(
                                      (item: { class_number: number }) => item.class_number === c.class_number,
                                    );
                                    if (classItem) {
                                      classItem.title = e.target.value;
                                      setCurrentDocument({
                                        ...currentDocument,
                                        subjects_data: sDataCopy,
                                      });
                                    }
                                  }
                                }}
                                onBlur={() => {
                                  handleSaveClassTitle(c.subject_id, c.class_number, c.title || '');
                                  setEditingClassTitle(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveClassTitle(c.subject_id, c.class_number, c.title || '');
                                    setEditingClassTitle(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingClassTitle(null);
                                  }
                                }}
                                className="w-full text-[#10182B] font-semibold text-sm bg-transparent border-b-2 border-primary focus:outline-none mb-2"
                                placeholder=""
                                autoFocus
                              />
                            ) : (
                              <p
                                className={`text-[#10182B] font-semibold text-sm mb-2 ${!isReadOnly ? 'cursor-pointer hover:opacity-70' : ''}`}
                                onClick={
                                  !isReadOnly
                                    ? () =>
                                        setEditingClassTitle({
                                          subjectId: c.subject_id,
                                          classNumber: c.class_number,
                                        })
                                    : undefined
                                }
                                title={!isReadOnly ? 'Clic para editar' : ''}
                              >
                                {c.title || 'Título clase'}
                              </p>
                            )}

                            {/* Objective */}
                            {editingLearningObjective &&
                            editingLearningObjective.subjectId === c.subject_id &&
                            editingLearningObjective.classNumber === c.class_number ? (
                              <div className="mb-3">
                                <span className="callout-semi-bold text-[#324155]">Objetivo: </span>
                                <textarea
                                  value={editingLearningObjective.value}
                                  onChange={(e) => {
                                    setEditingLearningObjective({
                                      ...editingLearningObjective,
                                      value: e.target.value,
                                    });
                                  }}
                                  onBlur={() => {
                                    handleSaveLearningObjective(
                                      c.subject_id,
                                      c.class_number,
                                      editingLearningObjective.value,
                                    );
                                    setEditingLearningObjective(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      setEditingLearningObjective(null);
                                    }
                                  }}
                                  className="w-full callout-regular text-[#324155] bg-transparent border-b border-primary focus:outline-none resize-none mt-1"
                                  rows={3}
                                  placeholder=""
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <p
                                className={`mb-3 leading-none ${!isReadOnly ? 'cursor-pointer hover:opacity-70' : ''}`}
                                onClick={
                                  !isReadOnly
                                    ? () =>
                                        setEditingLearningObjective({
                                          subjectId: c.subject_id,
                                          classNumber: c.class_number,
                                          value: getObjective(),
                                        })
                                    : undefined
                                }
                                title={!isReadOnly ? 'Clic para editar' : ''}
                              >
                                <span className="callout-semi-bold text-[#324155]">Objetivo: </span>
                                <span className="callout-regular text-[#324155]">{getObjective()}</span>
                              </p>
                            )}

                            {/* Subject indicator */}
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: subjectColors[c.subject_id] }}
                              />
                              <span className="text-[#47566C] text-sm">{c.subject_name}</span>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    )}
                  </div>
                ));
              })()}

              {subjects.length === 0 && (
                <p className="body-2-regular text-[#47566C] text-center">No hay materias configuradas</p>
              )}
              </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
