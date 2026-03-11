#!/bin/bash

echo "📦 Installing Knick Knackery OS-Level Integration for macOS..."

# 1. Define paths
KNICK_DIR="$HOME/.knick_knacks"
BIN_DIR="$KNICK_DIR/bin"
CLI_SCRIPT="$BIN_DIR/knick-cli.js"
CONFIG_FILE="$KNICK_DIR/os-config.json"

# 2. Create directories and initialize Node project
mkdir -p "$BIN_DIR"
cd "$BIN_DIR" || exit

echo "⚙️  Setting up Node environment and installing google-auth-library..."
if [ ! -f "package.json" ]; then
    npm init -y > /dev/null 2>&1
fi
npm install google-auth-library > /dev/null 2>&1

# 3. Create the Configuration File
if [ ! -f "$CONFIG_FILE" ]; then
cat << 'EOF' > "$CONFIG_FILE"
{
  "engine": "Local (Ollama)",
  "ollamaModel": "llama3.2:1b",
  "anthropicApiKey": "",
  "anthropicModel": "claude-sonnet-4-6",
  "vertexProjectId": "",
  "vertexRegion": "",
  "vertexAdcPath": "~/.config/gcloud/application_default_credentials.json",
  "vertexModel": "claude-sonnet-4-6",
  "customPrompt": "Summarize the following text into a clean markdown format with a Title, TL;DR, and Bullet points.\n\n{TEXT}"
}
EOF
echo "✅ Created default config at ~/.knick_knacks/os-config.json"
else
echo "⏭️  Config file already exists, skipping creation."
fi

# 4. Write the Node.js CLI script
cat << 'EOF' > "$CLI_SCRIPT"
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { GoogleAuth } = require('google-auth-library');

const KNICK_DIR = path.join(os.homedir(), '.knick_knacks');
const CONFIG_PATH = path.join(KNICK_DIR, 'os-config.json');

// Helper to trigger macOS push notifications
function notify(message, title = "Knick Knackery") {
    try {
        execSync(`osascript -e 'display notification "${message}" with title "${title}"'`);
    } catch (e) { console.error("Notification failed", e); }
}

async function main() {
    try {
        let text = process.argv[2];
        if (!text || text.trim() === '') {
            text = execSync('pbpaste', { encoding: 'utf8' });
        }

        if (!text || text.trim() === '') {
            notify("No text highlighted or found in clipboard.");
            return;
        }

        if (!fs.existsSync(CONFIG_PATH)) {
            notify("Config file missing. Run the installer again.");
            return;
        }
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        const prompt = config.customPrompt.replace('{TEXT}', text);

        let summary = "";
        notify(`Asking ${config.engine}...`);

        if (config.engine === 'Cloud (Anthropic API)') {
            if (!config.anthropicApiKey) throw new Error("Missing Anthropic API Key in os-config.json");
            
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.anthropicApiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.anthropicModel,
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            if (!res.ok) throw new Error(`Anthropic Error: ${res.statusText}`);
            const data = await res.json();
            summary = data.content[0].text.trim();

        } else if (config.engine === 'Cloud (Vertex AI)') {
            if (!config.vertexProjectId || !config.vertexRegion || !config.vertexAdcPath) {
                throw new Error("Missing Vertex AI config values in os-config.json");
            }

            const adcPath = config.vertexAdcPath.replace(/^~(?=$|\/|\\)/, os.homedir());
            const auth = new GoogleAuth({
                keyFilename: adcPath,
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });

            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            const accessToken = tokenResponse.token;

            if (config.vertexModel.startsWith('gemini-')) {
                // Vertex Google Provider
                const apiUrl = `https://${config.vertexRegion}-aiplatform.googleapis.com/v1/projects/${config.vertexProjectId}/locations/${config.vertexRegion}/publishers/google/models/${config.vertexModel}:generateContent`;
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: 1024 }
                    })
                });
                if (!res.ok) throw new Error(`Vertex API error: ${await res.text()}`);
                const data = await res.json();
                summary = data.candidates[0].content.parts[0].text.trim();

            } else {
                // Vertex Anthropic Provider
                const apiUrl = `https://${config.vertexRegion}-aiplatform.googleapis.com/v1/projects/${config.vertexProjectId}/locations/${config.vertexRegion}/publishers/anthropic/models/${config.vertexModel}:rawPredict`;
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        anthropic_version: "vertex-2023-10-16",
                        max_tokens: 1024,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                if (!res.ok) throw new Error(`Vertex API error: ${await res.text()}`);
                const data = await res.json();
                summary = data.content[0].text.trim();
            }

        } else {
            // Local Ollama
            const res = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.ollamaModel,
                    prompt: prompt,
                    stream: false
                })
            });
            if (!res.ok) throw new Error(`Ollama Error: ${res.statusText}`);
            const data = await res.json();
            summary = data.response.trim();
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const fileName = `macOS-capture-${timestamp}.md`;
        const filePath = path.join(KNICK_DIR, fileName);
        
        fs.writeFileSync(filePath, summary, 'utf8');
        notify(`Saved successfully as ${fileName}`);

    } catch (error) {
        notify(`Error: ${error.message}`);
        console.error(error);
    }
}

main();
EOF

# 5. Make the script executable
chmod +x "$CLI_SCRIPT"

echo "✅ Installation Complete!"
echo ""
echo "=========================================================="
echo "🎯 FINAL STEP: Bind to a Keyboard Shortcut"
echo "=========================================================="
echo "1. Open the 'Shortcuts' app on your Mac."
echo "2. Click the '+' button to create a new shortcut."
echo "3. Search for 'Run Shell Script' in the right sidebar and double-click it."
echo "4. In the script action window:"
echo "   - Change 'Pass Input' to: 'as arguments'"
echo "   - Delete the default code and paste this EXACT line:"
echo ""
echo "     /usr/local/bin/node ~/.knick_knacks/bin/knick-cli.js \"\$1\""
echo ""
echo "5. In the right sidebar, click the 'Shortcut Details' icon (the circle with an 'i')."
echo "6. Check the box for 'Use as Quick Action' and 'Services Menu'."
echo "7. Click 'Add Keyboard Shortcut' and press your desired combo."
echo "=========================================================="
