// Import necessary modules
import { GoogleGenerativeAI } from "@google/generative-ai"

// Define interfaces for ProblemInfo and related structures

interface DebugSolutionResponse {
  thoughts: string[]
  old_code: string
  new_code: string
  time_complexity: string
  space_complexity: string
}

interface ProblemInfo {
  problem_statement?: string
  input_format?: {
    description?: string
    parameters?: Array<{
      name: string
      type: string
      subtype?: string
    }>
  }
  output_format?: {
    description?: string
    type?: string
    subtype?: string
  }
  constraints?: Array<{
    description: string
    parameter?: string
    range?: {
      min?: number
      max?: number
    }
  }>
  test_cases?: any // Adjust the type as needed
}

interface StoreSchema {
  openaiApiKey: string
  // add other store fields here
}

// Initialize the Google Generative AI client
function getGeminiClient() {
  const apiKey = "AIzaSyCUt56DxwJRCK8UmF6X5H0gEEkkOXRl_YQ"
  if (!apiKey) {
    throw new Error("Gemini API key not set")
  }
  return new GoogleGenerativeAI(apiKey)
}

// Define the extractProblemInfo function
export async function extractProblemInfo(
  imageDataList: string[]
): Promise<any> {
  try {
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Prepare the image contents for the message
    const imageParts = imageDataList.map((imageData) => {
      return {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg"
        }
      }
    })

    // Construct the messages to send to the model - keeping the same prompt
    const prompt = "Extract the following information from this coding problem image:\n" +
      "1. ENTIRE Problem statement (what needs to be solved)\n" +
      "2. Input/Output format\n" +
      "3. Constraints on the input\n" +
      "4. Example test cases\n" +
      "Format each test case exactly like this:\n" +
      "{'input': {'args': [nums, target]}, 'output': {'result': [0,1]}}\n" +
      "Note: test cases must have 'input.args' as an array of arguments in order,\n" +
      "'output.result' containing the expected return value.\n" +
      "Example for two_sum([2,7,11,15], 9) returning [0,1]:\n" +
      "{'input': {'args': [[2,7,11,15], 9]}, 'output': {'result': [0,1]}}\n"

    // Generate content with the same function schema structure as a prompt
    const functionSchema = JSON.stringify({
      name: "extract_problem_details",
      description: "Extract and structure the key components of a coding problem",
      parameters: {
        type: "object",
        properties: {
          problem_statement: {
            type: "string",
            description: "The ENTIRE main problem statement describing what needs to be solved"
          },
          input_format: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Description of the input format"
              },
              parameters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the parameter"
                    },
                    type: {
                      type: "string",
                      enum: [
                        "number",
                        "string",
                        "array",
                        "array2d",
                        "array3d",
                        "matrix",
                        "tree",
                        "graph"
                      ],
                      description: "Type of the parameter"
                    },
                    subtype: {
                      type: "string",
                      enum: ["integer", "float", "string", "char", "boolean"],
                      description: "For arrays, specifies the type of elements"
                    }
                  },
                  required: ["name", "type"]
                }
              }
            },
            required: ["description", "parameters"]
          },
          output_format: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Description of the expected output format"
              },
              type: {
                type: "string",
                enum: [
                  "number",
                  "string",
                  "array",
                  "array2d",
                  "array3d",
                  "matrix",
                  "boolean"
                ],
                description: "Type of the output"
              },
              subtype: {
                type: "string",
                enum: ["integer", "float", "string", "char", "boolean"],
                description: "For arrays, specifies the type of elements"
              }
            },
            required: ["description", "type"]
          },
          constraints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description: "Description of the constraint"
                },
                parameter: {
                  type: "string",
                  description: "The parameter this constraint applies to"
                },
                range: {
                  type: "object",
                  properties: {
                    min: { type: "number" },
                    max: { type: "number" }
                  }
                }
              },
              required: ["description"]
            }
          },
          test_cases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                input: {
                  type: "object",
                  properties: {
                    args: {
                      type: "array",
                      items: {
                        anyOf: [
                          { type: "integer" },
                          { type: "string" },
                          {
                            type: "array",
                            items: {
                              anyOf: [
                                { type: "integer" },
                                { type: "string" },
                                { type: "boolean" },
                                { type: "null" }
                              ]
                            }
                          },
                          { type: "object" },
                          { type: "boolean" },
                          { type: "null" }
                        ]
                      }
                    }
                  },
                  required: ["args"]
                },
                output: {
                  type: "object",
                  properties: {
                    result: {
                      anyOf: [
                        { type: "integer" },
                        { type: "string" },
                        {
                          type: "array",
                          items: {
                            anyOf: [
                              { type: "integer" },
                              { type: "string" },
                              { type: "boolean" },
                              { type: "null" }
                            ]
                          }
                        },
                        { type: "object" },
                        { type: "boolean" },
                        { type: "null" }
                      ]
                    }
                  },
                  required: ["result"]
                }
              },
              required: ["input", "output"]
            },
            minItems: 1
          }
        },
        required: ["problem_statement"]
      }
    })

    const fullPrompt = `${prompt}\n\nPlease format your response as a JSON object following this schema:\n${functionSchema}\n\nMake sure to return a valid JSON object that matches this schema exactly.`

    // Send the request to the model
    const result = await model.generateContent([fullPrompt, ...imageParts])
    const response = result.response
    const text = response.text()

    // Try to parse the JSON response
    try {
      return JSON.parse(text)
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError)
      // Try to extract JSON from the text response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
        text.match(/{[\s\S]*}/)

      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1])
      } else if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      throw new Error("Failed to parse Gemini response as JSON")
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error)
    throw error
  }
}

