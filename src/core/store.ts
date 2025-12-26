import Store from "electron-store"
import { app } from 'electron'

interface StoreSchema {
  apiKey?: string;
  transparency?: number;
  promptTemplates?: {
    [key: string]: {
      name: string;
      initialPrompt: string;
      followUpPrompt: string;
    };
  };
  activeTemplate?: string;
}

const store = new Store<StoreSchema>({
  defaults: {
    transparency: 0.9,
    promptTemplates: {
      coding_task: {
        name: "Coding Task",
        initialPrompt: `Analyze the image of a coding problem and extract all relevant information.

Please identify:
- The main problem statement/task
- Input specifications and parameters
- Output specifications and return types
- Any constraints or limitations
- Example test cases

First, identify the most appropriate programming language based on the screenshot (syntax, variable naming conventions, etc.).

Then generate a solution in that identified language with this format:
{
  "language": "The programming language you identified and used for the solution",
  "thoughts": [
    "First thought about understanding the task",
    "Second thought about approach to solve it",
    "Third thought about implementation details"
  ],
  "code": "The solution with comments explaining the code",
  "time_complexity": "The time complexity in form O(_) because _",
  "space_complexity": "The space complexity in form O(_) because _"
}`,
        followUpPrompt: `Review the code solution shown in the image and provide improvements.

First extract and analyze what's shown in the image. Then create an improved version while maintaining the same general approach and structure.

Use the same programming language as in the original solution.

Return your response in this JSON format:
{
  "language": "The programming language used",
  "thoughts": [
    "First thought about the task and current solution",
    "Second thought about possible improvements",
    "Third thought about the final solution"
  ],
  "old_code": "The exact code from the image",
  "new_code": "The improved code with inline comments on changed lines",
  "time_complexity": "O(_) because _",
  "space_complexity": "O(_) because _"
}`
      },
      meeting_notes: {
        name: "Meeting Notes",
        initialPrompt: `Analyze the image of meeting notes or slides and extract all relevant information.

Please identify:
1. The main topics or agenda items
2. Key points discussed for each topic
3. Any action items or decisions made
4. Participants mentioned (if any)
5. Dates, deadlines, or timelines mentioned

Organize the information in a clear, structured format.`,

        followUpPrompt: `Review the meeting notes shown in the image again and provide additional insights or clarifications.

Based on the image and the previous extraction, please:
1. Identify any information that might have been missed
2. Clarify any ambiguous points
3. Suggest potential follow-up questions or actions
4. Highlight the most important takeaways
5. Organize the information in a more structured way if needed

Present your analysis in a clear, professional format.`
      }
    },
    activeTemplate: 'coding_task'
  },
  clearInvalidConfig: true
}) as Store<StoreSchema> & {
  store: StoreSchema
  get: <K extends keyof StoreSchema>(key: K) => StoreSchema[K]
  set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) => void
}

export { store }
