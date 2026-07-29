import React, { useState, useRef, useEffect, useCallback } from "react";
import { UserProfile } from "../types";
import { StudyMateAIProps, ChatMessage } from "./studymate-ai/types";
import { Sparkles, X, BookOpen, Brain, Layers } from "lucide-react";

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

export function StudyMateAI({
  profile,
  onAwardXP,
  onAddNotification,
  isFullScreen,
  onToggleFullScreen
}: StudyMateAIProps) {
  const [usePersonalization, setUsePersonalization] = useState(true);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("studymate_ai_model") || "gemini-2.5-flash");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSessionsMenu, setShowSessionsMenu] = useState(false);
  const [showLiveVoiceTutor, setShowLiveVoiceTutor] = useState(false);
  
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
    setErrorMessage,
    handleCancelRequest,
    handleRetry,
    solveScannedQuestion,
    handleSendAI
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

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedImage && !attachedPdf) || isLoading) return;

    const userMsgText = inputText.trim();
    setInputText("");

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      text: userMsgText,
      image: selectedImage || undefined,
      pdf: attachedPdf || undefined,
      timestamp: new Date()
    };

    addMessage(userMessage);

    const textToSend = userMsgText;
    setSelectedImage(null);
    setAttachedPdf(null);

    const docContext = buildDocumentContextPrompt(notebookLM.documents, notebookLM.activeDocIds);

    handleSendAI({
      textToSend,
      userMessage,
      messages,
      profile,
      usePersonalization,
      documentContextPrompt: docContext || undefined,
      onAddMessage: addMessage,
      onAwardXP
    });
  };

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
          onCreateNewChat={() => createNewSession()}
          onDeleteCurrentChat={() => setShowClearConfirm(true)}
          onOpenLiveVoiceTutor={() => setShowLiveVoiceTutor(true)}
          onOpenNotebookLMStudio={() => setShowNotebookLMStudio(true)}
          onOpenImageGenerator={() => setShowImageGeneratorModal(true)}
          activeDocumentCount={notebookLM?.activeDocIds?.length || 0}
        />

        {/* Scrollable Messages Area */}
        <MessageList
          scrollRef={scrollRef}
          messages={messages}
          isLoading={isLoading}
          isWebSearching={isWebSearching}
          isGeneratingImage={isGeneratingImage}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
          onRetryRequest={handleRetry}
          onCancelRequest={handleCancelRequest}
          onCopyText={(text) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).catch(() => {});
            }
            if (onAddNotification) {
              onAddNotification("Copied", "Text copied to clipboard.", "info");
            }
          }}
          onSpeakText={speakText}
          speakingMsgId={speakingMsgId}
          suggestions={getDynamicSuggestions()}
          onSelectSuggestion={(text) => setInputText(text)}
          onJumpToCitation={(docName, pageNumber, snippet) => {
            notebookLM.jumpToCitation(docName, pageNumber, snippet);
            setShowNotebookLMStudio(true);
            setNotebookViewMode("viewer");
          }}
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
      </div>
    </AIErrorBoundary>
  );
}

export default StudyMateAI;