export async function generateSolutionResponses(
  problemInfo: ProblemInfo
): Promise<any> {
  try {
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Build the complete prompt with all problem information - keeping the same prompt
    const promptContent = `Given the following coding problem:

Problem Statement:
${problemInfo.problem_statement ?? "Problem statement not available"}

Input Format:
${problemInfo.input_format?.description ?? "Input format not available"}
Parameters:
${problemInfo.input_format?.parameters
        ?.map((p) => `- ${p.name}: ${p.type}${p.subtype ? ` of ${p.subtype}` : ""}`)
        .join("\n") ?? "No parameters available"
      }

Output Format:
${problemInfo.output_format?.description ?? "Output format not available"}
Returns: ${problemInfo.output_format?.type ?? "Type not specified"}${problemInfo.output_format?.subtype
        ? ` of ${problemInfo.output_format.subtype}`
        : ""
      }

Constraints:
${problemInfo.constraints
        ?.map((c) => {
          let constraintStr = `- ${c.description}`
          if (c.range) {
            constraintStr += ` (${c.parameter}: ${c.range.min} to ${c.range.max})`
          }
          return constraintStr
        })
        .join("\n") ?? "No constraints specified"
      }

Test Cases:
${JSON.stringify(problemInfo.test_cases ?? "No test cases available", null, 2)}

Generate a solution in this format:
{
  "thoughts": [
    "First thought showing recognition of the problem and core challenge",
    "Second thought naming specific algorithm/data structure being considered",
    "Third thought showing confidence in approach while acknowledging details needed"
  ],
  "code": "The Python solution with comments explaining the code",
  "time_complexity": "The time complexity in form O(_) because _",
  "space_complexity": "The space complexity in form O(_) because _"
}

Format Requirements:
1. Use actual line breaks in code field
2. Indent code properly with spaces
3. Include clear code comments
4. Response must be valid JSON
5. Return only the JSON object with no markdown or other formatting`

    // Generate the content
    const result = await model.generateContent(promptContent)
    const response = result.response
    const text = response.text()

    // Try to parse the JSON response
    try {
      return JSON.parse(text)
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError)
      // Try to extract JSON from the text response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
        text.match(/{[\s\S]*}/)

      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1])
      } else if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      throw new Error("Failed to parse Gemini response as JSON")
    }
  } catch (error: any) {
    console.error("Error details:", error)
    throw new Error(`Error generating solutions: ${error.message}`)
  }
}

