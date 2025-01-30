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
  if (
    code.startsWith("function") ||
    code.startsWith("def") ||
    code.match(/\):\s*\n/)
  )
    return "function";
  if (code.startsWith("class")) return "class";
  if (code.match(/^(describe|it|test)/)) return "test";
  if (code.match(/(config|settings|options)/i)) return "config";
  if (code.match(/(for|while|reduce|map|filter|algorithm|=>)/))
    return "complex";
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
      detailLevel === "concise"
        ? "1-2 lines maximum"
        : detailLevel === "detailed"
        ? "3-5 lines"
        : "Multi-line documentation with structured formatting"
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

  const specializedPrompts = {
    function: {
      concise: "One-line function purpose",
      detailed: "Parameters, returns, and key logic",
    },
    class: {
      concise: "Class responsibility summary",
      detailed: "Key methods and properties",
    },
  };

  const finalPrompt = `${basePrompt}\n${
    specializedPrompts[codeType as keyof typeof specializedPrompts]?.[
      detailLevel
    ] || ""
  }\nCode:\n\`\`\`${language}\n${code}\n\`\`\``;

  try {
    const result = await model.generateContent(finalPrompt);
    const comment = result.response
      .text()
      .replace(/^```.*?\n/, "")
      .replace(/\n```$/, "")
      .trim();

    // Safety check: Remove function definition if mistakenly included
    if (comment.includes(code.trim())) {
      console.warn("Generated comment contained function code. Removing it.");
      return "";
    }

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

  // Normalize whitespace and remove potential code block markers
  const cleanedComment = comment
    .trim()
    .replace(/^```[\s\S]*?\n/, "")
    .replace(/\n```$/, "");

  return (
    cleanedComment.length > 0 &&
    cleanedComment.length < (cleanedComment.includes("\n") ? 500 : 150) &&
    !forbiddenTerms.some((term) =>
      cleanedComment.toLowerCase().includes(term)
    ) &&
    !cleanedComment.includes(code.trim()) && // Ensure it doesn't include the full function
    !/^\s*(function|def|class|public\s+|private\s+|const\s+\w+\s*=\s*\(|let\s+\w+\s*=\s*\(|var\s+\w+\s*=\s*\(|\w+\s*=\s*lambda)/.test(
      cleanedComment
    ) // Detects common function/class definitions
  );
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    const apiKey = await getApiKey(context);
    genAI = new GoogleGenerativeAI(apiKey);

    // Command to open the home page
    let disposable = vscode.commands.registerCommand(
      "commento.openHomePage",
      
      () => {
        const panel = vscode.window.createWebviewPanel(
          "homePage", // The view type (identifier for the panel)
          "Commento Home", // Title of the panel
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
              vscode.Uri.joinPath(context.extensionUri, "media"),
            ],
          }
        );

        panel.webview.html = getWebviewContent(context, panel);
      }
    );

    context.subscriptions.push(disposable);
  } catch (error) {
    return;
  }

  // Function to get the HTML content for the webview
  function getWebviewContent(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
): string {
  // Get the path to the index.html in the media folder
  const indexPath = path.join(context.extensionUri.fsPath, "media", "index.html");


  // Read the HTML content from index.html
  const htmlContent = fs.readFileSync(indexPath, "utf8");


  // Use Webview to display the HTML content and replace all resource paths
  return (
    htmlContent
      // Replace stylesheet paths
      .replace(
        /(<link\s+rel="stylesheet"\s+href=")(.*?)(".*?>)/g,
        (match, p1, p2, p3) => {
          const stylesheetPath = vscode.Uri.joinPath(
            context.extensionUri,
            "media",
            p2
          );
          return `${p1}${panel.webview.asWebviewUri(stylesheetPath)}${p3}`;
        }
      )
      // Replace script paths
      .replace(/(<script\s+src=")(.*?)(".*?>)/g, (match, p1, p2, p3) => {
        const scriptPath = vscode.Uri.joinPath(
          context.extensionUri,
          "media",
          p2
        );
        return `${p1}${panel.webview.asWebviewUri(scriptPath)}${p3}`;
      })
      // Replace image paths (for PNG files)
      .replace(/(<img\s+src=")(.*?)(".*?>)/g, (match, p1, p2, p3) => {
        const imagePath = vscode.Uri.joinPath(
          context.extensionUri,
          "media",
          p2
        );
        return `${p1}${panel.webview.asWebviewUri(imagePath)}${p3}`;
      })
  );
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
        const message =
          error instanceof Error ? error.message : "Unknown error";
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
