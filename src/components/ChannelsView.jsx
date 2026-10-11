"use client";
import { useState, useEffect, useRef } from "react";
import { DEFAULT_CHANNELS, createDefaultGlobalSettings } from "../lib/narrativeModel";
import { EFFECT_LIST, applyEffect } from "../lib/effects";
import {
  TRANSITION_LIST,
  transitionOf,
  MIN_TRANSITION_DURATION,
  MAX_TRANSITION_DURATION,
} from "../lib/transitions";
import {
  CAPTION_STYLE_LIST,
  CAPTION_FONTS,
  CAPTION_PRESET_COLORS,
  CAPTION_ANIMATIONS,
  captionFontFamily,
  drawCaption,
} from "../lib/captions";
import { drawScene, sceneCanvas } from "./panels/sampleScene";
import EffectTile from "./panels/EffectTile";
import TransitionTile from "./panels/TransitionTile";
import CaptionStyleTile from "./panels/CaptionStyleTile";
import { showConfirm, showPrompt } from "./Dialog";
import Dropzone from "./Dropzone";
import {
  Tv,
  Plus,
  Trash2,
  Check,
  Image as ImageIcon,
  UserCheck,
  Film,
  ArrowLeft,
  Sliders,
  Type,
  Layers,
  Wand2,
  Play,
  Pause,
  FileText,
  Clapperboard,
  Shuffle,
} from "lucide-react";

