#!/bin/bash

echo "Installing Knick Knackery OS-Level Integration for macOS..."

# 1. Define paths
KNICK_DIR="$HOME/.knick_knacks"
BIN_DIR="$KNICK_DIR/bin"
CLI_SCRIPT="$BIN_DIR/knick-cli.js"
CONFIG_FILE="$KNICK_DIR/os-config.json"

# 2. Detect the correct Node.js path
NODE_PATH="$(which node 2>/dev/null)"
if [ -z "$NODE_PATH" ]; then
    echo "ERROR: Node.js not found. Please install Node.js first."
    exit 1
fi
echo "Found Node.js at: $NODE_PATH"

# 3. Create directories and initialize Node project
mkdir -p "$BIN_DIR"
cd "$BIN_DIR" || exit

echo "Setting up Node environment and installing google-auth-library..."
if [ ! -f "package.json" ]; then
    npm init -y > /dev/null 2>&1
fi
npm install google-auth-library > /dev/null 2>&1

# 4. Create the Configuration File
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
  "customPrompt": "You are a strict formatting bot. You MUST summarize the user provided terminal interaction EXACTLY matching the structure of the markdown TEMPLATE below. Each template section lists exactly the number of sentences, bullet points, or tags it asks for. Do NOT invent your own headings. Do NOT add pleasantries.\n\n=== TEMPLATE ===\n### [8-Word Actionable Title]\n\n**TL;DR:** [1-2 sentence summary.]\n\n---\n\n#### The Concept / Problem\n[1-2 sentences explaining the goal or issue.]\n\n#### Actionable Code / Commands\n[Any relevant code blocks or \"N/A\".]\n\n#### Key Takeaways & Caveats\n* [Bullet point 1]\n* [Bullet point 2]\n* [Bullet point 3]\n\n**Context Tags:** [#tag1 #tag2 #tag3]\n=== END TEMPLATE ===\n\nSummarize the following interaction EXACTLY matching the template structure.\n\n=== INTERACTION TO SUMMARIZE ===\n{TEXT}\n=== END INTERACTION ===\n\nSTRICT FORMATTED OUTPUT:\n###"
}
EOF
echo "Created default config at ~/.knick_knacks/os-config.json"
else
echo "Config file already exists, skipping creation."
fi

# 5. Write the Node.js CLI script
cat << 'EOF' > "$CLI_SCRIPT"
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { GoogleAuth } = require('google-auth-library');

const KNICK_DIR = path.join(os.homedir(), '.knick_knacks');
const CONFIG_PATH = path.join(KNICK_DIR, 'os-config.json');

// Helper to trigger macOS push notifications (with safe escaping)
function notify(message, title = "Knick Knackery") {
    try {
        // Escape backslashes first, then double quotes, to prevent osascript injection
        const safeMessage = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const safeTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        execSync(`osascript -e 'display notification "${safeMessage}" with title "${safeTitle}"'`);
    } catch (e) { console.error("Notification failed", e); }
}

// Show a native macOS dialog and return the user's input
function dialog(promptText, defaultValue = '') {
    try {
        const escaped = promptText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const defaultEscaped = defaultValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const result = execSync(
            `osascript -e 'set result to display dialog "${escaped}" default answer "${defaultEscaped}" with title "Knick Knackery" buttons {"Cancel", "OK"} default button "OK"' -e 'return text returned of result'`,
            { encoding: 'utf8' }
        ).trim();
        return result;
    } catch (e) {
        return null; // User pressed Cancel
    }
}

// Show a native macOS list picker and return the selection
function chooseFromList(items, promptText) {
    try {
        const escaped = promptText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const listItems = items.map(i => `"${i}"`).join(', ');
        const result = execSync(
            `osascript -e 'choose from list {${listItems}} with prompt "${escaped}" with title "Knick Knackery" default items {"${items[0]}"}'`,
            { encoding: 'utf8' }
        ).trim();
        if (result === 'false') return null; // User pressed Cancel
        return result;
    } catch (e) {
        return null;
    }
}

