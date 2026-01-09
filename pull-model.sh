#!/bin/bash

# Start Ollama in the background
/bin/ollama serve &

# Wait for Ollama to start
echo "Waiting for Ollama to start..."
until ollama list >/dev/null 2>&1; do
  sleep 1
done

# Check if model already exists
if ollama list | grep -q "codellama"; then
  echo "Model codellama already exists, skipping pull."
else
  # Pull the default model with a limited number of retries
  echo "Pulling model: codellama"
  MAX_RETRIES=5
  RETRY_COUNT=0
  until ollama pull codellama || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Pull failed (attempt $RETRY_COUNT/$MAX_RETRIES), retrying in 5 seconds..."
    sleep 5
  done

  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "Failed to pull model after $MAX_RETRIES attempts. Starting server anyway."
  else
    echo "Model pulled successfully."
  fi
fi

# Keep the container running by waiting for the background process
wait $!