export default function ChannelsView({
  globalSettings,
  onSaveGlobalSettings,
  onBack,
  uiLang = "en",
  onToggleLang,
  embedded = false,
}) {
  const isAr = uiLang === "ar";
  const [draft, setDraft] = useState(() => {
    const base = globalSettings || createDefaultGlobalSettings();
    return {
      ...base,
      channels:
        Array.isArray(base.channels) && base.channels.length
          ? base.channels
          : DEFAULT_CHANNELS,
      defaultChannelId: base.defaultChannelId || DEFAULT_CHANNELS[0].id,
    };
  });

  const [selectedChannelId, setSelectedChannelId] = useState(
    () => draft.defaultChannelId || draft.channels?.[0]?.id || "channel_default_1"
  );
  const [activeTab, setActiveTab] = useState("identity"); // "identity" | "references" | "editor"
  const [editorSubTab, setEditorSubTab] = useState("effects"); // "effects" | "transitions" | "motion" | "captions"
  const [filterCat, setFilterCat] = useState("all"); // "all" | "grade" | "fx"
  const [savedBanner, setSavedBanner] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(true);

  const activeChannel =
    draft.channels.find((c) => c.id === selectedChannelId) || draft.channels[0] || null;

  const defaultMixPool = ["fade", "wipeleft", "wiperight", "slideleft", "circleopen", "zoomin"];

  const defaultEditorCfg = {
    transitionType: "fade",
    transitionMixPool: defaultMixPool,
    transitionDuration: 0.4,
    motionMode: "alternate",
    motionAmount: 0.08,
    effectId: "cinema",
    effectIntensity: 0.5,
    fadeIn: 0.5,
    fadeOut: 0.6,
    captionsOn: true,
    captionStyle: "classic",
    captionFont: "montserrat",
    captionColor: "#FFFFFF",
    captionAnimation: "pop",
    captionSize: "md",
    captionPosition: 0,
  };

  const edCfg = {
    ...defaultEditorCfg,
    ...(activeChannel?.editorConfig || {}),
  };

  const mixPool = Array.isArray(edCfg.transitionMixPool) && edCfg.transitionMixPool.length
    ? edCfg.transitionMixPool
    : defaultMixPool;

  const persistDraft = (nextDraft) => {
    setDraft(nextDraft);
    onSaveGlobalSettings(nextDraft);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 1800);
  };

  const updateActiveChannel = (patch) => {
    if (!activeChannel) return;
    const nextDraft = {
      ...draft,
      channels: draft.channels.map((c) =>
        c.id === activeChannel.id ? { ...c, ...patch } : c
      ),
    };
    persistDraft(nextDraft);
  };

  const updateEditorConfig = (patch) => {
    if (!activeChannel) return;
    updateActiveChannel({
      editorConfig: {
        ...edCfg,
        ...patch,
      },
    });
  };

  const toggleMixTransitionItem = (trId) => {
    const exists = mixPool.includes(trId);
    let nextPool = exists ? mixPool.filter((x) => x !== trId) : [...mixPool, trId];
    if (nextPool.length === 0) nextPool = [trId];
    updateEditorConfig({
      transitionType: "mix",
      transitionMixPool: nextPool,
    });
  };

  const handleAddChannel = async () => {
    const name = await showPrompt(
      isAr ? "أدخل اسم القناة الجديدة:" : "Enter new Channel Name:",
      {
        title: isAr ? "إضافة قناة جديدة" : "Add New Channel",
        defaultValue: isAr ? "قناتي الجديدة" : "My New Channel",
        okText: isAr ? "إنشاء القناة" : "Create Channel",
      }
    );
    if (!name || !name.trim()) return;
    const newCh = {
      id: `channel_${Date.now()}`,
      name: name.trim(),
      niche: "",
      aspectRatio: "16:9",
      voiceId: "onyx",
      promptRules:
        "SCRIPT RULES: Engaging narrative hook in the first 15 seconds, structured acts, conversational flow.\nSCENE & IMAGE RULES: Consistent visual art style, lighting, color palette, and character design across every standalone prompt.\nTHUMBNAIL RULES: High-contrast central subject, dramatic rim lighting, clear curiosity gap, 2-4 word bold text overlay.",
      additionalScriptRules:
        "Use active storytelling, strong curiosity transitions between paragraphs, and natural spoken rhythm.",
      additionalSceneRules:
        "Vary camera framing naturally between wide establishing shots, medium narrative shots, and expressive close-ups.",
      narrationStyle: "",
      scriptStyle: "",
      motionStyle: "",
      visualStyleRules: "",
      thumbnailStyleRules: "",
      avatarCharacterDesc: "",
      styleReferenceImages: [],
      thumbnailReferenceImages: [],
      avatarImages: [],
      editorConfig: { ...defaultEditorCfg },
    };
    const nextDraft = {
      ...draft,
      channels: [...draft.channels, newCh],
      defaultChannelId: newCh.id,
    };
    setSelectedChannelId(newCh.id);
    setActiveTab("identity");
    persistDraft(nextDraft);
  };

  const handleDeleteChannel = async (chId, e) => {
    if (e) e.stopPropagation();
    if (draft.channels.length <= 1) return;
    const target = draft.channels.find((c) => c.id === chId);
    const ok = await showConfirm(
      isAr
        ? `هل أنت متأكد من حذف قناة "${target?.name || ""}"؟`
        : `Delete channel "${target?.name || ""}"?`,
      { title: isAr ? "حذف القناة" : "Delete Channel", danger: true }
    );
    if (!ok) return;
    const remaining = draft.channels.filter((c) => c.id !== chId);
    const nextSel = remaining[0]?.id || "";
    const nextDraft = {
      ...draft,
      channels: remaining,
      defaultChannelId:
        draft.defaultChannelId === chId ? nextSel : draft.defaultChannelId,
    };
    setSelectedChannelId(nextSel);
    persistDraft(nextDraft);
  };

  const handleSetDefaultChannel = (chId, e) => {
    if (e) e.stopPropagation();
    const nextDraft = {
      ...draft,
      defaultChannelId: chId,
    };
    setSelectedChannelId(chId);
    persistDraft(nextDraft);
  };

  const handleUploadChannelImages = (field, files) => {
    const fileArr = Array.from(files || []).slice(0, 6);
    if (!fileArr.length || !activeChannel) return;
    Promise.all(
      fileArr.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: file.name,
                dataUrl: String(reader.result || ""),
                mimeType: file.type || "image/jpeg",
              });
            };
            reader.readAsDataURL(file);
          })
      )
    ).then((uploaded) => {
      const existing = Array.isArray(activeChannel[field]) ? activeChannel[field] : [];
      updateActiveChannel({
        [field]: [...existing, ...uploaded].slice(0, 8),
      });
    });
  };

  const handleRemoveChannelImage = (field, imgId) => {
    if (!activeChannel) return;
    const existing = Array.isArray(activeChannel[field]) ? activeChannel[field] : [];
    updateActiveChannel({
      [field]: existing.filter((img) => img.id !== imgId),
    });
  };

  // --- Real-Time Live Canvas Preview for Video Editor Presets ---
  const liveCanvasRef = useRef(null);
  const loadedPreviewImgRef = useRef(null);

  const previewImgUrl =
    activeChannel?.styleReferenceImages?.[0]?.dataUrl ||
    activeChannel?.avatarImages?.[0]?.dataUrl ||
    activeChannel?.thumbnailReferenceImages?.[0]?.dataUrl ||
    null;

  useEffect(() => {
    if (!previewImgUrl) {
      loadedPreviewImgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      loadedPreviewImgRef.current = img;
    };
    img.src = previewImgUrl;
  }, [previewImgUrl]);

  useEffect(() => {
    if (activeTab !== "editor") return;
    let rafId = 0;
    const t0 = performance.now();

    const renderFrame = (now) => {
      const cv = liveCanvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      const W = cv.width;
      const H = cv.height;
      const elapsed = previewPlaying ? (now - t0) / 1000 : 1.5;

      // Cycle 3.6 seconds per simulated clip
      const cycleDur = 3.6;
      const cycleIndex = Math.floor(elapsed / cycleDur);
      const cyclePos = elapsed % cycleDur;
      const transDur = Math.max(0.15, Math.min(1.5, Number(edCfg.transitionDuration) || 0.4));

      // Resolve active transition (supports "mix" by cycling through the user's selected mix pool)
      const activeTrId =
        edCfg.transitionType === "mix"
          ? mixPool[cycleIndex % mixPool.length] || "fade"
          : edCfg.transitionType || "fade";

      const inTransition = activeTrId && activeTrId !== "cut" && cyclePos < transDur;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0a0a0c";
      ctx.fillRect(0, 0, W, H);

      const amt = Number(edCfg.motionAmount) || 0.08;
      const prog = cyclePos / cycleDur;
      let scale = 1;
      if (edCfg.motionMode === "zoomin") {
        scale = 1 + amt * prog;
      } else if (edCfg.motionMode === "zoomout") {
        scale = 1 + amt * (1 - prog);
      } else if (edCfg.motionMode === "alternate") {
        const isEven = cycleIndex % 2 === 0;
        scale = isEven ? 1 + amt * prog : 1 + amt * (1 - prog);
      }

      if (inTransition) {
        const p = Math.max(0, Math.min(1, cyclePos / transDur));
        const fromCv = sceneCanvas("dark", 240);
        const toCv = sceneCanvas("silver", 240);
        if (fromCv && toCv) {
          transitionOf(activeTrId).canvas(ctx, fromCv, toCv, p, W, H, 1, 1);
        }
      } else {
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.scale(scale, scale);
        ctx.translate(-W / 2, -H / 2);

        if (loadedPreviewImgRef.current) {
          const img = loadedPreviewImgRef.current;
          const imgRatio = img.width / img.height;
          const cvRatio = W / H;
          let dw = W,
            dh = H,
            dx = 0,
            dy = 0;
          if (imgRatio > cvRatio) {
            dh = H;
            dw = H * imgRatio;
            dx = (W - dw) / 2;
          } else {
            dw = W;
            dh = W / imgRatio;
            dy = (H - dh) / 2;
          }
          ctx.drawImage(img, dx, dy, dw, dh);
        } else {
          drawScene(ctx, W, H, "dark");
        }
        ctx.restore();
      }

      if (edCfg.effectId && edCfg.effectId !== "none") {
        applyEffect(
          ctx,
          edCfg.effectId,
          Number(edCfg.effectIntensity) ?? 0.5,
          W,
          H,
          elapsed
        );
      }

      if (edCfg.captionsOn !== false) {
        const sizeMap = { sm: 0.048, md: 0.064, lg: 0.082 };
        const fontPx = Math.round(H * (sizeMap[edCfg.captionSize || "md"] || 0.064));
        const posPctVal = Number(edCfg.captionPosition) || 0;
        const sampleText = isAr
          ? `معاينة ستايل الكتابة · ${activeChannel?.name || "القناة"}`
          : `LIVE CAPTION PREVIEW · ${(activeChannel?.name || "CHANNEL").toUpperCase()}`;

        drawCaption(
          ctx,
          sampleText,
          W,
          H,
          edCfg.captionStyle || "classic",
          fontPx,
          1.18,
          captionFontFamily(edCfg.captionFont || "montserrat"),
          posPctVal,
          {
            customColor: edCfg.captionColor || "#FFFFFF",
            animation: edCfg.captionAnimation || "pop",
            animProgress: Math.min(1, (cyclePos % 1.8) / 0.35),
          }
        );
      }

      if (previewPlaying) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [
    activeTab,
    edCfg.effectId,
    edCfg.effectIntensity,
    edCfg.transitionType,
    edCfg.transitionDuration,
    edCfg.motionMode,
    edCfg.motionAmount,
    edCfg.captionsOn,
    edCfg.captionStyle,
    edCfg.captionFont,
    edCfg.captionColor,
    edCfg.captionAnimation,
    edCfg.captionSize,
    edCfg.captionPosition,
    mixPool,
    previewPlaying,
    activeChannel?.name,
    isAr,
  ]);

  const displayedEffects = EFFECT_LIST.filter((fx) => {
    if (filterCat === "all") return true;
    if (filterCat === "grade") return fx.group === "grade" || fx.id === "none";
    if (filterCat === "fx") return fx.group !== "grade" || fx.id === "none";
    return true;
  });

  return (
    <div
      className={
        embedded
          ? "w-full bg-[#0b0b0d] text-zinc-100 rounded-2xl border border-zinc-800/80 p-5"
          : "min-h-screen bg-[#0b0b0d] text-zinc-100 overflow-y-auto"
      }
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Minimalist Architectural Header */}
      <header
        className={`${
          embedded
            ? "pb-5 mb-6 border-b border-zinc-800/80"
            : "sticky top-0 z-20 border-b border-zinc-800/80 bg-[#0b0b0d]/95 backdrop-blur-md px-8 py-4"
        } flex flex-wrap items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isAr ? "رجوع" : "Back"}</span>
            </button>
          )}
          <div>
            <h1 className="text-base font-semibold text-zinc-100 tracking-tight">
              {isAr ? "القنوات والهوية البصرية" : "Channels & Styles"}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isAr
                ? "إدارة برومبت القناة، التعليمات الإضافية، الصور المرجعية، وإعدادات المونتاج التلقائية"
                : "Manage channel prompts, script & scene rules, visual references, and automatic editor presets"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {savedBanner && (
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 px-2.5 py-1">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? "تم الحفظ" : "Saved"}</span>
            </span>
          )}
          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
            >
              {isAr ? "EN" : "عربي"}
            </button>
          )}
          <button
            type="button"
            onClick={handleAddChannel}
            className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? "إضافة قناة جديدة" : "New Channel"}</span>
          </button>
        </div>
      </header>

      <div className={embedded ? "space-y-6" : "max-w-[1400px] mx-auto px-8 py-6 space-y-6"}>
        {/* Main Studio Workspace Split: Left Directory (3 cols) + Right Inspector (9 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Clean Channel Directory List */}
          <div className="lg:col-span-3 bg-[#121215] border border-zinc-800/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-zinc-400">
                {isAr ? "قائمة القنوات" : "Channels"} ({draft.channels.length})
              </span>
              <button
                type="button"
                onClick={handleAddChannel}
                className="text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? "جديد" : "Add"}</span>
              </button>
            </div>

            <div className="space-y-1">
              {draft.channels.map((ch) => {
                const isSelected = ch.id === activeChannel?.id;
                const isDefault = ch.id === draft.defaultChannelId;
                const avatarThumb = ch.avatarImages?.[0]?.dataUrl;
                const styleThumb = ch.styleReferenceImages?.[0]?.dataUrl;

                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChannelId(ch.id)}
                    className={`group flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-zinc-800/90 text-zinc-100"
                        : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center">
                        {avatarThumb || styleThumb ? (
                          <img
                            src={avatarThumb || styleThumb}
                            alt={ch.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Tv className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate text-zinc-100">
                            {ch.name}
                          </span>
                          {isDefault && (
                            <span className="text-[10px] text-zinc-400 font-normal">
                              · {isAr ? "افتراضية" : "Default"}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {ch.niche || (isAr ? "عام" : "General")} · {ch.aspectRatio || "16:9"}
                        </div>
                      </div>
                    </div>

                    {draft.channels.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteChannel(ch.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-all"
                        title={isAr ? "حذف القناة" : "Delete channel"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Active Channel Inspector */}
          {activeChannel && (
            <div className="lg:col-span-9 bg-[#121215] border border-zinc-800/80 rounded-xl overflow-hidden">
              {/* Channel Top Summary Bar + Segmented Tabs */}
              <div className="px-6 py-4 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-semibold text-zinc-100">
                        {activeChannel.name}
                      </h2>
                      <span className="text-xs text-zinc-500 font-mono">
                        {activeChannel.aspectRatio || "16:9"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {activeChannel.niche || (isAr ? "لم يتم تحديد النيتش" : "No niche specified")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {draft.defaultChannelId !== activeChannel.id && (
                    <button
                      type="button"
                      onClick={(e) => handleSetDefaultChannel(activeChannel.id, e)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
                    >
                      {isAr ? "تعيين كافتراضية" : "Set as Default"}
                    </button>
                  )}

                  {/* Clean Segmented Control */}
                  <div className="flex items-center p-1 rounded-lg bg-[#0b0b0d] border border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setActiveTab("identity")}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeTab === "identity"
                          ? "bg-zinc-800 text-zinc-100 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {isAr ? "1. الهوية والبرومبت" : "1. Prompts & Rules"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("references")}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeTab === "references"
                          ? "bg-zinc-800 text-zinc-100 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {isAr ? "2. الصور المرجعية" : "2. Reference Images"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("editor")}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeTab === "editor"
                          ? "bg-zinc-800 text-zinc-100 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {isAr ? "3. إعدادات المحرر" : "3. Video Editor Presets"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* ==============================================================
                    TAB 1: CHANNEL IDENTITY, MASTER PROMPT, ADDITIONAL SCRIPT & SCENE
                    ============================================================== */}
                {activeTab === "identity" && (
                  <div className="space-y-6">
                    {/* Top Row: Name, Niche, Aspect Ratio */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                          {isAr ? "اسم القناة" : "Channel Name"}
                        </label>
                        <input
                          type="text"
                          value={activeChannel.name || ""}
                          onChange={(e) => updateActiveChannel({ name: e.target.value })}
                          placeholder="e.g., Kurzgesagt Style Docs"
                          className="w-full rounded-lg bg-[#0b0b0d] border border-zinc-800 px-3.5 py-2 text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                          {isAr ? "النيتش (Niche)" : "Channel Niche"}
                        </label>
                        <input
                          type="text"
                          value={activeChannel.niche || ""}
                          onChange={(e) => updateActiveChannel({ niche: e.target.value })}
                          placeholder="e.g., History, Science, Mystery..."
                          className="w-full rounded-lg bg-[#0b0b0d] border border-zinc-800 px-3.5 py-2 text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                          {isAr ? "مقاس الفيديو (Aspect Ratio)" : "Video Aspect Ratio"}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => updateActiveChannel({ aspectRatio: "16:9" })}
                            className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                              (activeChannel.aspectRatio || "16:9") === "16:9"
                                ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                                : "border-zinc-800 bg-[#0b0b0d] text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            16:9 YouTube
                          </button>
                          <button
                            type="button"
                            onClick={() => updateActiveChannel({ aspectRatio: "9:16" })}
                            className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                              activeChannel.aspectRatio === "9:16"
                                ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                                : "border-zinc-800 bg-[#0b0b0d] text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            9:16 Shorts
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Master Channel Prompt Box */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-zinc-300">
                          {isAr
                            ? "البرومبت الأساسي للقناة (طريقة السكريبت + ستايل توليد الصور + المشاهد)"
                            : "Master Channel Prompt (Script Style + Visual Generation + Scene Rules)"}
                        </label>
                        <span className="text-[11px] text-zinc-500">
                          {isAr ? "يُطبّق تلقائياً في كل المراحل" : "Auto-applied across all stages"}
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={activeChannel.promptRules || ""}
                        onChange={(e) =>
                          updateActiveChannel({
                            promptRules: e.target.value,
                            visualStyleRules: e.target.value,
                          })
                        }
                        placeholder="Define your channel's core narrative voice, visual art style, lighting, color palette, and character rules..."
                        className="w-full rounded-lg bg-[#0b0b0d] border border-zinc-800 p-3.5 text-xs text-zinc-200 leading-relaxed focus:border-zinc-600 focus:outline-none"
                      />
                    </div>

                    {/* Additional Script & Additional Scene Side-by-Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-1.5">
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            {isAr
                              ? "تعليمات إضافية للسكريبت (Additional Script)"
                              : "Additional Script Instructions"}
                          </span>
                        </label>
                        <textarea
                          rows={4}
                          value={activeChannel.additionalScriptRules || ""}
                          onChange={(e) =>
                            updateActiveChannel({ additionalScriptRules: e.target.value })
                          }
                          placeholder={
                            isAr
                              ? "مثال: ابدأ دائماً بسؤال صادم، استخدم جمل قصيرة وسريعة، تجنب المقدمات الطويلة..."
                              : "e.g., Always open with a paradoxical question, keep sentences under 18 words, use dramatic pauses..."
                          }
                          className="w-full rounded-lg bg-[#0b0b0d] border border-zinc-800 p-3 text-xs text-zinc-200 leading-relaxed focus:border-zinc-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-1.5">
                          <Clapperboard className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            {isAr
                              ? "تعليمات إضافية للمشاهد والصور (Additional Scene)"
                              : "Additional Scene & Image Prompt Instructions"}
                          </span>
                        </label>
                        <textarea
                          rows={4}
                          value={activeChannel.additionalSceneRules || ""}
                          onChange={(e) =>
                            updateActiveChannel({ additionalSceneRules: e.target.value })
                          }
                          placeholder={
                            isAr
                              ? "مثال: نوع بين اللقطات القريبة والبعيدة، ركز على تعابير الوجه والإضاءة الدرامية في كل مشهد..."
                              : "e.g., Alternate between extreme wide establishing shots and expressive close-ups, include volumetric fog..."
                          }
                          className="w-full rounded-lg bg-[#0b0b0d] border border-zinc-800 p-3 text-xs text-zinc-200 leading-relaxed focus:border-zinc-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Avatar & Thumbnail Rules */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                          {isAr
                            ? "وصف شخصية / أفاتار القناة الثابت (اختياري)"
                            : "Channel Avatar / Character Description (Optional)"}
                        </label>
                        <textarea
                          rows={2}
                          value={activeChannel.avatarCharacterDesc || ""}
                          onChange={(e) =>
                            updateActiveChannel({ avatarCharacterDesc: e.target.value })
                          }
                          placeholder="e.g., Faceless glowing silhouette wearing a dark trench coat and round glasses..."
                          className="w-full rounded-lg bg-[#0b0b0d] border border-zinc-800 p-3 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                          {isAr
                            ? "قواعد الصورة المصغرة (Thumbnail Style Rules)"
                            : "Thumbnail Style Rules (For Stage 10 SEO)"}
                        </label>
                        <textarea
                          rows={2}
                          value={activeChannel.thumbnailStyleRules || ""}
                          onChange={(e) =>
                            updateActiveChannel({ thumbnailStyleRules: e.target.value })
                          }
                          placeholder="e.g., High-contrast central subject, red/cyan rim lighting, 3-word bold yellow hook text..."
                          className="w-full rounded-lg bg-[#0b0b0d] border border-zinc-800 p-3 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ==============================================================
                    TAB 2: VISUAL STYLE, THUMBNAIL & AVATAR REFERENCE IMAGES
                    ============================================================== */}
                {activeTab === "references" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* 1. Image Style References */}
                    <div className="rounded-xl bg-[#0b0b0d] border border-zinc-800 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                          {isAr ? "مرجع ستايل الصور" : "Scene Style References"}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {(activeChannel.styleReferenceImages || []).length}/8
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        {isAr
                          ? "ارفع صوراً تمثل ستايل الرسم والإضاءة والألوان المطلوب في مشاهد القناة."
                          : "Upload sample images representing the art style, lighting, and color grading for scenes."}
                      </p>
                      <Dropzone
                        compact
                        multiple
                        accept="image/*"
                        onFiles={(files) =>
                          handleUploadChannelImages("styleReferenceImages", files)
                        }
                        icon="+"
                        title={isAr ? "رفع صور الستايل" : "Upload Style Images"}
                        filled={false}
                      />
                      {(activeChannel.styleReferenceImages || []).length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {activeChannel.styleReferenceImages.map((img) => (
                            <div
                              key={img.id}
                              className="relative group rounded-lg overflow-hidden border border-zinc-800 aspect-video bg-zinc-900"
                            >
                              <img
                                src={img.dataUrl}
                                alt={img.name}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveChannelImage("styleReferenceImages", img.id)
                                }
                                className="absolute top-1 right-1 bg-black/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2. Thumbnail Style References */}
                    <div className="rounded-xl bg-[#0b0b0d] border border-zinc-800 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5 text-zinc-400" />
                          {isAr ? "مرجع الصورة المصغرة" : "Thumbnail References"}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {(activeChannel.thumbnailReferenceImages || []).length}/8
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        {isAr
                          ? "ارفع أمثلة للصور المصغرة (Thumbnails) ليتم اقتراح 3 برومبتات مطابقة لها في بوابة السيو."
                          : "Upload sample YouTube thumbnails to guide the 3 thumbnail prompts in Stage 10."}
                      </p>
                      <Dropzone
                        compact
                        multiple
                        accept="image/*"
                        onFiles={(files) =>
                          handleUploadChannelImages("thumbnailReferenceImages", files)
                        }
                        icon="+"
                        title={isAr ? "رفع صور مصغرة" : "Upload Thumbnails"}
                        filled={false}
                      />
                      {(activeChannel.thumbnailReferenceImages || []).length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {activeChannel.thumbnailReferenceImages.map((img) => (
                            <div
                              key={img.id}
                              className="relative group rounded-lg overflow-hidden border border-zinc-800 aspect-video bg-zinc-900"
                            >
                              <img
                                src={img.dataUrl}
                                alt={img.name}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveChannelImage("thumbnailReferenceImages", img.id)
                                }
                                className="absolute top-1 right-1 bg-black/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. Avatar / Character References */}
                    <div className="rounded-xl bg-[#0b0b0d] border border-zinc-800 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                          {isAr ? "صور أفاتار القناة" : "Channel Avatar Images"}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {(activeChannel.avatarImages || []).length}/8
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        {isAr
                          ? "ارفع صور الشخصية الخاصة بالقناة للحفاظ على ثبات ملامحها وملابسها في كل المشاهد."
                          : "Upload character sheets or host avatars to keep character appearance locked."}
                      </p>
                      <Dropzone
                        compact
                        multiple
                        accept="image/*"
                        onFiles={(files) => handleUploadChannelImages("avatarImages", files)}
                        icon="+"
                        title={isAr ? "رفع صور الأفاتار" : "Upload Avatar"}
                        filled={false}
                      />
                      {(activeChannel.avatarImages || []).length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {activeChannel.avatarImages.map((img) => (
                            <div
                              key={img.id}
                              className="relative group rounded-lg overflow-hidden border border-zinc-800 aspect-square bg-zinc-900"
                            >
                              <img
                                src={img.dataUrl}
                                alt={img.name}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveChannelImage("avatarImages", img.id)}
                                className="absolute top-1 right-1 bg-black/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ==============================================================
                    TAB 3: VIDEO EDITOR PRESETS WITH LIVE INTERACTIVE MONITOR
                    ============================================================== */}
                {activeTab === "editor" && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* LEFT 7 COLS: Exact Editor Controls (Captions, Filters, Transitions + Mix, Motion) */}
                    <div className="xl:col-span-7 space-y-5">
                      {/* Sub-navigation matching Editor LeftPanel */}
                      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-[#0b0b0d] border border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setEditorSubTab("captions")}
                          className={`flex-1 py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            editorSubTab === "captions"
                              ? "bg-zinc-800 text-zinc-100"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <Type className="w-3.5 h-3.5" />
                          <span>{isAr ? "الكابشن (Captions)" : "Captions"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorSubTab("effects")}
                          className={`flex-1 py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            editorSubTab === "effects"
                              ? "bg-zinc-800 text-zinc-100"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>{isAr ? "الفلاتر (Filters)" : "Filters & FX"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorSubTab("transitions")}
                          className={`flex-1 py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            editorSubTab === "transitions"
                              ? "bg-zinc-800 text-zinc-100"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{isAr ? "الانتقالات (Transitions)" : "Transitions"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorSubTab("motion")}
                          className={`flex-1 py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            editorSubTab === "motion"
                              ? "bg-zinc-800 text-zinc-100"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{isAr ? "الحركة (Motion)" : "Motion & Zoom"}</span>
                        </button>
                      </div>

                      {/* 1. CAPTIONS PANEL */}
                      {editorSubTab === "captions" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0b0b0d] border border-zinc-800">
                            <div>
                              <div className="text-xs font-semibold text-zinc-200">
                                {isAr ? "تفعيل الكابشن تلقائياً" : "Enable Captions by Default"}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                {isAr
                                  ? "إظهار النصوص على الفيديو تلقائياً عند فتح المحرر"
                                  : "Render styled subtitles over video clips automatically"}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={edCfg.captionsOn !== false}
                              onChange={(e) =>
                                updateEditorConfig({ captionsOn: e.target.checked })
                              }
                              className="w-4 h-4 accent-zinc-200"
                            />
                          </div>

                          <div className="trgrid">
                            {CAPTION_STYLE_LIST.map((s) => (
                              <CaptionStyleTile
                                key={s.id}
                                st={s}
                                fontFamily={captionFontFamily(edCfg.captionFont || "montserrat")}
                                on={(edCfg.captionStyle || "classic") === s.id}
                                onClick={() => updateEditorConfig({ captionStyle: s.id })}
                              />
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#0b0b0d] border border-zinc-800">
                            <div>
                              <label className="text-[11px] text-zinc-400 block mb-1">
                                {isAr ? "الخط (Font)" : "Font Family"}
                              </label>
                              <select
                                value={edCfg.captionFont || "montserrat"}
                                onChange={(e) =>
                                  updateEditorConfig({ captionFont: e.target.value })
                                }
                                className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200"
                              >
                                {CAPTION_FONTS.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] text-zinc-400 block mb-1">
                                {isAr ? "حركة النص (Animation)" : "Text Animation"}
                              </label>
                              <select
                                value={edCfg.captionAnimation || "pop"}
                                onChange={(e) =>
                                  updateEditorConfig({ captionAnimation: e.target.value })
                                }
                                className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200"
                              >
                                {CAPTION_ANIMATIONS.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] text-zinc-400 block mb-1">
                                {isAr ? "حجم النص" : "Font Size"}
                              </label>
                              <div className="flex gap-1.5">
                                {["sm", "md", "lg"].map((sz) => (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() => updateEditorConfig({ captionSize: sz })}
                                    className={`flex-1 py-1 rounded border text-xs font-medium uppercase ${
                                      (edCfg.captionSize || "md") === sz
                                        ? "border-zinc-500 bg-zinc-800 text-white"
                                        : "border-zinc-800 bg-zinc-900 text-zinc-400"
                                    }`}
                                  >
                                    {sz}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] text-zinc-400 block mb-1">
                                {isAr ? "لون النص" : "Highlight Color"}
                              </label>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {CAPTION_PRESET_COLORS.map((c) => (
                                  <button
                                    key={c.hex}
                                    type="button"
                                    onClick={() => updateEditorConfig({ captionColor: c.hex })}
                                    className={`w-5 h-5 rounded-full border ${
                                      (edCfg.captionColor || "#FFFFFF").toUpperCase() ===
                                      c.hex.toUpperCase()
                                        ? "border-white scale-110"
                                        : "border-zinc-700"
                                    }`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.label}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. FILTERS & EFFECTS PANEL */}
                      {editorSubTab === "effects" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {[
                                { id: "all", label: isAr ? "الكل" : "All" },
                                { id: "grade", label: isAr ? "فلاتر الألوان" : "Color Grades" },
                                { id: "fx", label: isAr ? "تأثيرات بصرية" : "Atmosphere FX" },
                              ].map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setFilterCat(t.id)}
                                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                    filterCat === t.id
                                      ? "bg-zinc-800 text-zinc-100"
                                      : "bg-[#0b0b0d] text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                                  }`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="trgrid">
                            {displayedEffects.map((fx) => (
                              <EffectTile
                                key={fx.id}
                                fx={fx}
                                on={fx.id === (edCfg.effectId || "none")}
                                onClick={() => updateEditorConfig({ effectId: fx.id })}
                              />
                            ))}
                          </div>

                          {edCfg.effectId && edCfg.effectId !== "none" && (
                            <div className="p-3.5 rounded-lg bg-[#0b0b0d] border border-zinc-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">
                                  {isAr ? "قوة الفلتر / التأثير" : "Filter Intensity"}
                                </span>
                                <span className="font-mono text-zinc-200">
                                  {Math.round((Number(edCfg.effectIntensity) ?? 0.5) * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0.05}
                                max={1}
                                step={0.05}
                                value={Number(edCfg.effectIntensity) ?? 0.5}
                                onChange={(e) =>
                                  updateEditorConfig({ effectIntensity: +e.target.value })
                                }
                                className="w-full accent-zinc-200"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. TRANSITIONS PANEL + MIX TRANSITIONS SELECTOR */}
                      {editorSubTab === "transitions" && (
                        <div className="space-y-4">
                          {/* Mode Switch: Single Transition vs Mix Transitions */}
                          <div className="p-3.5 rounded-lg bg-[#0b0b0d] border border-zinc-800 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                                  <Shuffle className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>
                                    {isAr
                                      ? "خلط الانتقالات عشوائياً (Mix Transitions)"
                                      : "Mix Transitions (Random Distribution)"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                  {isAr
                                    ? "اختر مجموعة انتقالات ليقوم المحرر بتوزيعها عشوائياً على جميع المشاهد"
                                    : "Select multiple transitions below and distribute them randomly across all scenes"}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  updateEditorConfig({
                                    transitionType:
                                      edCfg.transitionType === "mix" ? "fade" : "mix",
                                    transitionMixPool: mixPool,
                                  })
                                }
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                  edCfg.transitionType === "mix"
                                    ? "bg-zinc-100 text-zinc-950"
                                    : "bg-zinc-900 text-zinc-300 border border-zinc-700 hover:bg-zinc-800"
                                }`}
                              >
                                <Shuffle className="w-3.5 h-3.5" />
                                <span>
                                  {edCfg.transitionType === "mix"
                                    ? isAr
                                      ? "وضع الخلط العشوائي مفعّل ✓"
                                      : "Mix Mode Active ✓"
                                    : isAr
                                    ? "تفعيل Mix Transitions"
                                    : "Enable Mix Transitions"}
                                </span>
                              </button>
                            </div>

                            {edCfg.transitionType === "mix" && (
                              <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                  <span>
                                    {isAr
                                      ? `انقر على البطاقات بالأسفل لاختيار أو إلغاء الانتقالات ضمن الخلط (${mixPool.length} مختارة):`
                                      : `Click transition tiles below to toggle them in your random mix pool (${mixPool.length} selected):`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateEditorConfig({
                                        transitionType: "mix",
                                        transitionMixPool: TRANSITION_LIST.filter(
                                          (t) => t.id !== "cut"
                                        ).map((t) => t.id),
                                      })
                                    }
                                    className="text-zinc-300 hover:text-white underline"
                                  >
                                    {isAr ? "تحديد الكل" : "Select All"}
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {mixPool.map((id) => {
                                    const tr = TRANSITION_LIST.find((x) => x.id === id);
                                    if (!tr) return null;
                                    return (
                                      <span
                                        key={id}
                                        className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[11px] font-medium flex items-center gap-1"
                                      >
                                        <span>{tr.icon}</span>
                                        <span>{tr.label}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Live Animated Transition Tiles Grid (16 Transitions) */}
                          <div className="trgrid">
                            {TRANSITION_LIST.map((t) => {
                              const isMix = edCfg.transitionType === "mix";
                              const isActive = isMix
                                ? mixPool.includes(t.id)
                                : edCfg.transitionType === t.id;
                              return (
                                <TransitionTile
                                  key={t.id}
                                  tr={t}
                                  on={isActive}
                                  onClick={() => {
                                    if (isMix) {
                                      if (t.id !== "cut") toggleMixTransitionItem(t.id);
                                    } else {
                                      updateEditorConfig({ transitionType: t.id });
                                    }
                                  }}
                                />
                              );
                            })}
                          </div>

                          <div className="p-3.5 rounded-lg bg-[#0b0b0d] border border-zinc-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">
                                {isAr ? "مدة الانتقال (Transition Duration)" : "Transition Duration"}
                              </span>
                              <span className="font-mono text-zinc-200">
                                {(Number(edCfg.transitionDuration) || 0.4).toFixed(2)}s
                              </span>
                            </div>
                            <input
                              type="range"
                              min={MIN_TRANSITION_DURATION}
                              max={MAX_TRANSITION_DURATION}
                              step={0.05}
                              value={Number(edCfg.transitionDuration) || 0.4}
                              onChange={(e) =>
                                updateEditorConfig({ transitionDuration: +e.target.value })
                              }
                              className="w-full accent-zinc-200"
                            />
                          </div>
                        </div>
                      )}

                      {/* 4. MOTION & ZOOM PANEL */}
                      {editorSubTab === "motion" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                              { id: "alternate", label: isAr ? "متناوب (In/Out)" : "Alternate In/Out" },
                              { id: "zoomin", label: isAr ? "تقريب (Zoom In)" : "Zoom In All" },
                              { id: "zoomout", label: isAr ? "تبعيد (Zoom Out)" : "Zoom Out All" },
                              { id: "none", label: isAr ? "ثابت (Static)" : "Static (No Zoom)" },
                            ].map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => updateEditorConfig({ motionMode: m.id })}
                                className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                                  (edCfg.motionMode || "alternate") === m.id
                                    ? "border-zinc-500 bg-zinc-800 text-white"
                                    : "border-zinc-800 bg-[#0b0b0d] text-zinc-400 hover:text-zinc-200"
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>

                          <div className="p-3.5 rounded-lg bg-[#0b0b0d] border border-zinc-800 space-y-3">
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-zinc-400">
                                  {isAr ? "مقدار الزوم (Zoom Depth)" : "Ken Burns Zoom Depth"}
                                </span>
                                <span className="font-mono text-zinc-200">
                                  {Math.round((Number(edCfg.motionAmount) || 0.08) * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0.02}
                                max={0.25}
                                step={0.01}
                                value={Number(edCfg.motionAmount) || 0.08}
                                onChange={(e) =>
                                  updateEditorConfig({ motionAmount: +e.target.value })
                                }
                                className="w-full accent-zinc-200"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                              <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-zinc-400">Fade In</span>
                                  <span className="font-mono text-zinc-200">
                                    {(Number(edCfg.fadeIn) || 0.5).toFixed(1)}s
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={2}
                                  step={0.1}
                                  value={Number(edCfg.fadeIn) ?? 0.5}
                                  onChange={(e) =>
                                    updateEditorConfig({ fadeIn: +e.target.value })
                                  }
                                  className="w-full accent-zinc-200"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-zinc-400">Fade Out</span>
                                  <span className="font-mono text-zinc-200">
                                    {(Number(edCfg.fadeOut) || 0.6).toFixed(1)}s
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={2}
                                  step={0.1}
                                  value={Number(edCfg.fadeOut) ?? 0.6}
                                  onChange={(e) =>
                                    updateEditorConfig({ fadeOut: +e.target.value })
                                  }
                                  className="w-full accent-zinc-200"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT 5 COLS: Real-Time Interactive Live Monitor */}
                    <div className="xl:col-span-5 sticky top-20">
                      <div className="rounded-xl bg-[#0b0b0d] border border-zinc-800 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-200">
                            {isAr ? "المعاينة الحية (Live Preview)" : "Live Preset Monitor"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPreviewPlaying((p) => !p)}
                            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-1"
                          >
                            {previewPlaying ? (
                              <>
                                <Pause className="w-3 h-3" />
                                <span>{isAr ? "إيقاف مؤقت" : "Pause"}</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                <span>{isAr ? "تشغيل" : "Play"}</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="relative rounded-lg overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                          <canvas
                            ref={liveCanvasRef}
                            width={activeChannel.aspectRatio === "9:16" ? 360 : 640}
                            height={activeChannel.aspectRatio === "9:16" ? 640 : 360}
                            className={
                              activeChannel.aspectRatio === "9:16"
                                ? "h-[340px] w-auto object-contain"
                                : "w-full aspect-video object-contain"
                            }
                          />
                        </div>

                        <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 font-mono">
                          <span>FX: {edCfg.effectId || "none"}</span>
                          <span>·</span>
                          <span>
                            TR:{" "}
                            {edCfg.transitionType === "mix"
                              ? `Mix (${mixPool.length})`
                              : edCfg.transitionType || "fade"}
                          </span>
                          <span>·</span>
                          <span>Motion: {edCfg.motionMode || "alternate"}</span>
                          <span>·</span>
                          <span>Cap: {edCfg.captionStyle || "classic"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