async function runConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        notify("Config file missing. Run the installer again.");
        return;
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

    // 1. Choose AI engine
    const engines = ['Local (Ollama)', 'Cloud (Anthropic API)', 'Cloud (Vertex AI)'];
    const engine = chooseFromList(engines, 'Select your AI engine:');
    if (!engine) return;
    config.engine = engine;

    // 2. Engine-specific settings
    if (engine === 'Local (Ollama)') {
        const model = dialog('Enter Ollama model name:', config.ollamaModel);
        if (model !== null) config.ollamaModel = model;

    } else if (engine === 'Cloud (Anthropic API)') {
        const models = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5', 'claude-sonnet-4-5'];
        const model = chooseFromList(models, 'Select Anthropic model:');
        if (model !== null) config.anthropicModel = model;

        const apiKey = dialog('Enter your Anthropic API key:', config.anthropicApiKey);
        if (apiKey !== null) config.anthropicApiKey = apiKey;

    } else if (engine === 'Cloud (Vertex AI)') {
        const models = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5', 'claude-sonnet-4-5', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
        const model = chooseFromList(models, 'Select Vertex AI model:');
        if (model !== null) config.vertexModel = model;

        const projectId = dialog('Enter your GCP Project ID:', config.vertexProjectId);
        if (projectId !== null) config.vertexProjectId = projectId;

        const region = dialog('Enter your GCP region (e.g., us-east5):', config.vertexRegion);
        if (region !== null) config.vertexRegion = region;

        const adcPath = dialog('Enter path to ADC credentials JSON:', config.vertexAdcPath);
        if (adcPath !== null) config.vertexAdcPath = adcPath;
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    notify('Settings saved successfully.');
}

