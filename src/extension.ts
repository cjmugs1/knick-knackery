import * as vscode from 'vscode';
import { ContextNotesProvider } from './webview';
import { saveTerminalContext } from './saveTerminalSelection';
import { setApiKey } from './setApiKey';

export function activate(context: vscode.ExtensionContext) {
    const provider = new ContextNotesProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ContextNotesProvider.viewType, provider)
    );

    // Register the manual selection command
    let disposable1 = vscode.commands.registerCommand('context-notes.saveSelection', () => {
        saveTerminalContext(context, provider, 'selection');
    });

    // Register the new "last command" command
    let disposable2 = vscode.commands.registerCommand('context-notes.saveLastCommand', () => {
        saveTerminalContext(context, provider, 'lastCommand');
    });

    let disposable3 = vscode.commands.registerCommand('context-notes.setApiKey', () => {
        setApiKey(context);
    });

    context.subscriptions.push(disposable1, disposable2, disposable3);
}

export function deactivate() {};