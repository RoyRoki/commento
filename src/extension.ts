import * as vscode from "vscode";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

let genAI: GoogleGenerativeAI;

interface CommentGenerationConfig {
  includeExamples: boolean;
}

async function getApiKey(context: vscode.ExtensionContext): Promise<string> {
  const config = vscode.workspace.getConfiguration("commento");
  const apiKey = config.get<string>("apiKey")?.trim() || "";

  if (!apiKey) {
    vscode.window.showErrorMessage(
      "Gemini API key not configured. Please check settings."
    );
    throw new Error("Missing API key");
  }
  return apiKey;
}

function getGenerationConfig(): CommentGenerationConfig {
  const config = vscode.workspace.getConfiguration("commento");
  return {
    includeExamples: config.get<boolean>("includeExamples") || false,
  };
}

function detectCodeType(code: string): string {
  if (code.startsWith("function") || code.startsWith("def") || code.match(/\):\s*\n/))
    return "function";
  if (code.startsWith("class")) return "class";
  if (code.match(/^(describe|it|test)/)) return "test";
  if (code.match(/(config|settings|options)/i)) return "config";
  if (code.match(/(for|while|reduce|map|filter|algorithm|=>)/)) return "complex";
  return "general";
}

async function generateComment(
  code: string,
  language: string,
  context: string,
  detailLevel: "concise" | "detailed"
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const codeType = detectCodeType(code);
  const { includeExamples } = getGenerationConfig();

  const basePrompt = `
    Generate a ${detailLevel} code comment for the given ${language} code snippet, targeting experienced developers. The comment should provide actionable insights and clear explanations.

    **Specific Instructions:**
    1. **Purpose:** Clearly explain the primary goal and functionality of the code.
    2. **Implementation:** Describe key steps, logic, algorithms, and data structures used. Highlight any non-obvious or complex parts. Mention time/space complexity if applicable.
    3. **Context:** Explain how this code interacts with other parts of the system and its dependencies.
    4. **Alternatives/Trade-offs:** Mention alternative approaches and why the current one was chosen. Discuss trade-offs (e.g., performance vs. readability).
    5. **Edge Cases/Error Handling:** Document handling of edge cases, invalid inputs, and potential errors.
    6. **Assumptions:** State any assumptions about inputs, environment, or dependencies.
    7. **Examples (if requested):** If \`includeExamples\` is true, provide a brief usage example.
    8. **Only return the comment**, do not rewrite the function. 

    **Formatting Requirements:**
    - Use standard ${language} comment syntax.
    - ${
      detailLevel === "concise" ? "1-2 lines maximum" : detailLevel === "detailed" ? "3-5 lines" : "Multi-line documentation with structured formatting"
    }
    - ${includeExamples ? "Include relevant usage examples" : "No examples"}
    - Follow ${language} best practices for comments.

    **Code Context:**
    ${context.trim().slice(0, 500)}

    **Code:**
    \`\`\`${language}
    ${code}
    \`\`\`
  `;

  try {
    const result = await model.generateContent(basePrompt);
    const comment = result.response.text().trim();
    if (!validateComment(comment, code)) {
      throw new Error("Generated comment failed validation");
    }
    return comment;
  } catch (error) {
    console.error("Generation error:", error);
    throw new Error(`Failed to generate ${detailLevel} comment`);
  }
}

function validateComment(comment: string, code: string): boolean {
  const forbiddenTerms = ["obvious", "simple", "self-explanatory"];
  const cleanedComment = comment.trim();

  return (
    cleanedComment.length > 0 &&
    cleanedComment.length < (cleanedComment.includes("\n") ? 500 : 150) &&
    !forbiddenTerms.some((term) => cleanedComment.toLowerCase().includes(term)) &&
    !cleanedComment.includes(code.trim())
  );
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    const apiKey = await getApiKey(context);
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (error) {
    return;
  }

  const registerCommand = (
    command: string,
    detailLevel: "concise" | "detailed"
  ) => {
    return vscode.commands.registerCommand(command, async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { document, selection } = editor;
      const code = document.getText(selection);
      if (!code.trim()) return;

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Generating ${detailLevel} comment...`,
            cancellable: false,
          },
          async () => {
            const comment = await generateComment(
              code,
              document.languageId,
              document.getText(),
              detailLevel
            );
            await editor.edit((editBuilder) => {
              editBuilder.insert(selection.start, `${comment}\n`);
            });
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(
          `${detailLevel} comment failed: ${message}`
        );
      }
    });
  };

  context.subscriptions.push(
    registerCommand("commento.generateConcise", "concise"),
    registerCommand("commento.generateDetailed", "detailed")
  );
}

export function deactivate() {}
