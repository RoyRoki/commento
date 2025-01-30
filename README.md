# commentov1

This extension adds powerful comment management functionality to your Visual Studio Code workspace. It allows easy generation, editing, and management of comments in your codebase. With this extension, you can quickly insert structured comments and enhance the readability of your code.

## Features

- **Generate Comments:** Automatically generate well-structured comments based on your code context.
- **Remove Inappropriate Code:** Identifies and removes any unwanted or dangerous code snippets in comments.
- **Customizable Comment Templates:** Customize comment templates based on project requirements.
- **Inline Warnings:** Displays warnings when certain patterns are detected within comments.
  
> Tip: Take advantage of the extension by using it in combination with your existing development workflow!

## Requirements

- **Node.js**: Ensure you have [Node.js](https://nodejs.org/) installed (v16 or higher recommended).
- **Visual Studio Code**: This extension is compatible with Visual Studio Code versions 1.50 and above.
- **npm**: Make sure npm is installed for managing dependencies.

## Extension Settings

This extension contributes the following settings:

- `commentov1.enable`: Enable or disable the comment generation feature.
- `commentov1.template`: Customize the template used for generating comments.

## Known Issues

- Some specific comment patterns might not be detected correctly on older codebases.
- Occasional formatting issues when the template is heavily customized.

## Release Notes

### 1.0.0

- Initial release of **commentov1** extension. Adds core comment generation and management features.

### 1.1.1-beta

- Fixed comment formatting for certain code snippets.
- Improved template handling.
⚠️ This is a beta version.
---

## Following Extension Guidelines

Ensure that you've read through the extension guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

- Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
- Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
- Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For More Information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