async function main() {
    // Handle --config flag
    if (process.argv[2] === '--config') {
        await runConfig();
        return;
    }

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

# 6. Make the script executable
chmod +x "$CLI_SCRIPT"

# 7. Install Hammerspoon integration (recommended for global hotkeys)
HAMMERSPOON_DIR="$HOME/.hammerspoon"
HAMMERSPOON_INIT="$HAMMERSPOON_DIR/init.lua"

echo ""
echo "=========================================================="
echo "HAMMERSPOON INTEGRATION (Recommended)"
echo "=========================================================="

if command -v brew &> /dev/null; then
    if [ ! -d "/Applications/Hammerspoon.app" ] && [ ! -d "$HOME/Applications/Hammerspoon.app" ]; then
        read -p "Hammerspoon not found. Install via Homebrew? (y/n): " INSTALL_HS
        if [ "$INSTALL_HS" = "y" ] || [ "$INSTALL_HS" = "Y" ]; then
            echo "Installing Hammerspoon..."
            brew install --cask hammerspoon
        else
            echo "Skipping Hammerspoon installation."
        fi
    else
        echo "Hammerspoon is already installed."
    fi
else
    echo "Homebrew not found. To use Hammerspoon, install it manually from https://www.hammerspoon.org"
fi

# Write the Hammerspoon config snippet
mkdir -p "$HAMMERSPOON_DIR"

KNICK_KNACK_MARKER="-- [Knick Knackery]"
KNICK_KNACK_BLOCK=$(cat << LUAEOF

${KNICK_KNACK_MARKER} Start
-- Global hotkey: Cmd+Option+K triggers Knick Knackery on selected text
-- Automatically copies the selection, so the user only needs to highlight and press the hotkey
hs.hotkey.bind({"cmd", "alt"}, "K", function()
    -- Save the current clipboard so we can restore it after
    local oldClipboard = hs.pasteboard.getContents()

    -- Simulate Cmd+C to copy whatever is currently selected
    hs.eventtap.keyStroke({"cmd"}, "C")

    -- Wait for the clipboard to populate, then run the CLI
    hs.timer.doAfter(0.3, function()
        local task = hs.task.new("${NODE_PATH}", function(exitCode, stdOut, stdErr)
            -- Restore the original clipboard contents
            if oldClipboard then
                hs.pasteboard.setContents(oldClipboard)
            end
            if exitCode ~= 0 then
                hs.notify.new({title="Knick Knackery", informativeText="Error: " .. (stdErr or "unknown")}):send()
            end
        end, {"${HOME}/.knick_knacks/bin/knick-cli.js"})
        task:start()
    end)
end)

-- Global hotkey: Cmd+Option+Shift+K opens Knick Knackery settings
hs.hotkey.bind({"cmd", "alt", "shift"}, "K", function()
    local task = hs.task.new("${NODE_PATH}", function(exitCode, stdOut, stdErr)
        if exitCode ~= 0 then
            hs.notify.new({title="Knick Knackery", informativeText="Error: " .. (stdErr or "unknown")}):send()
        end
    end, {"${HOME}/.knick_knacks/bin/knick-cli.js", "--config"})
    task:start()
end)
${KNICK_KNACK_MARKER} End
LUAEOF
)

if [ -f "$HAMMERSPOON_INIT" ]; then
    if grep -q "$KNICK_KNACK_MARKER" "$HAMMERSPOON_INIT"; then
        # Remove the old block and replace it
        sed -i '' "/${KNICK_KNACK_MARKER} Start/,/${KNICK_KNACK_MARKER} End/d" "$HAMMERSPOON_INIT"
        echo "Updating existing Knick Knackery block in init.lua..."
    fi
    echo "$KNICK_KNACK_BLOCK" >> "$HAMMERSPOON_INIT"
    echo "Appended Knick Knackery hotkey to existing ~/.hammerspoon/init.lua"
else
    echo "$KNICK_KNACK_BLOCK" > "$HAMMERSPOON_INIT"
    echo "Created ~/.hammerspoon/init.lua with Knick Knackery hotkey"
fi

# Reload Hammerspoon config if it's running
if pgrep -x "Hammerspoon" > /dev/null 2>&1; then
    open -g "hammerspoon://reload"
    echo "Hammerspoon config reloaded."
else
    echo "NOTE: Start Hammerspoon for the global hotkey to take effect."
fi

echo ""
echo "=========================================================="
echo "Installation Complete!"
echo "=========================================================="
echo ""
echo "WHAT WAS INSTALLED:"
echo "  - CLI script:  ~/.knick_knacks/bin/knick-cli.js"
echo "  - Config file:  ~/.knick_knacks/os-config.json"
echo "  - Hammerspoon:  Cmd+Option+K (capture) and Cmd+Option+Shift+K (settings)"
echo ""
echo "HOW IT WORKS:"
echo "  1. Highlight any text in any application"
echo "  2. Press Cmd+Option+K"
echo "  3. The selected text is automatically copied, summarized, and saved to ~/.knick_knacks/"
echo "  4. Your original clipboard contents are restored afterwards"
echo ""
echo "CONFIGURATION:"
echo "  Press Cmd+Option+Shift+K from anywhere to open settings."
echo "  Or manually edit ~/.knick_knacks/os-config.json to change:"
echo "    - AI engine (Ollama, Anthropic API, or Vertex AI)"
echo "    - Model selection"
echo "    - API keys and cloud settings"
echo "    - Custom summarization prompt"
echo ""
echo "=========================================================="
echo "ALTERNATIVE: macOS Shortcuts (if you prefer not to use Hammerspoon)"
echo "=========================================================="
echo "1. Open the 'Shortcuts' app on your Mac."
echo "2. Click '+' to create a new shortcut."
echo "3. Search for 'Run Shell Script' and add it."
echo "4. In the script action:"
echo "   - Change 'Pass Input' to 'as arguments'"
echo "   - Paste this line:"
echo ""
echo "     ${NODE_PATH} ~/.knick_knacks/bin/knick-cli.js \"\$1\""
echo ""
echo "5. Click the info icon, enable 'Use as Quick Action' and 'Services Menu'."
echo "6. Click 'Add Keyboard Shortcut' and press your desired combo."
echo "=========================================================="
