# Local AI Chat Setup (Ollama)

This guide configures SafeFlow's local AI assistant without sending your data to cloud LLMs.

## Prerequisites

- Ollama installed: https://ollama.com/download
- SafeFlow running locally

## Setup steps

1. Start Ollama.
2. Pull a model in terminal:
   `ollama pull llama3.1:8b`
3. Open SafeFlow **Settings > AI Assistant**.
4. Set host URL to `http://127.0.0.1:11434`.
5. Choose model `llama3.1:8b`.
6. Click **Test**.
7. Click **Save AI Settings**.

## Optional settings

- Enable **Auto-categorize transactions** to classify imports automatically.

## Verify it works

1. Open the floating AI chat widget.
2. Ask: "Summarize my spending this month."
3. Confirm response arrives and no connection error is shown.

## Common issues

- **Connection error**: Ollama not running or wrong host.
- **Model missing**: Pull model again (`ollama pull ...`).
- **Slow response**: Use a smaller model or close other heavy apps.
