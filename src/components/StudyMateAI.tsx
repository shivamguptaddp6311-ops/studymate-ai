import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { UserProfile } from "../types";
import { StudyMateAIProps, ChatMessage, StudyWorkspace } from "./studymate-ai/types";
import { Sparkles, X, BookOpen, Brain, Layers, RotateCcw } from "lucide-react";

// Hooks
import { useChat } from "../hooks/useChat";
import { useVoice } from "../hooks/useVoice";
import { useOCR } from "../hooks/useOCR";
import { useAttachments } from "../hooks/useAttachments";
import { useAI } from "../hooks/useAI";
import { useNotebookLM } from "../hooks/useNotebookLM";
import { buildDocumentContextPrompt } from "../utils/documentProcessor";

// Components
import { ChatHeader } from "./studymate-ai/ChatHeader";
import { MessageList } from "./studymate-ai/MessageList";
import { PromptInput } from "./studymate-ai/PromptInput";
import { ImageUploader } from "./studymate-ai/ImageUploader";
import { PDFUploader } from "./studymate-ai/PDFUploader";
import { OCRUploader } from "./studymate-ai/OCRUploader";
import { ChatHistory } from "./studymate-ai/ChatHistory";
import { AIErrorBoundary } from "./studymate-ai/AIErrorBoundary";
import { LiveVoiceTutorModal } from "./studymate-ai/LiveVoiceTutorModal";
import { NotebookLMStudio } from "./studymate-ai/NotebookLMStudio";
import { NotebookDocumentViewer } from "./studymate-ai/NotebookDocumentViewer";
import { ImageGenerator } from "./ImageGenerator";
import { WorkspacePanelModal } from "./studymate-ai/WorkspacePanelModal";
import { AISettingsModal } from "./studymate-ai/AISettingsModal";
import { AITutorModeModal } from "./studymate-ai/AITutorModeModal";
import { MistakeNotebookModal } from "./studymate-ai/MistakeNotebookModal";
import { StudyPlannerModal } from "./studymate-ai/StudyPlannerModal";
import { FocusSessionModal } from "./studymate-ai/FocusSessionModal";
import { FormulaConceptEngineModal } from "./studymate-ai/FormulaConceptEngineModal";
import { ProgressDashboardModal } from "./studymate-ai/ProgressDashboardModal";
import { InteractiveWhiteboardModal } from "./studymate-ai/InteractiveWhiteboardModal";
import { LiveProblemSolverModal } from "./studymate-ai/LiveProblemSolverModal";
import { CollaborativeWorkspaceModal } from "./studymate-ai/CollaborativeWorkspaceModal";
import { LiveLectureModeModal } from "./studymate-ai/LiveLectureModeModal";
import { UniversalAISearchModal } from "./studymate-ai/UniversalAISearchModal";
import { KnowledgeGraphModal } from "./studymate-ai/KnowledgeGraphModal";
import { SpecializedAIAgentsModal } from "./studymate-ai/SpecializedAIAgentsModal";
import { ResearchModeModal } from "./studymate-ai/ResearchModeModal";
import { ExamIntelligenceModal } from "./studymate-ai/ExamIntelligenceModal";
import { AdaptiveRevisionEngineModal } from "./studymate-ai/AdaptiveRevisionEngineModal";
import { AdvancedExportModal } from "./studymate-ai/AdvancedExportModal";
import { CloudSecuritySyncModal } from "./studymate-ai/CloudSecuritySyncModal";

