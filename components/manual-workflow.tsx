'use client';
import { useState } from 'react';
import type { AnalysisInput, AnalysisResponse } from '@/lib/contracts';
import { createManualPrompt, parseManualProposal } from '@/lib/manual';

export function ManualWorkflow({
  input,
  busy,
  proposal,
  setProposal,
  onResult,
  onError,
  setBusy,
}: {
  input: AnalysisInput;
  busy: boolean;
  proposal: string;
  setProposal: (value: string) => void;
  onResult: (
    result: AnalysisResponse,
    inputSnapshot: string,
    proposalSnapshot: string,
  ) => void;
  onError: (message: string) => void;
  setBusy: (value: boolean) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const current = JSON.stringify(input);
  function prepare() {
    try {
      setPrompt(createManualPrompt(input));
      setPromptInput(current);
      setCopyStatus('');
      onError('');
    } catch {
      onError(
        'Add a valid source path, TypeScript source, Vitest test, and failure output first. Respect the displayed size limits.',
      );
    }
  }
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyStatus('Prompt copied. Paste it into your chosen chat tool.');
    } catch {
      setCopyStatus('Select the prompt below and copy it manually.');
    }
  }
  async function review() {
    let parsed: unknown;
    try {
      createManualPrompt(input);
      parsed = parseManualProposal(proposal);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'Check your inputs and proposal.',
      );
      return;
    }
    onError('');
    setBusy(true);
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, proposal: parsed }),
      });
      const data = await response.json();
      if (!response.ok) {
        onError(data.error || 'The proposal could not be validated.');
        return;
      }
      onResult(data, current, proposal);
    } catch {
      onError('Could not reach the review service. Your input is still here.');
    } finally {
      setBusy(false);
    }
  }
  const stalePrompt = !!prompt && promptInput !== current;
  return (
    <details className="manual-workflow" open>
      <summary>
        Use without an API key <span>MANUAL REVIEW</span>
      </summary>
      <div className="manual-body">
        <p>
          Use your own chat tool for the diagnosis. FailFix checks the proposal
          and builds the downloadable patch. No model call is made by this
          review workflow.
        </p>
        <ol>
          <li>Prepare a prompt from the inputs above.</li>
          <li>Paste it into your chat tool, then copy its JSON response.</li>
          <li>Paste the response below and validate the proposal.</li>
        </ol>
        <button className="secondary-button" onClick={prepare} disabled={busy}>
          Prepare debugging prompt
        </button>
        {prompt && (
          <div className="manual-prompt">
            <div>
              <label htmlFor="manual-prompt">Debugging prompt</label>
              <button
                className="text-button"
                onClick={copyPrompt}
                disabled={stalePrompt || busy}
              >
                Copy prompt
              </button>
            </div>
            {stalePrompt && (
              <p className="manual-warning">
                Inputs changed. Prepare a fresh prompt before copying.
              </p>
            )}
            <textarea
              id="manual-prompt"
              value={prompt}
              readOnly
              rows={5}
              onFocus={(event) => event.currentTarget.select()}
              spellCheck={false}
            />
            <p role="status">{copyStatus}</p>
          </div>
        )}
        <label htmlFor="manual-proposal" className="manual-label">
          Proposal JSON <span>Up to 48 KiB</span>
        </label>
        <textarea
          id="manual-proposal"
          value={proposal}
          onChange={(event) => setProposal(event.target.value)}
          rows={5}
          spellCheck={false}
          placeholder={
            '{ "status": "proposed_fix", "summary": "…", "evidence": […], "edits": […], "regressionTest": "…", "questions": [], "assumptions": [] }'
          }
        />
        <button
          className="secondary-button"
          onClick={review}
          disabled={busy || !proposal.trim()}
        >
          {busy ? 'Working…' : 'Validate proposal'}
        </button>
        <p className="manual-footnote">
          Only send nonconfidential code to a chat tool. Validation checks
          structure and patch applicability, not whether the diagnosis is
          correct.
        </p>
      </div>
    </details>
  );
}
