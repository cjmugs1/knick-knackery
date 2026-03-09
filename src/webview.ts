import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { marked } from 'marked';
import { getWebviewHtml } from './webviewTemplate';

export class KnickKnackeryProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'knick-knackery.boardView';
    
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'deleteKnickKnack':
                    await this.deleteKnickKnack(message.fileName);
                    break;
                case 'copyKnickKnack':
                    await this.copyKnickKnack(message.fileName);
                    break;
                case 'copyText':
                    await vscode.env.clipboard.writeText(message.text);
                    vscode.window.showInformationMessage('Code snippet copied!');
                    break;
                case 'openKnickKnack':
                    await this.openKnickKnack(message.fileName);
                    break;
            }
        });

        this.updateWebview();
    }

    public async updateWebview() {
        if (this._view) {
            this._view.webview.html = await this.getWebviewContent();
        }
    }

    private async deleteKnickKnack(fileName: string) {
        const userChoice = await vscode.window.showWarningMessage(
            `Are you sure you want to permanently delete ${fileName}?`,
            { modal: true }, 
            'Delete'
        );

        if (userChoice !== 'Delete') return; 

        const homeDir = os.homedir();
        const fileUri = vscode.Uri.file(path.join(homeDir, '.knick_knacks', fileName));

        try {
            await vscode.workspace.fs.delete(fileUri, { useTrash: false });
            vscode.window.showInformationMessage(`Deleted ${fileName}`);
            await this.updateWebview();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete knick knack: ${error}`);
        }
    }

    private async copyKnickKnack(fileName: string) {
        const homeDir = os.homedir();
        const fileUri = vscode.Uri.file(path.join(homeDir, '.knick_knacks', fileName));

        try {
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            const rawMarkdown = new TextDecoder().decode(fileData);
            
            await vscode.env.clipboard.writeText(rawMarkdown);
            vscode.window.showInformationMessage(`Copied full context of ${fileName}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to copy knick knack: ${error}`);
        }
    }

    private async openKnickKnack(fileName: string) {
        const homeDir = os.homedir();
        const fileUri = vscode.Uri.file(path.join(homeDir, '.knick_knacks', fileName));

        try {
            const document = await vscode.workspace.openTextDocument(fileUri);
            // preview: false ensures the tab stays open permanently instead of just peeking
            await vscode.window.showTextDocument(document, { preview: false });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open knick knack: ${error}`);
        }
    }

    private async getWebviewContent() {
        const homeDir = os.homedir();
        const globalKnickKnacksDir = path.join(homeDir, '.knick_knacks');
        const globalKnickKnacksUri = vscode.Uri.file(globalKnickKnacksDir);
        let cardsHtml = '';

        try {
            const entries = await vscode.workspace.fs.readDirectory(globalKnickKnacksUri);
            const mdFiles = entries.filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.md'));

            // Keep the newest knick knacks pinned to the top
            mdFiles.sort((a, b) => b[0].localeCompare(a[0]));

            if (mdFiles.length === 0) {
                cardsHtml = '<p>No knick knacks found yet. Highlight terminal text and press Ctrl+Shift+N!</p>';
            } else {
                for (const [fileName] of mdFiles) {
                    const fileUri = vscode.Uri.joinPath(globalKnickKnacksUri, fileName);
                    const fileData = await vscode.workspace.fs.readFile(fileUri);
                    const rawMarkdown = new TextDecoder().decode(fileData);

                    // Grab the workspace name straight from the filename
                    const nameMatch = fileName.match(/^([a-z0-9_-]+)-\d+\.md$/);
                    const workspaceName = nameMatch ? nameMatch[1] : 'unknown';

                    let tagsString = '';

                    // Pull out any hashtags so we can display them cleanly
                    const foundTags = rawMarkdown.match(/#[a-zA-Z0-9_-]+/g);
                    if (foundTags && foundTags.length > 0) {
                        const uniqueTags = [...new Set(foundTags)];
                        
                        // Strip the '#' symbol and prevent duplicate tags if the tag matches the workspace name
                        const filteredTags = uniqueTags
                            .map(tag => tag.substring(1))
                            .filter(tag => tag !== workspaceName);
                        
                        tagsString = filteredTags.join(', ');
                    }

                    const displayTitle = tagsString 
                        ? `/${workspaceName}: ${tagsString}` 
                        : `/${workspaceName}`;

                    // Tidy up the markdown body before passing it to the parser
                    let cleanMarkdown = rawMarkdown;
                    cleanMarkdown = cleanMarkdown.replace(/(#+\s*)?\**Context Tags:?\**\s*\n?/gi, '');
                    cleanMarkdown = cleanMarkdown.replace(/#[a-zA-Z0-9_-]+[ \t]*/g, '');
                    cleanMarkdown = cleanMarkdown.trim();

                    const renderedHtmlContent = await marked.parse(cleanMarkdown);

                    cardsHtml += `
                        <div class="knick-knack-card collapsed" data-filename="${fileName}">
                            <div class="card-header">
                                <div class="title-container">
                                    <span class="tags clickable-title" title="Click to edit raw markdown">${displayTitle}</span>
                                </div>
                                <div class="action-buttons">
                                    <button class="icon-btn copy-knick-knack-btn" title="Copy Full Knick Knack to Clipboard">📋</button>
                                    <button class="icon-btn delete-btn" title="Delete Knick Knack">🗑️</button>
                                </div>
                            </div>
                            <div class="markdown-body">
                                ${renderedHtmlContent}
                            </div>
                            <div class="expand-toggle">Show More 🔽</div>
                        </div>
                    `;
                }
            }
        } catch (error) {
            cardsHtml = '<p>The global ~/.knick_knacks directory does not exist yet. Save a terminal selection first!</p>';
        }
        
        return getWebviewHtml(cardsHtml);
    }
}
