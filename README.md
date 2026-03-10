# Knick Knackery

Knick Knackery is a lightweight VS Code extension that captures and summarizes your terminal interactions into clean, Keep-style markdown cards. It helps you build a searchable knowledge base of your commands, errors, and solutions without leaving your editor.

## Features

* **Instant Summaries:** Highlight text in your terminal and generate an AI summary with a keyboard shortcut.
* **Auto-Capture:** Automatically grab the output of your last terminal command — no highlighting required.
* **Local or Cloud AI:** Keep your data completely private using local Ollama models, or connect to Anthropic's Claude API or Google Cloud Vertex AI for cloud-powered summaries.
* **Global Knowledge Base:** All notes are saved to `~/.knick_knacks`, so your insights are available across all your VS Code workspaces.
* **Custom Prompts:** Tailor the AI's output format exactly to your liking via extension settings.

## Commands

All commands are available from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and from the terminal right-click context menu.

| Command | Shortcut (Win/Linux) | Shortcut (Mac) | Description |
|---|---|---|---|
| **Knick Knackery: Save Terminal Selection** | `Ctrl+Shift+N` | `Cmd+Shift+N` | Summarize the currently highlighted text in the terminal. |
| **Knick Knackery: Save Last Command** | `Ctrl+Shift+M` | `Cmd+Shift+M` | Automatically capture and summarize the output of the last terminal command. |
| **Knick Knackery: Set API Key** | — | — | Store your Anthropic API key securely (required for the Cloud Anthropic engine). |

> **Note:** The keyboard shortcuts only activate when the terminal is focused.

## Requirements

You need **one** of the following AI backends configured:

1. **Local (Ollama):** [Ollama](https://ollama.com/) installed and running locally with a pulled model.
2. **Cloud (Anthropic API):** An [Anthropic API Key](https://console.anthropic.com/).
3. **Cloud (Vertex AI):** A Google Cloud project with Vertex AI enabled and a service account credentials JSON file.

## Setup by Engine

### Option 1: Local (Ollama)

This is the default engine. No API keys are needed — everything runs on your machine.

1. Install [Ollama](https://ollama.com/) and make sure it is running.
2. Pull a model (e.g., `ollama pull llama3.2:1b`).
3. In VS Code settings, set `knick-knackery.aiEngine` to **Local (Ollama)**.
4. Optionally change `knick-knackery.ollamaModel` to the model you pulled (defaults to `llama3.2:1b`).

### Option 2: Cloud (Anthropic API)

Use Anthropic's Claude models directly via API key.

1. In VS Code settings, set `knick-knackery.aiEngine` to **Cloud (Anthropic API)**.
2. Open the Command Palette and run **Knick Knackery: Set API Key** to securely store your Anthropic API key.
3. Optionally change `knick-knackery.anthropicModel` to your preferred model (defaults to `claude-sonnet-4-6`).

### Option 3: Cloud (Vertex AI)

Use Anthropic Claude or Google Gemini models hosted on Google Cloud Vertex AI. This option authenticates using a service account credentials file (Application Default Credentials).

1. In VS Code settings, set `knick-knackery.aiEngine` to **Cloud (Vertex AI)**.
2. Configure the following required settings:
   - `knick-knackery.vertexProjectId` — your GCP project ID (e.g., `my-cloud-project`).
   - `knick-knackery.vertexRegion` — the GCP region where the model is hosted (e.g., `us-east5`).
   - `knick-knackery.vertexAdcPath` — absolute path to your service account credentials JSON file (e.g., `~/.config/gcloud/application_default_credentials.json`).
3. Choose a model with `knick-knackery.vertexModel`. Supported models:
   - **Anthropic:** `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5`, `claude-sonnet-4-5`
   - **Google:** `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`

The extension automatically routes to the correct Vertex AI endpoint based on whether the selected model is a Gemini or Claude model.

## Extension Settings

All settings are under the `knick-knackery` namespace. Search for "Knick Knackery" in VS Code settings to find them.

| Setting | Default | Description |
|---|---|---|
| `aiEngine` | `Local (Ollama)` | AI backend: `Local (Ollama)`, `Cloud (Anthropic API)`, or `Cloud (Vertex AI)`. |
| `ollamaModel` | `llama3.2:1b` | The local Ollama model name. |
| `anthropicModel` | `claude-sonnet-4-6` | The Anthropic model for the Cloud (Anthropic API) engine. |
| `vertexModel` | `claude-sonnet-4-6` | The model for the Vertex AI engine (Claude or Gemini). |
| `vertexProjectId` | — | GCP project ID for Vertex AI. |
| `vertexRegion` | — | GCP region for Vertex AI. |
| `vertexAdcPath` | — | Path to your GCP Application Default Credentials JSON file. |
| `customPrompt` | *(built-in template)* | The prompt sent to the AI. Use `{TEXT}` as a placeholder for the terminal output. |

## Release Notes

### 1.0.0
* Added Vertex AI support for both Anthropic Claude and Google Gemini models.
* Updated Anthropic model options to the Claude 4 family.
* Switched to esbuild for faster, smaller builds.

### 0.0.1
* Initial beta release. Local Ollama support, Anthropic cloud fallback, and global directory management.