export async function debugSolutionResponses(
  imageDataList: string[],
  problemInfo: ProblemInfo
): Promise<DebugSolutionResponse> {
  try {
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Process images for inclusion in prompt
    const imageParts = imageDataList.map((imageData) => {
      return {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg"
        }
      }
    })

    // Build the prompt with error handling - keeping the same prompt structure
    const problemStatement =
      problemInfo.problem_statement ?? "Problem statement not available"

    const inputFormatDescription =
      problemInfo.input_format?.description ??
      "Input format description not available"

    const inputParameters = problemInfo.input_format?.parameters
      ? problemInfo.input_format.parameters
        .map(
          (p) => `- ${p.name}: ${p.type}${p.subtype ? ` of ${p.subtype}` : ""}`
        )
        .join(" ")
      : "Input parameters not available"

    const outputFormatDescription =
      problemInfo.output_format?.description ??
      "Output format description not available"

    const returns = problemInfo.output_format?.type
      ? `Returns: ${problemInfo.output_format.type}${problemInfo.output_format.subtype
        ? ` of ${problemInfo.output_format.subtype}`
        : ""
      }`
      : "Returns: Output type not available"

    const constraints = problemInfo.constraints
      ? problemInfo.constraints
        .map((c) => {
          let constraintStr = `- ${c.description}`
          if (c.range) {
            constraintStr += ` (${c.parameter}: ${c.range.min} to ${c.range.max})`
          }
          return constraintStr
        })
        .join(" ")
      : "Constraints not available"

    let exampleTestCases = "Test cases not available"
    if (problemInfo.test_cases) {
      try {
        exampleTestCases = JSON.stringify(problemInfo.test_cases, null, 2)
      } catch {
        exampleTestCases = "Test cases not available"
      }
    }

    // Construct the debug prompt - keeping the same prompt
    const debugPrompt = `
Given the following coding problem and its visual representation:

Problem Statement:
${problemStatement}

Input Format:
${inputFormatDescription}
Parameters:
${inputParameters}

Output Format:
${outputFormatDescription}
${returns}

Constraints:
${constraints}

Example Test Cases:
${exampleTestCases}

First extract and analyze the code shown in the image. Then create an improved version while maintaining the same general approach and structure. The old code you save should ONLY be the exact code that you see on the screen, regardless of any optimizations or changes you make. Make all your changes in the new_code field. You should use the image that has the most recent, longest version of the code, making sure to combine multiple images if necessary.
Focus on keeping the solution syntactically similar but with optimizations and INLINE comments ONLY ON lines of code that were changed. Make sure there are no extra line breaks and all the code that is unchanged is in the same line as it was in the original code.

IMPORTANT FORMATTING NOTES:
1. Use actual line breaks (press enter for new lines) in both old_code and new_code
2. Maintain proper indentation with spaces in both code blocks
3. Add inline comments ONLY on changed lines in new_code
4. The entire response must be valid JSON that can be parsed

Return your response in this JSON format:
{
  "thoughts": [
    "First thought about the problem and code",
    "Second thought about specific improvements",
    "Third thought about the final solution"
  ],
  "old_code": "The exact code from the image",
  "new_code": "The improved code with inline comments on changed lines",
  "time_complexity": "O(_) because _",
  "space_complexity": "O(_) because _"
}`

    // Generate the content
    const result = await model.generateContent([debugPrompt, ...imageParts])
    const response = result.response
    const text = response.text()

    // Try to parse the JSON response
    try {
      return JSON.parse(text) as DebugSolutionResponse
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError)
      // Try to extract JSON from the text response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
        text.match(/{[\s\S]*}/)

      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]) as DebugSolutionResponse
      } else if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as DebugSolutionResponse
      }

      throw new Error("Failed to parse Gemini response as JSON")
    }
  } catch (error: any) {
    console.error("Error details:", error)
    throw new Error(`Error debugging solution: ${error.message}`)
  }
}
