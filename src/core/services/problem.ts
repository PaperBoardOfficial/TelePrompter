import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { store } from "@/core/store";

export interface ResponseData {
  thoughts?: string[];
  old_code?: string;
  new_code?: string;
  code?: string;
  time_complexity?: string;
  space_complexity?: string;
  response?: string;
  raw_response?: string;
  extracted_text?: string;
  language?: string;
  [key: string]: any;
}

export class ProblemService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  constructor() {
    this.initializeClient();
  }

  /**
   * Initializes the Google Generative AI client
   */
  private initializeClient(): void {
    try {
      const apiKey = store.get("apiKey");
      if (!apiKey) {
        console.warn(
          "API key not set. Client will be initialized when key is provided."
        );
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      console.log("Gemini client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Gemini client:", error);
      this.genAI = null;
      this.model = null;
    }
  }

  /**
   * Gets the active template from store
   */
  private getActiveTemplate() {
    const activeTemplate = store.get("activeTemplate");
    const templates = store.get("promptTemplates");

    // If no active template is set or the active template doesn't exist
    if (!activeTemplate || !templates || !templates[activeTemplate]) {
      // Find the first available template
      if (templates) {
        const firstTemplateKey = Object.keys(templates)[0];
        if (firstTemplateKey && templates[firstTemplateKey]) {
          // Use the first available template
          return templates[firstTemplateKey];
        }
      }

      // If no templates exist, return a basic fallback template
      return {
        name: "Basic Template",
        initialPrompt:
          "Analyze the image and extract all relevant information.",
        followUpPrompt: "Review the previous solution and improve it.",
      };
    }

    if (!templates || !activeTemplate) {
      return {
        name: "Basic Template",
        initialPrompt:
          "Analyze the image and extract all relevant information.",
        followUpPrompt: "Review the previous solution and improve it.",
      };
    }

    return templates[activeTemplate];
  }

  /**
   * Process image with initial prompt - used for both extraction and initial solution
   */
  public async processWithInitialPrompt(
    imageDataList: string[]
  ): Promise<ResponseData> {
    try {
      // Get the active template's initial prompt
      const template = this.getActiveTemplate();
      const initialPrompt = template.initialPrompt;

      // Prepare the image contents for the message
      const imageParts = imageDataList.map((imageData) => {
        return {
          inlineData: {
            data: imageData,
            mimeType: "image/jpeg",
          },
        };
      });

      // Generate the content using the user's initial prompt
      if (!this.model) {
        throw new Error("Model not initialized. Please set your API key.");
      }
      const result = await this.model.generateContent([
        initialPrompt,
        ...imageParts,
      ]);
      const response = result.response;
      const text = response.text();

      // Try to parse as JSON first, then fall back to text
      try {
        return JSON.parse(text) as ResponseData;
      } catch {
        // If not JSON, return as text
        return {
          extracted_text: text,
        };
      }
    } catch (error) {
      console.error("Error processing with initial prompt:", error);
      throw error;
    }
  }

  /**
   * Process with follow-up prompt
   */
  public async processWithFollowUpPrompt(
    imageDataList: string[],
    previousResult: any
  ): Promise<ResponseData> {
    try {
      // Get the active template
      const template = this.getActiveTemplate();

      // Get the follow-up prompt
      let prompt = template.followUpPrompt;

      // Add the previous response as context
      prompt += `\n\nPrevious response:\n${JSON.stringify(
        previousResult,
        null,
        2
      )}`;

      // Prepare the image contents for the message
      const imageParts = imageDataList.map((imageData) => {
        return {
          inlineData: {
            data: imageData,
            mimeType: "image/jpeg",
          },
        };
      });

      // Generate the content
      if (!this.model) {
        throw new Error("Model not initialized. Please set your API key.");
      }
      const result = await this.model.generateContent([prompt, ...imageParts]);
      const response = result.response;
      const text = response.text();

      // Try to parse as JSON first, then fall back to text
      try {
        return JSON.parse(text) as ResponseData;
      } catch {
        // If not JSON, return as text
        return {
          response: text,
          raw_response: text,
        };
      }
    } catch (error) {
      console.error("Error with follow-up analysis:", error);
      throw error;
    }
  }
}
