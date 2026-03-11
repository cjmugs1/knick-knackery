import * as vscode from 'vscode';
import { KnickKnackeryProvider } from './webview';
import { saveTerminalContext, saveEditorSelection } from './saveTerminalSelection';
import { setApiKey } from './setApiKey';

export function activate(context: vscode.ExtensionContext) {
    const provider = new KnickKnackeryProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(KnickKnackeryProvider.viewType, provider)
    );

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