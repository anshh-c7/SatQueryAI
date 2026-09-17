"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Loader2 } from "lucide-react";
import { FrontierPromptBox } from "@/components/home/FrontierPromptBox";
import { ImageWorkspace } from "@/components/results/ImageWorkspace";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { SideNavbar } from "@/components/layout/SideNavbar";
import { useAuth } from "@/components/auth/AuthProvider";
import { getConversation, saveAnalysis, saveChatMessage, type SavedImagePreview } from "@/lib/history";
import { createImagePreviewData } from "@/lib/imagePreview";
import { postAnalyze } from "@/lib/api/analyzeClient";
import { loadConversationImages, saveConversationImages } from "@/lib/promptDraft";
import { toast } from "@/store/useToastStore";
import type { AnalyzeFormValues, AnalyzeResponse } from "@/lib/types/analyze";

interface ConversationTurn {
  query: string;
  response: AnalyzeResponse;
  imagePreviews: SavedImagePreview[];
}

function buildTurns(rows: Awaited<ReturnType<typeof getConversation>>["data"]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  let pendingQuery: string | null = null;

  for (const row of rows) {
    if (row.role === "user") {
      pendingQuery = row.content;
      continue;
    }
    if (pendingQuery && row.response) {
      turns.push({
        query: pendingQuery,
        response: row.response,
        imagePreviews: row.response.image_previews ?? [],
      });
      pendingQuery = null;
    }
  }

  return turns;
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [conversationImages, setConversationImages] = useState<AnalyzeFormValues["images"]>([]);

  useEffect(() => {
    let active = true;
    void loadConversationImages(id).then((images) => {
      if (active) setConversationImages(images);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!refusal) return;
    const timeout = window.setTimeout(() => setRefusal(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [refusal]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getConversation(user.id, id).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        toast.error("Conversation unavailable", error.message);
      } else {
        setConversation(buildTurns(data));
      }
      setIsLoadingConversation(false);
    });
    return () => {
      active = false;
    };
  }, [id, user]);

  const handleSubmitForm = async (form: AnalyzeFormValues) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    setRefusal(null);

    const generatedPreviews = (await Promise.all(
      form.images.map(async (slot) => ({
        filename: slot.file.name,
        data: await createImagePreviewData(slot.file),
      })),
    )).filter((image): image is { filename: string; data: { preview: string; bounds: [number, number, number, number] | null } } => Boolean(image.data.preview)).map((image) => ({
      filename: image.filename,
      data_url: image.data.preview,
      bounds: image.data.bounds,
    }));

    try {
      const restoredImages = form.images.length > 0 || conversationImages.length > 0
        ? conversationImages
        : await loadConversationImages(id);
      const reusableImages = form.images.length > 0 ? form.images : restoredImages;
      if (reusableImages.length > 0) {
        setConversationImages(reusableImages);
        void saveConversationImages(id, reusableImages).catch(() => undefined);
      }
      const res = await postAnalyze({
        ...form,
        images: reusableImages,
        conversationId: id,
        conversationContext: conversation.slice(-6).map((turn) => ({
          query: turn.query,
          answer: turn.response.answer.slice(0, 3000),
        })),
      });
      if (!res.ok) {
        setRefusal(res.detail);
        setIsSubmitting(false);
        toast.error("Analysis failed", res.detail);
        return;
      }

      const nextTurn = { query: form.query, response: res.data, imagePreviews: generatedPreviews };
      setConversation((current) => [...current, nextTurn]);

      const chatSave = await saveChatMessage({
        userId: user.id,
        turnId: id,
        role: "user",
        content: form.query,
      });
      if (chatSave.error) {
        toast.error("Prompt was not saved", chatSave.error.message);
      }

      const analysisSave = await saveAnalysis(user.id, form.query, res.data);
      if (analysisSave.error) toast.error("Analysis history was not saved", analysisSave.error.message);

      const assistantSave = await saveChatMessage({
        userId: user.id,
        turnId: id,
        role: "assistant",
        content: res.data.answer,
        response: { ...res.data, image_previews: generatedPreviews },
      });
      if (assistantSave.error) toast.error("Model response was not saved", assistantSave.error.message);
      setHistoryRefreshKey((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The analysis could not be completed.";
      setRefusal(message);
      setIsSubmitting(false);
      toast.error("Analysis failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const workspaceTurn = [...conversation].reverse().find((turn) => turn.imagePreviews.length > 0);
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#FAF6F0]/65 text-primary transition-colors duration-300 dark:bg-[#0F0E0C]/75 dark:text-[#F3EEE7]">
      <SideNavbar
        refreshKey={historyRefreshKey}
        onNewChat={() => router.push("/")}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[#FAF6F0]/85 via-[#F3E5D0]/80 to-[#EADCC9]/85 backdrop-blur-[24px] dark:hidden" />
      {sidebarCollapsed && (
        <header className="relative z-20 flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1917] text-white"><Globe className="h-4 w-4" /></span>
            <span className="font-serif text-xl font-medium tracking-wide">SatQuery <em className="text-accent">AI</em></span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-mono text-secondary hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> New Query</Link>
        </header>
      )}

      <main className={`relative z-10 flex min-h-[calc(100vh-2rem)] flex-col px-4 py-6 transition-[margin] duration-300 ease-apple ${sidebarCollapsed ? "lg:ml-0" : "lg:ml-72"}`}>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col">
          <div className="mb-4 flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-secondary">Conversation</p>
              <h1 className="font-serif text-2xl text-primary">Continue your analysis</h1>
            </div>
            <Link href="/" className="hidden items-center gap-1.5 rounded-full border border-stone-300/70 px-3 py-1.5 text-xs text-secondary transition hover:text-primary sm:flex dark:border-white/10"><ArrowLeft className="h-3.5 w-3.5" /> New Query</Link>
          </div>

          {isLoadingConversation ? (
            <div className="flex flex-1 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>
          ) : (
            <div className={`grid w-full items-start gap-5 ${workspaceTurn ? "lg:grid-cols-2" : "mx-auto w-full max-w-3xl"}`}>
              {workspaceTurn && <ImageWorkspace images={workspaceTurn.imagePreviews} evidence={workspaceTurn.response.visual_evidence} data={workspaceTurn.response} />}
              <section className="flex min-w-0 flex-col rounded-2xl border border-stone-300/70 bg-white/35 p-3 shadow-subtle dark:border-white/10 dark:bg-[#171512]/55">
                <div className="space-y-4 pr-1">
                  {conversation.map((turn, index) => (
                    <article key={`${turn.query}-${index}`} className="space-y-3">
                      <Bubble align="end"><BubbleContent>{turn.query}</BubbleContent></Bubble>
                      <ResultsPanel data={turn.response} imagePreviews={turn.imagePreviews} showImages={false} dense conversation={conversation.map((item) => ({ query: item.query, response: item.response, imagePreviews: item.imagePreviews }))} />
                    </article>
                  ))}
                  {refusal && <p className="rounded-xl border border-rose-300/40 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">{refusal}</p>}
                </div>
                <div className="shrink-0 border-t border-stone-300/50 pt-3 dark:border-white/10">
                  <FrontierPromptBox value={prompt} onChange={setPrompt} onSubmitPrompt={handleSubmitForm} isSubmitting={isSubmitting} compact />
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
