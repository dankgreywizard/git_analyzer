/**
 * Copyright 2026 Robert Wheeler(dankgreywizard)
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
import { useState, useEffect } from "react";

/**
 * Hook for managing the list of available AI models and the currently selected model.
 * @param currentTab The active application tab.
 * @returns An object containing models state and selection functions.
 */
export function useModels(currentTab: string) {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('codellama:latest');

  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await fetch('/api/ollama/models');
        const data = await res.json();
        if (res.ok && Array.isArray(data?.models)) {
          setModels(data.models);
          // keep selected if still available, else default to codellama or first
          if (data.models.includes(selectedModel)) return;
          if (data.models.includes('codellama:latest')) setSelectedModel('codellama:latest');
          else if (data.models.length > 0) setSelectedModel(data.models[0]);
        }
      } catch (e) {
        // ignore, keep defaults
      }
    };
    if (currentTab === 'git') loadModels();
  }, [currentTab, selectedModel]);

  return { models, setModels, selectedModel, setSelectedModel };
}
