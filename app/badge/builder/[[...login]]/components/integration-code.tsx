'use client';

import { Check, Clipboard } from 'lucide-react';
import { FC, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { LoginFormProps } from './login-form.types';
import { StepTitle } from './step-title';
import { useBadgeUrl } from '../hooks/useBadgeUrl';

export const IntegrationCode: FC<LoginFormProps> = ({ githubLogin, githubId }) => {
  const url = useBadgeUrl(githubLogin, githubId);

  const code = githubId ? `<img src="${url}" />` : '';
  // const code = githubId ? `![GitRanks Badge](${url})` : ""; // Markdown alternative

  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleCopy = async () => {
    if (!code) return;
    try {
      // Prefer modern API
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for older browsers
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
        document.execCommand('copy');
        textareaRef.current.setSelectionRange(0, 0); // unselect
      }
    } finally {
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <StepTitle>Step 3. Copy the Code to Your GitHub README</StepTitle>
      <Textarea
        ref={textareaRef}
        readOnly
        value={code}
        className="max-w-full break-all text-sm font-mono min-h-24"
        aria-label="Badge embed code"
      />
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          disabled={!code}
          aria-label="Copy badge code"
        >
          {copied ? <Check /> : <Clipboard />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
};
