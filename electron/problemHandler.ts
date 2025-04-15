// Import necessary modules
import { GoogleGenerativeAI } from "@google/generative-ai"
import { store } from "./store"

// Define interfaces for response structures
interface ResponseData {
  thoughts?: string[]
  old_code?: string
  new_code?: string
  code?: string
  time_complexity?: string
  space_complexity?: string
  response?: string
  raw_response?: string
  extracted_text?: string
  language?: string
  [key: string]: any
}

// Initialize the Google Generative AI client
function getGeminiClient() {
  const apiKey = store.get('apiKey')
  if (!apiKey) {
    throw new Error("API key not set. Please add your API key in settings.")
  }
  return new GoogleGenerativeAI(apiKey)
}

// Get the active template
function getActiveTemplate() {
  const activeTemplate = store.get('activeTemplate');
  const templates = store.get('promptTemplates');

  // If no active template is set or the active template doesn't exist
  if (!activeTemplate || !templates || !templates[activeTemplate]) {
    // Find the first available template
    const firstTemplateKey = templates ? Object.keys(templates)[0] : null;

    if (firstTemplateKey && templates[firstTemplateKey]) {
      // Use the first available template
      return templates[firstTemplateKey];
    }

    // If no templates exist, return a basic fallback template
    return {
      name: "Basic Template",
      initialPrompt: "Analyze the image and extract all relevant information.",
      followUpPrompt: "Review the previous solution and improve it."
    };
  }

  return templates[activeTemplate];
}

// Process image with initial prompt - used for both extraction and initial solution
export async function processWithInitialPrompt(imageDataList: string[]): Promise<ResponseData> {
  try {
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Get the active template's initial prompt
    const template = getActiveTemplate();
    const initialPrompt = template.initialPrompt;

    // Prepare the image contents for the message
    const imageParts = imageDataList.map((imageData) => {
      return {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg"
        }
      }
    })

    // Generate the content using the user's initial prompt
    const result = await model.generateContent([initialPrompt, ...imageParts])
    const response = result.response
    const text = response.text()

    // Try to parse as JSON first, then fall back to text
    try {
      return JSON.parse(text) as ResponseData
    } catch {
      // If not JSON, return as text
      return {
        extracted_text: text
      }
    }
  } catch (error) {
    console.error("Error processing with initial prompt:", error)
    throw error
  }
}

// Process with follow-up prompt
export async function processWithFollowUpPrompt(
  imageDataList: string[],
  previousResult: any
): Promise<ResponseData> {
  try {
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Get the active template
    const template = getActiveTemplate();

    // Get the follow-up prompt
    let prompt = template.followUpPrompt;

    // Add the previous response as context
    prompt += `\n\nPrevious response:\n${JSON.stringify(previousResult, null, 2)}`;

    // Prepare the image contents for the message
    const imageParts = imageDataList.map((imageData) => {
      return {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg"
        }
      }
    });

    // Generate the content
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    // Try to parse as JSON first, then fall back to text
    try {
      return JSON.parse(text) as ResponseData;
    } catch {
      // If not JSON, return as text
      return {
        response: text,
        raw_response: text
      };
    }
  } catch (error) {
    console.error("Error with follow-up analysis:", error);
    throw error;
  }
}
