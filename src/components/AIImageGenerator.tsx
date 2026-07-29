import React from "react";
import { ImageGenerator, ImageGeneratorProps } from "./ImageGenerator";

export interface AIImageGeneratorProps extends ImageGeneratorProps {}

export function AIImageGenerator(props: AIImageGeneratorProps) {
  return <ImageGenerator {...props} />;
}

export default AIImageGenerator;
