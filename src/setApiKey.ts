import * as vscode from 'vscode';

export async function setApiKey(context: vscode.ExtensionContext) {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Anthropic API Key',
        ignoreFocusOut: true,
        password: true
    });

    if (apiKey) {
        await context.secrets.store('knick_knackery_api_key', apiKey);
        vscode.window.showInformationMessage('Anthropic API Key securely saved!');
    }
};
