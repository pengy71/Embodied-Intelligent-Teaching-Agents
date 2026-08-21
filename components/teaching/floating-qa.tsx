'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQA } from '@/lib/teaching/use-qa';
import { trackLearningEvent } from '@/lib/teaching/track-event';
import { Bot, User, Send, MessageSquare, X, Loader2, FileText } from 'lucide-react';

interface FloatingMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    title: string;
    chapter: string;
    pageReference?: string;
  }>;
}

export function FloatingQA() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<FloatingMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: '你好！学习过程中有任何疑问都可以随时问我。',
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isLoading, askQuestion } = useQA();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: FloatingMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    const question = input;
    setInput('');

    const result = await askQuestion(question);
    if (result) {
      const sourcePointId = result.sources?.[0]?.pointId ?? '';
      if (sourcePointId) {
        void trackLearningEvent({
          eventType: 'qa',
          knowledgeNodeId: sourcePointId,
          score: null,
          durationMinutes: 5,
          payload: { question },
        });
      }
      const aiMsg: FloatingMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: result.answer,
        sources: result.sources?.map((s) => ({
          title: s.title,
          chapter: s.chapter,
          pageReference: s.pageReference,
        })),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
          aria-label="打开答疑"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">AI 答疑助手</span>
              <span className="text-xs text-muted-foreground">· 学习中随时提问</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={'flex gap-2 ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="h-7 w-7 shrink-0 bg-primary/10">
                    <AvatarFallback className="text-primary">
                      <Bot className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={
                    'max-w-[80%] rounded-lg p-2.5 text-sm ' +
                    (msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')
                  }
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
                      <p className="text-xs font-medium text-muted-foreground">教材溯源</p>
                      {msg.sources.map((source, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          <FileText className="h-3 w-3 shrink-0 text-blue-500" />
                          <span className="truncate">{source.title}</span>
                          <span className="shrink-0 text-muted-foreground">·</span>
                          <span className="truncate text-muted-foreground">{source.chapter}</span>
                          {source.pageReference ? (
                            <span className="shrink-0 text-muted-foreground">
                              {source.pageReference}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <Avatar className="h-7 w-7 shrink-0 bg-primary">
                    <AvatarFallback className="text-primary-foreground">
                      <User className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start gap-2">
                <Avatar className="h-7 w-7 shrink-0 bg-primary/10">
                  <AvatarFallback className="text-primary">
                    <Bot className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-lg bg-muted p-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input */}
          <div className="flex shrink-0 gap-2 border-t p-2.5">
            <Textarea
              placeholder="输入问题..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="max-h-[100px] min-h-[40px] flex-1 text-sm"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
