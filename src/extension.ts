import * as vscode from 'vscode';
import { KnickKnackeryProvider } from './webview';
import { saveTerminalContext, saveEditorSelection } from './saveTerminalSelection';
import { setApiKey } from './setApiKey';
import { KNICK_KNACKS_DIR } from './paths';

export function activate(context: vscode.ExtensionContext) {
    const provider = new KnickKnackeryProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(KnickKnackeryProvider.viewType, provider)
    );

    // Watch for knick-knacks created externally (e.g., via Hammerspoon hotkey)
    const knickKnacksPattern = new vscode.RelativePattern(vscode.Uri.file(KNICK_KNACKS_DIR), '*.md');
    const watcher = vscode.workspace.createFileSystemWatcher(knickKnacksPattern);
    watcher.onDidCreate(() => provider.updateWebview());
    watcher.onDidChange(() => provider.updateWebview());
    watcher.onDidDelete(() => provider.updateWebview());
    context.subscriptions.push(watcher);

    // Register the manual selection command
    let disposable1 = vscode.commands.registerCommand('knick-knackery.saveSelection', () => {
        saveTerminalContext(context, provider, 'selection');
    });

    // Register the new "last command" command
    let disposable2 = vscode.commands.registerCommand('knick-knackery.saveLastCommand', () => {
        saveTerminalContext(context, provider, 'lastCommand');
    });

    let disposable3 = vscode.commands.registerCommand('knick-knackery.setApiKey', () => {
        setApiKey(context);
    });

    let disposable4 = vscode.commands.registerCommand('knick-knackery.saveEditorSelection', () => {
        saveEditorSelection(context, provider);
    });

    context.subscriptions.push(disposable1, disposable2, disposable3, disposable4);
}

export function deactivate() {};