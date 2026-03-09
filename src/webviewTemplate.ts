export function getWebviewHtml(cardsHtml: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knick Knackery</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px; 
            line-height: 1.4;
            font-size: 0.9em;
        }
        
        .usage-guide {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding: 10px;
            margin-bottom: 15px;
            font-size: 0.9em;
            border-radius: 0 4px 4px 0;
        }
        
        .usage-guide h4 {
            margin: 0 0 8px 0;
            color: var(--vscode-editor-foreground);
            font-size: 1.05em;
        }

        .usage-guide ul {
            margin: 0;
            padding-left: 20px;
            color: var(--vscode-descriptionForeground);
        }

        .usage-guide li {
            margin-bottom: 4px;
        }

        .usage-guide code {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 5px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }

        #searchInput {
            width: 100%;
            padding: 8px;
            margin-bottom: 15px;
            box-sizing: border-box;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: inherit;
        }
        #searchInput:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }

        .knick-knack-card {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 15px;
            background-color: var(--vscode-sideBar-background);
            position: relative; 
        }

        .knick-knack-card.collapsed .markdown-body {
            max-height: 65px; 
            overflow: hidden;
        }

        .knick-knack-card.collapsed .markdown-body::after {
            content: "";
            position: absolute;
            bottom: 30px; 
            left: 0;
            right: 0;
            height: 25px;
            background: linear-gradient(transparent, var(--vscode-sideBar-background));
            pointer-events: none; 
        }

        .expand-toggle {
            display: block;
            text-align: center;
            font-size: 0.85em;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            padding-top: 6px;
            margin-top: 6px;
            border-top: 1px dashed var(--vscode-panel-border);
            user-select: none;
        }

        .expand-toggle:hover {
            color: var(--vscode-textLink-activeForeground);
        }

        .title-container {
            display: flex;
            align-items: center;
            padding-right: 10px;
        }

        .tags {
            font-size: 1.1em;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            font-family: var(--vscode-editor-font-family);
            word-break: break-word;
        }
        
        .clickable-title {
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .clickable-title:hover {
            opacity: 0.8;
            text-decoration: underline;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        
        .knick-knack-card h3 {
            margin: 0;
            color: var(--vscode-textPreformat-foreground);
            font-size: 1.1em;
            word-break: break-all;
            padding-right: 10px;
        }

        .icon-btn {
            background: none;
            border: none;
            color: var(--vscode-icon-foreground);
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 1.1em;
        }
        .icon-btn:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-editorError-foreground); 
        }

        .action-buttons {
            display: flex;
            gap: 5px;
        }

        .copy-code-btn {
            position: absolute;
            top: 5px;
            right: 5px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
            padding: 2px 6px;
            font-size: 0.8em;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .copy-code-btn:hover {
            opacity: 1;
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .markdown-body pre {
            position: relative;
            white-space: pre-wrap;
            word-wrap: break-word;
            background-color: var(--vscode-editor-background);
            padding: 12px;
            padding-top: 30px; 
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
            overflow-x: auto;
        }
        .markdown-body code {
            font-family: var(--vscode-editor-font-family);
            background-color: var(--vscode-editor-background);
            padding: 2px 4px;
            border-radius: 3px;
        }
        .markdown-body pre code {
            padding: 0;
            background-color: transparent;
        }
    </style>
</head>
<body>
    <div class="usage-guide">
        <h4>⌨️ Knick Knackery Guide</h4>
        <ul>
            <li><strong>Save Selection:</strong> Select terminal, highlight text &amp; press <code>Ctrl+Shift+N</code></li>
            <li><strong>Save Last Command:</strong> Select terminal, press <code>Ctrl+Shift+M</code> (No highlighting needed!)</li>
            <li><strong>Settings:</strong> Open Settings (<code>Ctrl+,</code>) and search <em>Knick Knackery</em> to change AI engines, models, or customize the prompt.</li>
            <li><strong>Cloud Models:</strong> If using an Anthropic cloud model instead of local Ollama, press <code>Ctrl+Shift+P</code> and run <em>Knick Knackery: Set API Key</em>.</li>
        </ul>
    </div>
    
    <input type="text" id="searchInput" placeholder="Search knick knacks..." />

    <div id="knickKnacksContainer">
        ${cardsHtml}
    </div>

    <script>
        // Connect the webview to the extension backend
        const vscode = acquireVsCodeApi();

        const searchInput = document.getElementById('searchInput');
        const knickKnackCards = document.querySelectorAll('.knick-knack-card');

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            knickKnackCards.forEach(card => {
                const cardText = card.textContent.toLowerCase();
                if (cardText.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });

        const titleElements = document.querySelectorAll('.clickable-title');
        titleElements.forEach(title => {
            title.addEventListener('click', (e) => {
                const card = e.target.closest('.knick-knack-card');
                const fileName = card.getAttribute('data-filename');
                
                vscode.postMessage({
                    type: 'openKnickKnack',
                    fileName: fileName
                });
            });
        });

        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.knick-knack-card');
                const fileName = card.getAttribute('data-filename');
                
                vscode.postMessage({
                    type: 'deleteKnickKnack',
                    fileName: fileName
                });
            });
        });

        const copyKnickKnackButtons = document.querySelectorAll('.copy-knick-knack-btn');
        copyKnickKnackButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.knick-knack-card');
                const fileName = card.getAttribute('data-filename');
                
                vscode.postMessage({
                    type: 'copyKnickKnack',
                    fileName: fileName
                });
            });
        });

        // Add a copy button to the top of every code block
        const preElements = document.querySelectorAll('.markdown-body pre');
        preElements.forEach(pre => {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.title = 'Copy code snippet';

            copyBtn.addEventListener('click', () => {
                const codeElement = pre.querySelector('code');
                if (codeElement) {
                    vscode.postMessage({
                        type: 'copyText',
                        text: codeElement.innerText
                    });
                    
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => copyBtn.textContent = originalText, 2000);
                }
            });

            pre.insertBefore(copyBtn, pre.firstChild);
        });

        // Hide the toggle button if the knick knack is already short enough to fit
        setTimeout(() => {
            document.querySelectorAll('.knick-knack-card').forEach(card => {
                const body = card.querySelector('.markdown-body');
                const toggle = card.querySelector('.expand-toggle');
                
                if (body.scrollHeight <= 70) { 
                    card.classList.remove('collapsed');
                    toggle.style.display = 'none';
                }
            });
        }, 100); 

        const toggles = document.querySelectorAll('.expand-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const card = e.target.closest('.knick-knack-card');
                
                if (card.classList.contains('collapsed')) {
                    card.classList.remove('collapsed');
                    toggle.textContent = 'Show Less 🔼';
                } else {
                    card.classList.add('collapsed');
                    toggle.textContent = 'Show More 🔽';
                }
            });
        });
    </script>
</body>
</html>`;
}
