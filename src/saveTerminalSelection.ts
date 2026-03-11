import * as vscode from 'vscode';
import { AIProvider, OllamaProvider, AnthropicProvider, VertexAnthropicProvider, VertexGoogleProvider } from './aiProvider';
import { KnickKnackeryProvider } from './webview';
import { KNICK_KNACKS_DIR } from './paths';

// Shared logic for summarizing text and saving it as a knick knack
async function summarizeAndSave(context: vscode.ExtensionContext, provider: KnickKnackeryProvider, text: string) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Knick Knackery: Summarizing...",
        cancellable: false
    }, async (progress) => {

        // Pull user preferences for AI engine and model selection
        const config = vscode.workspace.getConfiguration('knick-knackery');
        const engine = config.get<string>('aiEngine');
        const ollamaModel = config.get<string>('ollamaModel') || 'llama3.2:1b';
        const anthropicModel = config.get<string>('anthropicModel') || 'claude-3-5-haiku-20241022';

        let aiProvider: AIProvider;
        let activeModelName = '';

        if (engine === 'Cloud (Anthropic API)') {
            const apiKey = await context.secrets.get('knick_knackery_api_key');
            if (!apiKey) {
                throw new Error("API Key not found. Please run the 'Knick Knackery: Set API Key' command first.");
            }
            aiProvider = new AnthropicProvider(apiKey, anthropicModel);
            activeModelName = anthropicModel;
        }
        else if (engine === 'Cloud (Vertex AI)') {
            const projectId = config.get<string>('vertexProjectId');
            const region = config.get<string>('vertexRegion');
            const adcPath = config.get<string>('vertexAdcPath');
            const vertexModel = config.get<string>('vertexModel') || 'claude-sonnet-4-6';

            if (!projectId || !region || !adcPath) {
                throw new Error("Incomplete Vertex AI configuration. Please ensure Project ID, Region, and ADC Path are all set in your VS Code settings.");
            }

            // Route to the correct provider based on whether the model is Gemini or Claude
            if (vertexModel.startsWith('gemini-')) {
                aiProvider = new VertexGoogleProvider(projectId, region, vertexModel, adcPath);
            } else {
                aiProvider = new VertexAnthropicProvider(projectId, region, vertexModel, adcPath);
            }
            activeModelName = `Vertex (${vertexModel})`;
        }
        else {
            aiProvider = new OllamaProvider(ollamaModel);
            activeModelName = ollamaModel;
        }

        progress.report({ message: `Asking ${activeModelName}...` });
        const summarizedText = await aiProvider.summarize(text);

        // Ensure the global knick knacks directory exists; create it if it doesn't
        const globalKnickKnacksUri = vscode.Uri.file(KNICK_KNACKS_DIR);

        try {
            await vscode.workspace.fs.stat(globalKnickKnacksUri);
        } catch {
            await vscode.workspace.fs.createDirectory(globalKnickKnacksUri);
        }

        // Dynamically name the file based on the current workspace so knick knacks are easy to trace back
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const rawWorkspaceName = workspaceFolders && workspaceFolders.length > 0
            ? workspaceFolders[0].name
            : 'no-workspace'; // Fallback just in case they save a knick knack with no folder open

        // Sanitize the workspace name for the file system (lowercase, underscores only)
        const safeWorkspaceName = rawWorkspaceName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

        const timestamp = Math.floor(Date.now() / 1000);
        const fileName = `${safeWorkspaceName}-${timestamp}.md`; // e.g., "my_project-1741294813.md"
        const fileUri = vscode.Uri.joinPath(globalKnickKnacksUri, fileName);

        // Write the clean, unmodified AI text directly to the file
        const writeData = new TextEncoder().encode(summarizedText);
        await vscode.workspace.fs.writeFile(fileUri, writeData);

        vscode.window.showInformationMessage(`Saved AI summary: ${fileName}`);

        // Refresh the webview to show the new knick knack
        await provider.updateWebview();
    });
}

// The 'mode' parameter lets us toggle between grabbing highlighted text vs. the last terminal output
export async function saveTerminalContext(context: vscode.ExtensionContext, provider: KnickKnackeryProvider, mode: 'selection' | 'lastCommand') {
    try {
        // Backup whatever the user currently has on their clipboard so we can restore it after
        const clipboardBackup = await vscode.env.clipboard.readText();

        // Trigger the native VS Code copy command based on how the user invoked the extension
        if (mode === 'selection') {
            await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
        } else {
            // This relies on VS Code's shell integration to grab just the output of the last executed command
            await vscode.commands.executeCommand('workbench.action.terminal.copyLastCommandOutput');
        }

        // Give the clipboard a split second to populate before we try to read from it
        await new Promise(resolve => setTimeout(resolve, 100));
        const text = await vscode.env.clipboard.readText();

        // Restore the user's original clipboard content now that we've captured the terminal text
        await vscode.env.clipboard.writeText(clipboardBackup);

        if (!text) {
            vscode.window.showWarningMessage('No text found to save. Make sure a command has finished running or text is highlighted.');
            return;
        }

        await summarizeAndSave(context, provider, text);

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to save knick knack: ${error}`);
    }
}

// Grab the currently selected text from the active editor
export async function saveEditorSelection(context: vscode.ExtensionContext, provider: KnickKnackeryProvider) {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found.');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        if (!text) {
            vscode.window.showWarningMessage('No text selected in the editor. Highlight some code first.');
            return;
        }

        await summarizeAndSave(context, provider, text);

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to save knick knack: ${error}`);
    }
}