export function StudyMateAI({
  profile,
  onAwardXP,
  onAddNotification,
  isFullScreen,
  onToggleFullScreen,
  onOpenAISettings
}: StudyMateAIProps) {
  const [usePersonalization, setUsePersonalization] = useState(true);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("studymate_ai_model") || "auto");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSessionsMenu, setShowSessionsMenu] = useState(false);
  const [showLiveVoiceTutor, setShowLiveVoiceTutor] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);
  const [showContinueBanner, setShowContinueBanner] = useState(true);

  // Tutor System Modals State
  const [showAITutorModal, setShowAITutorModal] = useState(false);
  const [showMistakeNotebookModal, setShowMistakeNotebookModal] = useState(false);
  const [showStudyPlannerModal, setShowStudyPlannerModal] = useState(false);
  const [showFocusSessionModal, setShowFocusSessionModal] = useState(false);
  const [showFormulaEngineModal, setShowFormulaEngineModal] = useState(false);
  const [showProgressDashboardModal, setShowProgressDashboardModal] = useState(false);

  // Real-time Interactive Platform Modals State
  const [showWhiteboardModal, setShowWhiteboardModal] = useState(false);
  const [showProblemSolverModal, setShowProblemSolverModal] = useState(false);
  const [showCollabWorkspaceModal, setShowCollabWorkspaceModal] = useState(false);
  const [showLiveLectureModal, setShowLiveLectureModal] = useState(false);

  // Scalable AI Platform Modals State
  const [showUniversalSearchModal, setShowUniversalSearchModal] = useState(false);
  const [showKnowledgeGraphModal, setShowKnowledgeGraphModal] = useState(false);
  const [showSpecializedAgentsModal, setShowSpecializedAgentsModal] = useState(false);
  const [showResearchModeModal, setShowResearchModeModal] = useState(false);
  const [showExamIntelligenceModal, setShowExamIntelligenceModal] = useState(false);
  const [showAdaptiveRevisionModal, setShowAdaptiveRevisionModal] = useState(false);
  const [showAdvancedExportModal, setShowAdvancedExportModal] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);

  // Workspace Ecosystem State
  const [workspaces, setWorkspaces] = useState<StudyWorkspace[]>(() => {
    try {
      const saved = localStorage.getItem("studymate_workspaces_data");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: "ws-physics",
        name: "Physics - Class 12",
        subject: "Physics",
        chapter: "Chapter 3: Electrostatics",
        isPinned: true,
        lastActive: "2 hours ago",
        pdfs: [{ id: "pdf-1", name: "Electrostatics_NCERT_Ch3.pdf", pageCount: 24, size: "3.2 MB" }],
        notes: [{ id: "n-1", title: "Coulomb's Law & Gauss Theorem", content: "F = k*q1*q2/r^2. Electric field flux Phi = Q/eps0.", createdAt: "Today" }],
        quizzes: [{ id: "q-1", title: "Electrostatics Practice Quiz 1", questionCount: 10, score: "9/10" }],
        flashcards: [{ id: "fc-1", title: "High-Yield Electrostatics Cards", cardCount: 12 }],
        chats: [{ id: "c-1", title: "Gauss Law Derivation Help", updatedAt: "2h ago" }],
        contextChips: [
          { id: "cc-1", label: "Physics Notes", type: "subject" },
          { id: "cc-2", label: "NCERT Class 12", type: "grade" },
          { id: "cc-3", label: "Electrostatics PDF", type: "pdf" }
        ]
      },
      {
        id: "ws-chemistry",
        name: "Organic Chemistry",
        subject: "Chemistry",
        chapter: "Reaction Mechanisms",
        isPinned: true,
        lastActive: "Yesterday",
        pdfs: [{ id: "pdf-2", name: "SN1_SN2_Mechanisms_Guide.pdf", pageCount: 18, size: "2.1 MB" }],
        notes: [{ id: "n-2", title: "SN1 vs SN2 Comparison Table", content: "SN1 is two-step racemization, SN2 is backside attack inversion.", createdAt: "Yesterday" }],
        quizzes: [{ id: "q-2", title: "Nucleophilic Substitution Quiz", questionCount: 8, score: "7/8" }],
        flashcards: [{ id: "fc-2", title: "Reagents & Catalysts Cards", cardCount: 15 }],
        chats: [{ id: "c-2", title: "SN1 Mechanism Walkthrough", updatedAt: "1d ago" }],
        contextChips: [
          { id: "cc-4", label: "Organic Chemistry", type: "subject" },
          { id: "cc-5", label: "Reactions", type: "chapter" }
        ]
      }
    ];
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    return localStorage.getItem("studymate_active_workspace_id") || "ws-physics";
  });

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const handleCreateWorkspace = (name: string, subject: string) => {
    const newWs: StudyWorkspace = {
      id: `ws-${Date.now()}`,
      name,
      subject,
      lastActive: "Just now",
      pdfs: [],
      notes: [],
      quizzes: [],
      flashcards: [],
      chats: [],
      contextChips: [
        { id: `cc-${Date.now()}-1`, label: name, type: "workspace" },
        { id: `cc-${Date.now()}-2`, label: subject, type: "subject" }
      ]
    };
    const updated = [newWs, ...workspaces];
    setWorkspaces(updated);
    setActiveWorkspaceId(newWs.id);
    localStorage.setItem("studymate_workspaces_data", JSON.stringify(updated));
    localStorage.setItem("studymate_active_workspace_id", newWs.id);
    if (onAddNotification) onAddNotification("Workspace Created", `Switched to ${name}.`, "success");
  };

  const handleTogglePinWorkspace = (wsId: string) => {
    const updated = workspaces.map((w) => w.id === wsId ? { ...w, isPinned: !w.isPinned } : w);
    setWorkspaces(updated);
    localStorage.setItem("studymate_workspaces_data", JSON.stringify(updated));
  };

  const handleClearWorkspaceMemory = (wsId: string) => {
    const updated = workspaces.map((w) => w.id === wsId ? { ...w, notes: [], quizzes: [], flashcards: [], pdfs: [] } : w);
    setWorkspaces(updated);
    localStorage.setItem("studymate_workspaces_data", JSON.stringify(updated));
  };

  useEffect(() => {
    if (onOpenAISettings) {
      onOpenAISettings(() => setShowSettingsModal(true));
    }
  }, [onOpenAISettings]);
  
  // NotebookLM Studio State
  const [showNotebookLMStudio, setShowNotebookLMStudio] = useState(false);
  const [notebookViewMode, setNotebookViewMode] = useState<"studio" | "viewer">("studio");

  // Image Generator Studio Modal State
  const [showImageGeneratorModal, setShowImageGeneratorModal] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Custom Hooks
  const notebookLM = useNotebookLM();

  // Custom Hooks
  const { 
    sessions,
    activeSessionId,
    activeSession,
    messages, 
    inputText, 
    setInputText, 
    addMessage, 
    updateMessage,
    createNewSession,
    deleteSession,
    deleteActiveChat,
    clearActiveChat,
    switchSession,
    renameSession,
    getDynamicSuggestions 
  } = useChat(profile);

  const {
    isListening,
    speakingMsgId,
    toggleVoiceInput,
    speakText
  } = useVoice();

  const {
    selectedImage,
    setSelectedImage,
    attachedPdf,
    setAttachedPdf,
    showPlusMenu,
    setShowPlusMenu,
    showDriveModal,
    setShowDriveModal,
    driveUrlInput,
    setDriveUrlInput,
    driveError,
    setDriveError,
    fileInputRef,
    pdfFileInputRef,
    handleImportDriveUrl,
    handleSelectDriveSample,
    handlePdfFileSelect,
    handleImageSelect
  } = useAttachments();

  const ocrState = useOCR();
  const {
    cameraActive,
    stopCamera,
    capturePhoto,
    activeSource,
    setActiveSource,
    cropSourceImage,
    setCropSourceImage,
    selectedPdf,
    setSelectedPdf,
    rotation,
    rotateClockwise,
    cropStageRef,
    cropBox,
    zoom,
    setZoom,
    pan,
    undoHistory,
    handleCropDragStart,
    handleCropDragMove,
    handleCropDragEnd,
    handleResetCrop,
    handleUndoCrop,
    executeCrop,
    ocrAction,
    setOcrAction,
    targetLanguage,
    setTargetLanguage,
    isOcrProcessing,
    ocrError,
    scannedSolution,
    setScannedSolution,
    qualityWarning,
    videoRef,
    startCamera,
    executeHomeworkScan
  } = ocrState;

  const {
    isLoading,
    isWebSearching,
    isGeneratingImage,
    errorMessage,
    errorCode,
    setErrorMessage,
    handleCancelRequest,
    handleRetry,
    solveScannedQuestion,
    handleSendAI,
    onRequestVideoLesson,
    onSubmitVideoSettings,
    onCancelVideoLecture
  } = useAI();

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
    }
  }, []);

  const lastMsgIdRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  // Auto-scroll on new messages, streaming updates, or session switches
  useEffect(() => {
    const isNewSession = activeSessionId !== activeSessionIdRef.current;
    activeSessionIdRef.current = activeSessionId;

    const lastMsg = messages[messages.length - 1];
    const isNewMessageAdded = lastMsg && lastMsg.id !== lastMsgIdRef.current;
    if (lastMsg) lastMsgIdRef.current = lastMsg.id;

    if (isNewSession || isNewMessageAdded) {
      // Immediate scroll to bottom on new user message or session switch
      requestAnimationFrame(() => scrollToBottom(false));
    } else {
      // For streaming text or loading state changes, scroll if user is near bottom
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        if (isNearBottom) {
          requestAnimationFrame(() => scrollToBottom(true));
        }
      }
    }
  }, [messages, isLoading, activeSessionId, selectedImage, attachedPdf, scrollToBottom]);

  // Adjust scroll position when mobile visual viewport resizes (e.g. keyboard opens)
  useEffect(() => {
    const handleViewportResize = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        if (isNearBottom) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
      }
    };
  }, []);

  const handleDeleteCurrentChat = () => {
    handleCancelRequest();
    deleteActiveChat();
    setShowClearConfirm(false);
    if (onAddNotification) {
      onAddNotification("Chat Deleted", "Switched to active chat thread.", "info");
    }
  };

  const handleSend = useCallback((textToSendOverride?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = (typeof textToSendOverride === "string" ? textToSendOverride : inputText).trim();
    if ((!textToSend && !selectedImage && !attachedPdf) || isLoading) return;

    setInputText("");

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      text: textToSend,
      image: selectedImage || undefined,
      pdf: attachedPdf || undefined,
      timestamp: new Date()
    };

    addMessage(userMessage);

    setSelectedImage(null);
    setAttachedPdf(null);

    const docContext = buildDocumentContextPrompt(notebookLM.documents, notebookLM.activeDocIds, textToSend);

    handleSendAI({
      textToSend,
      userMessage,
      messages,
      profile,
      usePersonalization,
      documentContextPrompt: docContext || undefined,
      onAddMessage: addMessage,
      onUpdateMessage: updateMessage,
      onAwardXP
    });
  }, [inputText, selectedImage, attachedPdf, isLoading, addMessage, notebookLM.documents, notebookLM.activeDocIds, handleSendAI, messages, profile, usePersonalization, updateMessage, onAwardXP, setInputText, setSelectedImage, setAttachedPdf]);

  const handleClearError = useCallback(() => {
    setErrorMessage(null);
  }, [setErrorMessage]);

  const handleCopyText = useCallback((text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    if (onAddNotification) {
      onAddNotification("Copied", "Text copied to clipboard.", "info");
    }
  }, [onAddNotification]);

  const handleSelectSuggestion = useCallback((text: string) => {
    setInputText(text);
  }, [setInputText]);

  const handleQuickAction = useCallback((actionPrompt: string) => {
    setInputText(actionPrompt);
  }, [setInputText]);

  const handleJumpToCitation = useCallback((docName: string, pageNumber: number, snippet?: string) => {
    notebookLM.jumpToCitation(docName, pageNumber, snippet);
    setShowNotebookLMStudio(true);
    setNotebookViewMode("viewer");
  }, [notebookLM]);

  const handleRequestVideoLessonCallback = useCallback((msgId: string, topicText: string) => {
    onRequestVideoLesson(msgId, topicText, addMessage);
  }, [onRequestVideoLesson, addMessage]);

  const handleSubmitVideoSettingsCallback = useCallback((forMsgId: string, settings: any) => {
    onSubmitVideoSettings(forMsgId, settings, messages, updateMessage, addMessage);
  }, [onSubmitVideoSettings, messages, updateMessage, addMessage]);

  const handleCancelVideoLectureCallback = useCallback((jobId: string, msgId: string) => {
    onCancelVideoLecture(jobId, msgId, updateMessage);
  }, [onCancelVideoLecture, updateMessage]);

  const handleSaveQuizToWorkspace = useCallback((quiz: any) => {
    if (!activeWorkspace) return;
    const updated = workspaces.map((w) => {
      if (w.id === activeWorkspace.id) {
        return {
          ...w,
          quizzes: [
            { id: quiz.id || `quiz-${Date.now()}`, title: quiz.title || "Interactive Quiz", questionCount: quiz.questions?.length || 0 },
            ...(w.quizzes || [])
          ]
        };
      }
      return w;
    });
    setWorkspaces(updated);
    localStorage.setItem("studymate_workspaces_data", JSON.stringify(updated));
    if (onAddNotification) {
      onAddNotification("Quiz Saved", `Saved "${quiz.title}" to ${activeWorkspace.name}`, "success");
    }
  }, [activeWorkspace, workspaces, onAddNotification]);

  const handleSaveFlashcardsToWorkspace = useCallback((deck: any) => {
    if (!activeWorkspace) return;
    const updated = workspaces.map((w) => {
      if (w.id === activeWorkspace.id) {
        return {
          ...w,
          flashcards: [
            { id: deck.id || `deck-${Date.now()}`, title: deck.title || "Flashcards Deck", cardCount: deck.cards?.length || 0 },
            ...(w.flashcards || [])
          ]
        };
      }
      return w;
    });
    setWorkspaces(updated);
    localStorage.setItem("studymate_workspaces_data", JSON.stringify(updated));
    if (onAddNotification) {
      onAddNotification("Deck Saved", `Saved "${deck.title}" to ${activeWorkspace.name}`, "success");
    }
  }, [activeWorkspace, workspaces, onAddNotification]);

  const dynamicSuggestions = useMemo(() => getDynamicSuggestions(), [getDynamicSuggestions]);

  const handleCropDone = (croppedDataUrl: string) => {
    solveScannedQuestion(croppedDataUrl, profile, onAwardXP, addMessage);
  };

  return (
    <AIErrorBoundary onReset={() => { if (onAddNotification) onAddNotification("AI Workspace Recovered", "Your workspace was restored safely.", "info"); }}>
      <div className={`flex flex-col flex-1 min-h-0 w-full bg-white/80 dark:bg-[#0c1326]/75 backdrop-blur-3xl rounded-[32px] overflow-hidden border border-white/60 dark:border-white/12 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.65)] relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 dark:before:via-white/20 before:to-transparent ${
        isFullScreen ? "fixed inset-0 z-50 rounded-none border-none h-dvh w-screen" : "h-full"
      }`}>
        {/* Fixed Header */}
        <ChatHeader
          profile={profile}
          usePersonalization={usePersonalization}
          setUsePersonalization={setUsePersonalization}
          isFullScreen={isFullScreen}
          onToggleFullScreen={onToggleFullScreen}
          activeSession={activeSession}
          totalSessionsCount={sessions?.length || 1}
          onOpenClearConfirm={() => setShowClearConfirm(true)}
          onOpenSessionsMenu={() => setShowSessionsMenu(true)}
          onOpenWorkspacePanel={() => setShowWorkspacePanel(true)}
          onCreateNewChat={() => createNewSession()}
          onDeleteCurrentChat={() => setShowClearConfirm(true)}
          onOpenLiveVoiceTutor={() => setShowLiveVoiceTutor(true)}
          onOpenNotebookLMStudio={() => setShowNotebookLMStudio(true)}
          onOpenImageGenerator={() => setShowImageGeneratorModal(true)}
          activeDocumentCount={notebookLM?.activeDocIds?.length || 0}
          showSettingsModal={showSettingsModal}
          setShowSettingsModal={setShowSettingsModal}
        />

        {/* Continue Studying Smart Suggestion Banner */}
        {showContinueBanner && (
          <div className="mx-3 md:mx-5 my-2 p-2.5 bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-pink-600/10 border border-purple-500/30 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center space-x-2 truncate pr-2">
              <div className="p-1.5 bg-purple-600 text-white rounded-xl shrink-0">
                <RotateCcw className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <span className="text-purple-600 dark:text-purple-300 font-black">Continue studying: </span>
                <span>{activeSession?.title || "Electrostatics & Coulomb's Law"}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowContinueBanner(false);
                  scrollToBottom();
                  if (onAddNotification) onAddNotification("Context Restored", "Previous study session context restored.", "info");
                }}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[11px] font-extrabold transition cursor-pointer shadow-xs active:scale-95"
              >
                Restore Context
              </button>
              <button
                type="button"
                onClick={() => setShowContinueBanner(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Messages Area */}
        <MessageList
          scrollRef={scrollRef}
          messages={messages}
          isLoading={isLoading}
          isWebSearching={isWebSearching}
          isGeneratingImage={isGeneratingImage}
          errorMessage={errorMessage}
          errorCode={errorCode}
          onClearError={handleClearError}
          onRetryRequest={handleRetry}
          onCancelRequest={handleCancelRequest}
          onCopyText={handleCopyText}
          onSpeakText={speakText}
          speakingMsgId={speakingMsgId}
          suggestions={dynamicSuggestions}
          onSelectSuggestion={handleSelectSuggestion}
          onQuickAction={handleQuickAction}
          onJumpToCitation={handleJumpToCitation}
          onRequestVideoLesson={handleRequestVideoLessonCallback}
          onSubmitVideoSettings={handleSubmitVideoSettingsCallback}
          onCancelVideoLecture={handleCancelVideoLectureCallback}
          onSaveQuizToWorkspace={handleSaveQuizToWorkspace}
          onSaveFlashcardsToWorkspace={handleSaveFlashcardsToWorkspace}
          onOpenSettings={() => setShowSettingsModal(true)}
        />

        {/* Attachment Banners */}
        <ImageUploader
          selectedImage={selectedImage}
          onRemoveImage={() => setSelectedImage(null)}
          fileInputRef={fileInputRef}
          onImageChange={(e) => handleImageSelect(
            e,
            (warning) => {
              if (warning && onAddNotification) {
                onAddNotification("Image Quality Warning", warning, "info");
              }
            },
            (cropSrc) => setCropSourceImage(cropSrc),
            (err) => setErrorMessage(err)
          )}
        />

        <PDFUploader
          attachedPdf={attachedPdf}
          onRemovePdf={() => setAttachedPdf(null)}
          pdfFileInputRef={pdfFileInputRef}
          onPdfFileSelect={(e) => {
            handlePdfFileSelect(e, onAddNotification);
            if (e.target.files) {
              notebookLM.handleUploadFiles(e.target.files, (msg) => {
                if (onAddNotification) onAddNotification("Document Processed", msg, "success");
              });
            }
          }}
          showDriveModal={showDriveModal}
          setShowDriveModal={setShowDriveModal}
          driveUrlInput={driveUrlInput}
          setDriveUrlInput={setDriveUrlInput}
          driveError={driveError}
          setDriveError={setDriveError}
          onImportDriveUrl={() => handleImportDriveUrl(onAddNotification)}
          onSelectDriveSample={(name, size) => handleSelectDriveSample(name, size, onAddNotification)}
          profile={profile}
        />

        {/* OCR / Camera Overlays */}
        <OCRUploader
          cameraActive={cameraActive}
          stopCamera={stopCamera}
          videoRef={videoRef}
          capturePhoto={() => capturePhoto(() => fileInputRef.current?.click(), onAddNotification)}
          activeSource={activeSource}
          setActiveSource={setActiveSource}
          cropSourceImage={cropSourceImage}
          setCropSourceImage={setCropSourceImage}
          selectedPdf={selectedPdf}
          setSelectedPdf={setSelectedPdf}
          rotation={rotation}
          rotateClockwise={rotateClockwise}
          cropStageRef={cropStageRef}
          cropBox={cropBox}
          zoom={zoom}
          setZoom={setZoom}
          pan={pan}
          undoHistory={undoHistory}
          handleCropDragStart={handleCropDragStart}
          handleCropDragMove={handleCropDragMove}
          handleCropDragEnd={handleCropDragEnd}
          handleResetCrop={handleResetCrop}
          handleUndoCrop={handleUndoCrop}
          executeCrop={executeCrop}
          ocrAction={ocrAction}
          setOcrAction={setOcrAction}
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
          isOcrProcessing={isOcrProcessing}
          ocrError={ocrError}
          scannedSolution={scannedSolution}
          setScannedSolution={setScannedSolution}
          qualityWarning={qualityWarning}
          onExecuteHomeworkScan={executeHomeworkScan}
          onSendResultToChat={(output) => {
            const resultMsg: ChatMessage = {
              id: `msg-hwscanner-${Date.now()}`,
              role: "model",
              text: output,
              timestamp: new Date()
            };
            addMessage(resultMsg);
            if (onAddNotification) {
              onAddNotification("Homework Result Sent", "Homework scanner result added to AI Chat session.", "info");
            }
          }}
          onStartCamera={() => startCamera(() => fileInputRef.current?.click(), setErrorMessage)}
          fileInputRef={fileInputRef}
          pdfFileInputRef={pdfFileInputRef}
        />

        {/* Fixed Prompt Input Dock */}
        <PromptInput
          inputText={inputText}
          setInputText={setInputText}
          isLoading={isLoading}
          selectedImage={selectedImage}
          attachedPdf={attachedPdf}
          showPlusMenu={showPlusMenu}
          setShowPlusMenu={setShowPlusMenu}
          fileInputRef={fileInputRef}
          pdfFileInputRef={pdfFileInputRef}
          onStartCamera={() => startCamera(() => fileInputRef.current?.click(), setErrorMessage)}
          onOpenDriveModal={() => setShowDriveModal(true)}
          onSend={handleSend}
          isListening={isListening}
          onToggleVoice={() => toggleVoiceInput((transcript) => setInputText((prev) => prev ? `${prev} ${transcript}` : transcript), onAddNotification)}
          selectedModel={selectedModel}
          setSelectedModel={(m) => {
            setSelectedModel(m);
            localStorage.setItem("studymate_ai_model", m);
          }}
        />

        {/* Dedicated Workspace Panel Modal */}
        <WorkspacePanelModal
          isOpen={showWorkspacePanel}
          onClose={() => setShowWorkspacePanel(false)}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSwitchWorkspace={(wsId) => {
            setActiveWorkspaceId(wsId);
            localStorage.setItem("studymate_active_workspace_id", wsId);
            const target = workspaces.find((w) => w.id === wsId);
            if (target && onAddNotification) {
              onAddNotification("Workspace Switched", `Active: ${target.name}`, "info");
            }
          }}
          onCreateWorkspace={handleCreateWorkspace}
          onTogglePinWorkspace={handleTogglePinWorkspace}
          onClearWorkspaceMemory={handleClearWorkspaceMemory}
          onOpenPdfStudio={() => {
            setShowWorkspacePanel(false);
            setShowNotebookLMStudio(true);
          }}
          onOpenImageStudio={() => {
            setShowWorkspacePanel(false);
            setShowImageGeneratorModal(true);
          }}
          onOpenVoiceTutor={() => {
            setShowWorkspacePanel(false);
            setShowLiveVoiceTutor(true);
          }}
          onOpenAITutorMode={() => {
            setShowWorkspacePanel(false);
            setShowAITutorModal(true);
          }}
          onOpenMistakeNotebook={() => {
            setShowWorkspacePanel(false);
            setShowMistakeNotebookModal(true);
          }}
          onOpenStudyPlanner={() => {
            setShowWorkspacePanel(false);
            setShowStudyPlannerModal(true);
          }}
          onOpenFocusSession={() => {
            setShowWorkspacePanel(false);
            setShowFocusSessionModal(true);
          }}
          onOpenFormulaEngine={() => {
            setShowWorkspacePanel(false);
            setShowFormulaEngineModal(true);
          }}
          onOpenProgressDashboard={() => {
            setShowWorkspacePanel(false);
            setShowProgressDashboardModal(true);
          }}
          onTriggerStudyFlow={async (action) => {
            setShowWorkspacePanel(false);
            if (action === "summary") {
              const prompt = `Summarize the active workspace context: ${activeWorkspace?.name} (${activeWorkspace?.subject}). Generate a high-yield summary of key concepts, formulas, and definitions.`;
              setInputText(prompt);
              setTimeout(() => handleSend(), 50);
            } else if (action === "notes") {
              const prompt = `Generate comprehensive study notes for ${activeWorkspace?.name} with headings, key points, equations, and practice tips.`;
              setInputText(prompt);
              setTimeout(() => handleSend(), 50);
            } else if (action === "quiz") {
              const prompt = `Create a 5-question multiple choice quiz with answer explanations based on ${activeWorkspace?.name}.`;
              setInputText(prompt);
              setTimeout(() => handleSend(), 50);
            } else if (action === "flashcards") {
              const prompt = `Create 10 high-yield study flashcards for ${activeWorkspace?.name} in Front/Back Q&A format.`;
              setInputText(prompt);
              setTimeout(() => handleSend(), 50);
            }
          }}
          onSelectPrompt={(promptText) => {
            setShowWorkspacePanel(false);
            setInputText(promptText);
          }}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSwitchSession={switchSession}
          onCreateNewChat={() => createNewSession()}
          onOpenVideoGenerator={() => {
            if (messages.length > 0) {
              const lastAiMsg = [...messages].reverse().find(m => m.role === "model");
              if (lastAiMsg) {
                onRequestVideoLesson(lastAiMsg.id, lastAiMsg.text, addMessage);
              } else {
                setInputText("Create an interactive video lesson explaining Newton's laws.");
              }
            } else {
              setInputText("Create an interactive video lesson explaining Newton's laws.");
            }
          }}
          onOpenChatHistory={() => setShowSessionsMenu(true)}
          documents={notebookLM?.documents || []}
          onSelectDoc={(docId) => {
            notebookLM?.setSelectedDocId(docId);
            setShowNotebookLMStudio(true);
            setNotebookViewMode("viewer");
          }}
        />

        {/* AI Settings Modal */}
        <AISettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          selectedModel={selectedModel}
          setSelectedModel={(m) => {
            setSelectedModel(m);
            localStorage.setItem("studymate_ai_model", m);
          }}
          usePersonalization={usePersonalization}
          setUsePersonalization={setUsePersonalization}
          onExportData={() => {
            try {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `studymate_ai_export_${Date.now()}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
              if (onAddNotification) onAddNotification("Export Completed", "AI workspace data exported successfully.", "success");
            } catch {
              if (onAddNotification) onAddNotification("Export Failed", "Could not export data.", "alert");
            }
          }}
          onClearData={() => {
            handleDeleteCurrentChat();
            setShowSettingsModal(false);
          }}
        />

        {/* Modals & Drawers */}
        <ChatHistory
          showClearConfirm={showClearConfirm}
          onCloseClearConfirm={() => setShowClearConfirm(false)}
          onConfirmClear={handleDeleteCurrentChat}
          showSessionsMenu={showSessionsMenu}
          onCloseSessionsMenu={() => setShowSessionsMenu(false)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSwitchSession={switchSession}
          onCreateNewSession={createNewSession}
          onDeleteSession={(id) => {
            handleCancelRequest();
            deleteSession(id);
          }}
          onRenameSession={renameSession}
        />

        {/* Live Gemini AI Voice Tutor Modal */}
        {showLiveVoiceTutor && (
          <AIErrorBoundary onReset={() => setShowLiveVoiceTutor(false)}>
            <LiveVoiceTutorModal
              isOpen={showLiveVoiceTutor}
              onClose={() => setShowLiveVoiceTutor(false)}
              userName={profile?.nickname || profile?.fullName || "Student"}
            />
          </AIErrorBoundary>
        )}

        {/* NotebookLM AI PDF Studio & Document Viewer Modal */}
        {showNotebookLMStudio && (
          <AIErrorBoundary onReset={() => setShowNotebookLMStudio(false)}>
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[150] p-2 sm:p-4 md:p-6 flex flex-col">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl flex-1 flex flex-col overflow-hidden max-w-7xl w-full mx-auto shadow-2xl">
                {/* Modal Header */}
                <div className="p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="p-2 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl shadow-md">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-white">NotebookLM AI Workspace</h3>

                    {/* Tab Switcher */}
                    <div className="flex bg-slate-800 p-1 rounded-xl space-x-1 ml-2">
                      <button
                        type="button"
                        onClick={() => setNotebookViewMode("studio")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          notebookViewMode === "studio"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        AI Studio Tools
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotebookViewMode("viewer")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          notebookViewMode === "viewer"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Document Viewer
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNotebookLMStudio(false)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition cursor-pointer"
                    title="Close Studio"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-hidden p-2 sm:p-4">
                  {notebookViewMode === "studio" ? (
                    <NotebookLMStudio
                      documents={notebookLM?.documents || []}
                      activeDocIds={notebookLM?.activeDocIds || []}
                      selectedDocId={notebookLM?.selectedDocId || null}
                      onSelectDocForView={(docId) => {
                        notebookLM?.setSelectedDocId(docId);
                        setNotebookViewMode("viewer");
                      }}
                      onToggleDocActive={notebookLM?.toggleDocActive || (() => {})}
                      onSelectAllDocs={notebookLM?.selectAllDocs || (() => {})}
                      onDeselectAllDocs={notebookLM?.deselectAllDocs || (() => {})}
                      onDeleteDoc={notebookLM?.handleDeleteDoc || (() => {})}
                      onRenameDoc={notebookLM?.handleRenameDoc || (() => {})}
                      searchQuery={notebookLM?.searchQuery || ""}
                      setSearchQuery={notebookLM?.setSearchQuery || (() => {})}
                      searchResults={notebookLM?.searchResults || []}
                      isUploadingDoc={!!notebookLM?.isUploadingDoc}
                      uploadError={notebookLM?.uploadError || null}
                      onUploadFiles={(files) => notebookLM?.handleUploadFiles(files, (m) => onAddNotification?.("Document Uploaded", m, "success"))}
                      docInputRef={notebookLM?.docInputRef}
                      activeStudioTool={notebookLM?.activeStudioTool || null}
                      isGeneratingStudio={!!notebookLM?.isGeneratingStudio}
                      studioOutputText={notebookLM?.studioOutputText || null}
                      studioFlashcards={notebookLM?.studioFlashcards || []}
                      studioQuiz={notebookLM?.studioQuiz || []}
                      studioMindMap={notebookLM?.studioMindMap || null}
                      onExecuteStudioTool={notebookLM?.executeStudioTool || (() => {})}
                      onJumpToCitation={(docName, pageNumber, snippet) => {
                        notebookLM?.jumpToCitation(docName, pageNumber, snippet);
                        setNotebookViewMode("viewer");
                      }}
                      onSendToChat={(text) => {
                        setInputText(text);
                        setShowNotebookLMStudio(false);
                      }}
                    />
                  ) : (
                    <NotebookDocumentViewer
                      document={notebookLM?.selectedDocument || null}
                      currentPage={notebookLM?.viewPageNumber || 1}
                      onPageChange={notebookLM?.setViewPageNumber || (() => {})}
                      highlightTerm={notebookLM?.highlightTerm || null}
                    />
                  )}
                </div>
              </div>
            </div>
          </AIErrorBoundary>
        )}

        {/* AI Image Generator Modal */}
        {showImageGeneratorModal && (
          <AIErrorBoundary onReset={() => setShowImageGeneratorModal(false)}>
            <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 md:p-6 flex items-center justify-center animate-in fade-in duration-200">
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-y-auto shadow-2xl relative p-2 sm:p-4">
                <ImageGenerator 
                  onClose={() => setShowImageGeneratorModal(false)} 
                  onAwardXP={onAwardXP}
                  onAddNotification={onAddNotification}
                  profile={profile}
                />
              </div>
            </div>
          </AIErrorBoundary>
        )}

        {/* AI Tutor Mode Modal */}
        <AITutorModeModal
          isOpen={showAITutorModal}
          onClose={() => setShowAITutorModal(false)}
          activeSubject={activeWorkspace?.subject || "Physics"}
          activeChapter={activeWorkspace?.chapter || "Electrostatics"}
          onStartTutorSession={(subject, chapter, level, goalPrompt) => {
            setInputText(goalPrompt);
            setTimeout(() => handleSend(), 50);
          }}
        />

        {/* Mistake Notebook Modal */}
        <MistakeNotebookModal
          isOpen={showMistakeNotebookModal}
          onClose={() => setShowMistakeNotebookModal(false)}
          onTestMistake={(mistake) => {
            const prompt = `[RE-TEST MISTAKE FROM NOTEBOOK]
Subject: ${mistake.subject} (${mistake.chapter})
Concept: ${mistake.concept}
Question: ${mistake.question}
My Previous Wrong Answer: ${mistake.wrongAnswer}

Please act as my AI Tutor and walk me through this concept step by step, then give me a similar practice problem to solve.`;
            setInputText(prompt);
            setTimeout(() => handleSend(), 50);
          }}
        />

        {/* Study Planner Modal */}
        <StudyPlannerModal
          isOpen={showStudyPlannerModal}
          onClose={() => setShowStudyPlannerModal(false)}
          onApplyPlanPrompt={(promptText) => {
            setInputText(promptText);
            setTimeout(() => handleSend(), 50);
          }}
        />

        {/* Focus Session Modal */}
        <FocusSessionModal
          isOpen={showFocusSessionModal}
          onClose={() => setShowFocusSessionModal(false)}
          activeSubject={activeWorkspace?.subject || "Physics"}
          activeChapter={activeWorkspace?.chapter || "Electrostatics"}
          onCompleteFocusSession={(subj, chap, mins) => {
            if (onAddNotification) {
              onAddNotification("Focus Session Completed", `Completed ${mins} minutes of focused study on ${subj}!`, "success");
            }
            if (onAwardXP) onAwardXP(mins * 5, "Focus Study Session Completed");
          }}
        />

        {/* Formula & Concept Engine Modal */}
        <FormulaConceptEngineModal
          isOpen={showFormulaEngineModal}
          onClose={() => setShowFormulaEngineModal(false)}
          activeSubject={activeWorkspace?.subject || "Physics"}
          activeChapter={activeWorkspace?.chapter || "Electrostatics"}
          onSendFormulaPrompt={(promptText) => {
            setInputText(promptText);
            setTimeout(() => handleSend(), 50);
          }}
        />

        {/* Progress Dashboard Modal */}
        <ProgressDashboardModal
          isOpen={showProgressDashboardModal}
          onClose={() => setShowProgressDashboardModal(false)}
          activeSubject={activeWorkspace?.subject || "Physics"}
          onOpenWeakTopics={() => {
            setShowProgressDashboardModal(false);
            setShowMistakeNotebookModal(true);
          }}
          onOpenStudyPlanner={() => {
            setShowProgressDashboardModal(false);
            setShowStudyPlannerModal(true);
          }}
        />

        {/* Interactive Whiteboard Modal */}
        <InteractiveWhiteboardModal
          isOpen={showWhiteboardModal}
          onClose={() => setShowWhiteboardModal(false)}
          activeSubject={activeWorkspace?.subject || "Physics"}
          activeChapter={activeWorkspace?.chapter || "Electrostatics"}
          onSaveWhiteboardToNotes={(title, url) => {
            if (onAddNotification) {
              onAddNotification("Saved to Notes", `Whiteboard drawing saved as note "${title}".`, "success");
            }
          }}
        />

        {/* Live Step-by-Step Problem Solver Modal */}
        <LiveProblemSolverModal
          isOpen={showProblemSolverModal}
          onClose={() => setShowProblemSolverModal(false)}
          activeSubject={activeWorkspace?.subject || "Physics"}
          activeChapter={activeWorkspace?.chapter || "Electrostatics"}
          onSendSolverPrompt={(promptText) => {
            setInputText(promptText);
            setTimeout(() => handleSend(), 50);
          }}
        />

        {/* Collaborative Study Room Modal */}
        <CollaborativeWorkspaceModal
          isOpen={showCollabWorkspaceModal}
          onClose={() => setShowCollabWorkspaceModal(false)}
          activeWorkspaceName={activeWorkspace?.name || "Physics - Class 12"}
        />

        {/* AI Live Lecture Mode Modal */}
        <LiveLectureModeModal
          isOpen={showLiveLectureModal}
          onClose={() => setShowLiveLectureModal(false)}
          activeSubject={activeWorkspace?.subject || "Physics"}
          activeChapter={activeWorkspace?.chapter || "Electrostatics"}
          onSendLecturePrompt={(promptText) => {
            setInputText(promptText);
            setTimeout(() => handleSend(), 50);
          }}
        />

        {/* Universal AI Search Modal */}
        <UniversalAISearchModal
          isOpen={showUniversalSearchModal}
          onClose={() => setShowUniversalSearchModal(false)}
          onSelectResult={(result) => {
            if (onAddNotification) {
              onAddNotification("Loaded Search Result", `Opened ${result.title} from search.`, "info");
            }
          }}
        />

        {/* Knowledge Graph Modal */}
        <KnowledgeGraphModal
          isOpen={showKnowledgeGraphModal}
          onClose={() => setShowKnowledgeGraphModal(false)}
          activeSubject={activeWorkspace?.subject || "Physics"}
          onSelectConceptNode={(nodeLabel) => {
            setInputText(`Explain concept: ${nodeLabel} in detail with formulas and key practice questions.`);
            setTimeout(() => handleSend(), 50);
          }}
        />

        {/* Specialized AI Agents Mesh Modal */}
        <SpecializedAIAgentsModal
          isOpen={showSpecializedAgentsModal}
          onClose={() => setShowSpecializedAgentsModal(false)}
          onTriggerAgentPipeline={(agentName, promptText) => {
            setInputText(promptText);
            setTimeout(() => handleSend(), 50);
          }}
        />

        {/* Deep Research Studio Modal */}
        <ResearchModeModal
          isOpen={showResearchModeModal}
          onClose={() => setShowResearchModeModal(false)}
          activeSubject={activeWorkspace?.subject || "Physics"}
          onSendResearchPrompt={(promptText) => {
            setInputText(promptText);
            setTimeout(() => handleSend(), 50);
          }}
        />

        {/* Exam Intelligence & Readiness Modal */}
        <ExamIntelligenceModal
          isOpen={showExamIntelligenceModal}
          onClose={() => setShowExamIntelligenceModal(false)}
          activeSubject={activeWorkspace?.subject || "Physics"}
        />

        {/* Adaptive Revision Engine Modal */}
        <AdaptiveRevisionEngineModal
          isOpen={showAdaptiveRevisionModal}
          onClose={() => setShowAdaptiveRevisionModal(false)}
          onStartRevisionSession={(topic) => {
            setInputText(`Start adaptive revision drill for weak topic: ${topic}`);
            setTimeout(() => handleSend(), 50);
          }}
        />

        {/* Advanced Export Center Modal */}
        <AdvancedExportModal
          isOpen={showAdvancedExportModal}
          onClose={() => setShowAdvancedExportModal(false)}
          activeWorkspaceName={activeWorkspace?.name || "Physics - Class 12"}
        />

        {/* Offline & Cloud Sync Security Modal */}
        <CloudSecuritySyncModal
          isOpen={showCloudSyncModal}
          onClose={() => setShowCloudSyncModal(false)}
        />
      </div>
    </AIErrorBoundary>
  );
}

export default StudyMateAI;
