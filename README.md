# Knick Knackery

Knick Knackery is a lightweight VS Code extension that automatically captures and summarizes your terminal interactions into clean, Keep-style markdown cards. It helps you build a searchable knowledge base of your commands, errors, and solutions without leaving your editor.

## Features

* **Instant Summaries:** Highlight text in your terminal and press `Ctrl+Shift+N` (or `Cmd+Shift+N` on Mac) to generate an AI summary.
* **Auto-Capture:** Run a command, then press `Ctrl+Shift+M` to automatically grab the output of your last command—no highlighting required!
* **Local or Cloud AI:** Keep your data completely private using local Ollama models, or connect to Anthropic's Claude for cloud-powered summaries.
* **Global Knowledge Base:** All notes are securely saved to a `~/.knick_knacks` directory, so your insights are available across all your VS Code workspaces.
* **Custom Prompts:** Tailor the AI's output format exactly to your liking via extension settings.

## Requirements

To use this extension, you will need ONE of the following:

1. **Local Mode:** [Ollama](https://ollama.com/) installed and running on your machine with a pulled model (defaults to `llama3.2:1b`).
2. **Cloud Mode:** An active [Anthropic API Key](https://console.anthropic.com/).

## Setup & Usage

1. Open the Knick Knackery board by clicking the icon in the Activity Bar.
2. If using Anthropic, open the Command Palette (`Ctrl+Shift+P`) and run **Knick Knackery: Set API Key**.
3. Run a command in your terminal.
4. Press `Ctrl+Shift+M` to capture it, or highlight specific text and press `Ctrl+Shift+N`.
5. Watch your context board populate with searchable, copyable markdown cards!

## Extension Settings

You can customize the extension in your VS Code settings by searching for `Knick Knackery`:

* `knick-knackery.aiEngine`: Toggle between "Local (Ollama)" and "Cloud (API Key)".
* `knick-knackery.ollamaModel`: Specify which local model to use.
* `knick-knackery.anthropicModel`: Choose your preferred Claude 3.5 model.
* `knick-knackery.customPrompt`: Edit the prompt and markdown template sent to the AI.

## Release Notes

### 0.0.1
* Initial beta release! Added local Ollama support, Anthropic cloud fallback, and global directory management.