import React, { useState, useRef, useEffect, useCallback } from "react";
import { UserProfile } from "../types";
import { StudyMateAIProps, ChatMessage } from "./studymate-ai/types";

// Hooks
import { useChat } from "../hooks/useChat";
import { useVoice } from "../hooks/useVoice";
import { useOCR } from "../hooks/useOCR";
import { useAttachments } from "../hooks/useAttachments";
import { useAI } from "../hooks/useAI";

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

export function StudyMateAI({
  profile,
  onAwardXP,
  onAddNotification,
  isFullScreen,
  onToggleFullScreen
}: StudyMateAIProps) {
  const [usePersonalization, setUsePersonalization] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSessionsMenu, setShowSessionsMenu] = useState(false);
  const [showLiveVoiceTutor, setShowLiveVoiceTutor] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    errorMessage,
    setErrorMessage,
    handleCancelRequest,
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

    handleSendAI({
      textToSend,
      userMessage,
      messages,
      profile,
      usePersonalization,
      onAddMessage: addMessage,
      onAwardXP
    });
  };

  const handleCropDone = (croppedDataUrl: string) => {
    solveScannedQuestion(croppedDataUrl, profile, onAwardXP, addMessage);
  };

  return (
    <AIErrorBoundary onReset={deleteActiveChat}>
      <div className={`flex flex-col flex-1 min-h-0 w-full bg-slate-50/50 dark:bg-slate-950/50 rounded-3xl overflow-hidden border border-white/20 dark:border-slate-800/80 shadow-2xl relative ${
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
          totalSessionsCount={sessions.length}
          onOpenClearConfirm={() => setShowClearConfirm(true)}
          onOpenSessionsMenu={() => setShowSessionsMenu(true)}
          onCreateNewChat={() => createNewSession()}
          onDeleteCurrentChat={() => setShowClearConfirm(true)}
          onOpenLiveVoiceTutor={() => setShowLiveVoiceTutor(true)}
        />

        {/* Scrollable Messages Area */}
        <MessageList
          scrollRef={scrollRef}
          messages={messages}
          isLoading={isLoading}
          isWebSearching={isWebSearching}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
          onCancelRequest={handleCancelRequest}
          onCopyText={(text) => {
            navigator.clipboard.writeText(text);
            if (onAddNotification) {
              onAddNotification("Copied", "Text copied to clipboard.", "info");
            }
          }}
          onSpeakText={speakText}
          speakingMsgId={speakingMsgId}
          suggestions={getDynamicSuggestions()}
          onSelectSuggestion={(text) => setInputText(text)}
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
          onPdfFileSelect={(e) => handlePdfFileSelect(e, onAddNotification)}
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
        <LiveVoiceTutorModal
          isOpen={showLiveVoiceTutor}
          onClose={() => setShowLiveVoiceTutor(false)}
          userName={profile.nickname || profile.fullName || "Student"}
        />
      </div>
    </AIErrorBoundary>
  );
}

export default StudyMateAI;
