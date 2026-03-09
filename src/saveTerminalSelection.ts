import * as vscode from 'vscode';
import * as os from 'os'; // Needed to grab the user's home directory
import * as path from 'path'; // Safely builds cross-platform file paths
import { AIProvider, OllamaProvider, AnthropicProvider } from './aiProvider';
import { ContextNotesProvider } from './webview';

// The 'mode' parameter lets us toggle between grabbing highlighted text vs. the last terminal output
export async function saveTerminalContext(context: vscode.ExtensionContext, provider: ContextNotesProvider, mode: 'selection' | 'lastCommand') {
    try {
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

        if (!text) {
            vscode.window.showWarningMessage('No text found to save. Make sure a command has finished running or text is highlighted.');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Knick Knackery: Summarizing...",
            cancellable: false
        }, async (progress) => {
            
            // Pull user preferences for AI engine and model selection
            const config = vscode.workspace.getConfiguration('context-notes');
            const engine = config.get<string>('aiEngine');
            const ollamaModel = config.get<string>('ollamaModel') || 'llama3.2:1b'; 
            const anthropicModel = config.get<string>('anthropicModel') || 'claude-3-5-haiku-20241022';

            let aiProvider: AIProvider;
            let activeModelName = ''; 

            if (engine === 'Local (Ollama)') {
                aiProvider = new OllamaProvider(ollamaModel);
                activeModelName = ollamaModel;
            } else {
                const apiKey = await context.secrets.get('context_notes_api_key');
                if (!apiKey) {
                    throw new Error("API Key not found. Please run the 'Knick Knackery: Set API Key' command first.");
                }
                aiProvider = new AnthropicProvider(apiKey, anthropicModel);
                activeModelName = anthropicModel;
            }

            progress.report({ message: `Asking ${activeModelName}...` });
            const summarizedText = await aiProvider.summarize(text);

            // Ensure the global notes directory exists; create it if it doesn't
            const homeDir = os.homedir();
            const globalNotesDir = path.join(homeDir, '.context_notes');
            const globalNotesUri = vscode.Uri.file(globalNotesDir);

            try {
                await vscode.workspace.fs.stat(globalNotesUri);
            } catch {
                await vscode.workspace.fs.createDirectory(globalNotesUri);
            }

            // Dynamically name the file based on the current workspace so notes are easy to trace back
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const rawWorkspaceName = workspaceFolders && workspaceFolders.length > 0 
                ? workspaceFolders[0].name 
                : 'no-workspace'; // Fallback just in case they save a note with no folder open
            
            // Sanitize the workspace name for the file system (lowercase, underscores only)
            const safeWorkspaceName = rawWorkspaceName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            
            const timestamp = Math.floor(Date.now() / 1000); 
            const fileName = `${safeWorkspaceName}-${timestamp}.md`; // e.g., "my_project-1741294813.md"
            const fileUri = vscode.Uri.joinPath(globalNotesUri, fileName);

            // Write the clean, unmodified AI text directly to the file
            const writeData = new TextEncoder().encode(summarizedText);
            await vscode.workspace.fs.writeFile(fileUri, writeData);

            vscode.window.showInformationMessage(`Saved AI summary: ${fileName}`);

            // Refresh the webview to show the new note
            await provider.updateWebview(); 
        });

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to save terminal note: ${error}`);
    }
}