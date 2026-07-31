import { useState, useRef } from "react";
import { checkImageQuality, compressImage, preprocessImageForOCRAndVision } from "../utils/imageOptimizer";

export interface AttachedPdf {
  name: string;
  url?: string;
  source: "Google Drive" | "Local File";
  size?: string;
}

export function useAttachments() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attachedPdf, setAttachedPdf] = useState<AttachedPdf | null>(null);

  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [driveError, setDriveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportDriveUrl = (
    onNotification?: (title: string, text: string, type: "success" | "info" | "alert") => void
  ) => {
    if (!driveUrlInput.trim()) {
      setDriveError("Please enter a Google Drive link.");
      return;
    }
    let fileName = "Google_Drive_Document.pdf";
    const match = driveUrlInput.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      fileName = `Drive_Doc_${match[1].slice(0, 8)}.pdf`;
    }
    setAttachedPdf({
      name: fileName,
      url: driveUrlInput.trim(),
      source: "Google Drive",
      size: "Drive Document"
    });
    setShowDriveModal(false);
    setDriveUrlInput("");
    setDriveError(null);
    if (onNotification) {
      onNotification("Google Drive PDF Attached", `Attached ${fileName} for AI analysis.`, "success");
    }
  };

  const handleSelectDriveSample = (
    name: string,
    size: string,
    onNotification?: (title: string, text: string, type: "success" | "info" | "alert") => void
  ) => {
    setAttachedPdf({
      name,
      url: `https://drive.google.com/file/d/sample_${Date.now()}/view`,
      source: "Google Drive",
      size
    });
    setShowDriveModal(false);
    if (onNotification) {
      onNotification("Google Drive PDF Attached", `Attached ${name} for AI analysis.`, "success");
    }
  };

  const handlePdfFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    onNotification?: (title: string, text: string, type: "success" | "info" | "alert") => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;
      setAttachedPdf({
        name: file.name,
        source: "Local File",
        size: sizeStr
      });
      if (onNotification) {
        onNotification("PDF Attached", `Attached ${file.name} (${sizeStr})`, "success");
      }
    }
  };

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    onWarning: (msg: string | null) => void,
    onCropSource: (src: string) => void,
    onError: (err: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 16 * 1024 * 1024) {
        onError("Image is too large. Please select an image smaller than 16MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawSrc = reader.result as string;
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const quality = checkImageQuality(canvas);
            if (quality.warning) {
              onWarning(quality.warning);
            } else {
              onWarning(null);
            }
          }
          
          try {
            const preprocessed = await preprocessImageForOCRAndVision(rawSrc, {
              autoRotate: true,
              deskew: true,
              denoise: true,
              improveContrast: true,
              resizeIntelligently: true,
              jpegQuality: 0.88
            });
            onCropSource(preprocessed.processedDataUrl);
          } catch (err) {
            const compressed = await compressImage(rawSrc, 1024, 0.78);
            onCropSource(compressed);
          }
          onError(null);
        };
        img.src = rawSrc;
      };
      reader.readAsDataURL(file);
    }
  };

  return {
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
    handleImageSelect,
  };
}
