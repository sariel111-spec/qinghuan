"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type View = "home" | "profiles" | "story" | "inspiration" | "artworks" | "messages" | "questions" | "links";
type Extra = Record<string, string | string[]>;
type Entry = { id: number; kind: string; title: string; content: string; extra: Extra; createdAt: string; updatedAt: string };
type ArchiveFile = { id: number; name: string; type: string; size: number; note: string; createdAt: string; url: string };

const nav: { id: View; label: string; mark: string }[] = [
  { id: "profiles", label: "并肩", mark: "双" },
  { id: "story", label: "缘起", mark: "缘" },
  { id: "inspiration", label: "灵思", mark: "思" },
  { id: "artworks", label: "画稿", mark: "画" },
  { id: "messages", label: "传讯", mark: "讯" },
  { id: "questions", label: "待问", mark: "问" },
  { id: "links", label: "驿站", mark: "驿" },
];

const viewMeta: Record<Exclude<View, "home">, { eyebrow: string; title: string; note: string; kind: string; action: string }> = {
  profiles: { eyebrow: "双笺 · 与君并肩", title: "双人档案", note: "你与他的来处、性情，以及只有彼此知道的小事。", kind: "profile", action: "完善档案" },
  story: { eyebrow: "卷一 · 此间岁月", title: "故事线", note: "让每一场相遇落在属于它的时辰。", kind: "story", action: "添一段故事" },
  inspiration: { eyebrow: "随笔 · 一念生花", title: "灵思笺", note: "以标签收拢意象、设定与未写完的念头。", kind: "inspiration", action: "收一枚灵感" },
  artworks: { eyebrow: "丹青 · 笔下相逢", title: "画稿馆", note: "从灵光初现到落笔成卷，妥帖收藏每一幅画。", kind: "artwork", action: "收录一组画稿" },
  messages: { eyebrow: "尺素 · 见字如晤", title: "传讯簿", note: "将每一次聊天截图按时序与标签成册收存。", kind: "message", action: "收存一次传讯" },
  questions: { eyebrow: "未语 · 欲寄心事", title: "待问录", note: "把想问他的话先安放在这里，等一个合适时辰。", kind: "question", action: "记下想问的事" },
  links: { eyebrow: "行囊 · 山水有期", title: "传讯驿站", note: "汇集所有与他相见、传讯和创作的去处。", kind: "link", action: "收录一个去处" },
};

function fmt(date: string, withYear = false) {
  return new Intl.DateTimeFormat("zh-CN", withYear ? { year: "numeric", month: "long", day: "numeric" } : { month: "long", day: "numeric" }).format(new Date(date));
}

function textExtra(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function tagsExtra(value: string | string[] | undefined) { return Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,，]/).filter(Boolean) : []; }
const archiveSections = [
  ["profile", "并肩"], ["story", "故事线"], ["inspiration", "灵思"], ["artwork", "画稿"], ["message", "传讯记录"], ["question", "传讯问题"], ["link", "驿站"],
] as const;

function safeName(value: string) { return value.replace(/[\\/:*?"<>|]/g, "-").slice(0, 48) || "一枕清欢"; }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char)); }
function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
function entryAssetUrls(entry: Entry) { return [textExtra(entry.extra.image), ...tagsExtra(entry.extra.images)].filter(Boolean); }
async function urlToDataUrl(url: string) { const blob = await (await fetch(url)).blob(); return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); }); }
function dataUrlToFile(data: string, name: string) { const [head, body] = data.split(","); const type = head.match(/data:(.*?);/)?.[1] || "application/octet-stream"; const bytes = atob(body); const array = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i); return new File([array], name, { type }); }

function CustomCursor() {
  const cursor = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!matchMedia("(pointer:fine)").matches) return;
    document.body.classList.add("has-custom-cursor");
    const point = { x: -60, y: -60 };
    const echo = { x: -60, y: -60 };
    let frame = 0;
    const drift = () => {
      echo.x += (point.x - echo.x) * .18;
      echo.y += (point.y - echo.y) * .18;
      trail.current?.style.setProperty("--echo-x", `${echo.x}px`);
      trail.current?.style.setProperty("--echo-y", `${echo.y}px`);
      frame = requestAnimationFrame(drift);
    };
    frame = requestAnimationFrame(drift);
    const move = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      const action = Boolean(target.closest("button,a,label,[role='button']"));
      const text = Boolean(target.closest("input,textarea,[contenteditable='true']"));
      const visual = Boolean(target.closest(".visual-home,.inner-home,.chapter-image,.profile-photo,.artwork-visual,.chat-scroll,.lightbox"));
      point.x = event.clientX; point.y = event.clientY;
      [cursor.current, trail.current].forEach((element) => {
        element?.style.setProperty("--cursor-x", `${event.clientX}px`);
        element?.style.setProperty("--cursor-y", `${event.clientY}px`);
        element?.classList.add("is-visible");
        element?.classList.toggle("is-action", action && !text);
        element?.classList.toggle("is-text", text);
        element?.classList.toggle("is-visual", visual);
      });
    };
    const down = () => {
      cursor.current?.classList.add("is-down");
      cursor.current?.classList.remove("is-ripple");
      requestAnimationFrame(() => cursor.current?.classList.add("is-ripple"));
      window.setTimeout(() => cursor.current?.classList.remove("is-ripple"), 520);
    };
    const up = () => cursor.current?.classList.remove("is-down");
    const leave = () => { cursor.current?.classList.remove("is-visible"); trail.current?.classList.remove("is-visible"); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.documentElement.addEventListener("mouseleave", leave);
    return () => { cancelAnimationFrame(frame); document.body.classList.remove("has-custom-cursor"); window.removeEventListener("pointermove", move); window.removeEventListener("pointerdown", down); window.removeEventListener("pointerup", up); document.documentElement.removeEventListener("mouseleave", leave); };
  }, []);
  return <><div ref={trail} className="ink-trail"><i /></div><div ref={cursor} className="ink-cursor"><i /><span /><b /></div></>;
}

function ArchiveTools({ entries, onReload, onToast }: { entries: Entry[]; onReload: () => Promise<void>; onToast: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"backup" | "import" | "download">("backup");
  const [backupKinds, setBackupKinds] = useState<string[]>(archiveSections.map(([kind]) => kind));
  const [bundle, setBundle] = useState<{ entries: Entry[]; assets?: Record<string, string> } | null>(null);
  const [importKinds, setImportKinds] = useState<string[]>([]);
  const [exportKind, setExportKind] = useState<"story" | "artwork" | "message" | "question">("story");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterMode, setFilterMode] = useState<"timeline" | "tag">("timeline");
  const [filterTag, setFilterTag] = useState("");
  const [format, setFormat] = useState<"word" | "pdf">("word");
  const [busy, setBusy] = useState(false);
  const toggle = (list: string[], setList: (value: string[]) => void, value: string) => setList(list.includes(value) ? list.filter(item => item !== value) : [...list, value]);

  const exportEntries = useMemo(() => entries.filter(entry => entry.kind === exportKind).sort((a, b) => Number(textExtra(a.extra.timelineOrder) || 9999) - Number(textExtra(b.extra.timelineOrder) || 9999)), [entries, exportKind]);
  const exportTags = useMemo(() => Array.from(new Set(exportEntries.flatMap(entry => tagsExtra(entry.extra.tags)))), [exportEntries]);
  const visibleExportEntries = filterMode === "tag" && filterTag ? exportEntries.filter(entry => tagsExtra(entry.extra.tags).includes(filterTag)) : exportEntries;

  async function createBackup() {
    if (!backupKinds.length) return onToast("请至少选择一个页面");
    setBusy(true); onToast("正在收拢文字与原图…");
    try {
      const chosen = entries.filter(entry => backupKinds.includes(entry.kind));
      const urls = Array.from(new Set(chosen.flatMap(entryAssetUrls)));
      const pairs = await Promise.all(urls.map(async url => [url, await urlToDataUrl(url)] as const));
      const payload = { name: "一枕清欢备份", version: 1, exportedAt: new Date().toISOString(), sections: backupKinds, entries: chosen, assets: Object.fromEntries(pairs) };
      downloadBlob(new Blob([JSON.stringify(payload)], { type: "application/json;charset=utf-8" }), `一枕清欢-备份-${new Date().toISOString().slice(0, 10)}.json`);
      onToast(`已备份 ${chosen.length} 则内容`);
    } catch { onToast("备份未完成，请稍后再试"); } finally { setBusy(false); }
  }

  async function readBundle(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { entries?: Entry[]; assets?: Record<string, string> };
      if (!Array.isArray(parsed.entries)) throw new Error();
      setBundle({ entries: parsed.entries, assets: parsed.assets || {} });
      setImportKinds(Array.from(new Set(parsed.entries.map(entry => entry.kind))));
    } catch { setBundle(null); onToast("这不是可识别的一枕清欢备份"); }
  }

  async function importBundle() {
    if (!bundle || !importKinds.length) return onToast("请选择需要导入的页面");
    setBusy(true); onToast("正在还原所选页面与图片…");
    try {
      const assetMap = new Map<string, string>();
      for (const [url, data] of Object.entries(bundle.assets || {})) {
        const file = dataUrlToFile(data, url.split("/").pop() || "backup-image");
        const body = new FormData(); body.append("file", file); body.append("note", "备份导入原图");
        const response = await fetch("/api/files", { method: "POST", body });
        if (response.ok) assetMap.set(url, (await response.json()).file.url);
      }
      const chosen = bundle.entries.filter(entry => importKinds.includes(entry.kind));
      for (const entry of chosen) {
        const extra = { ...entry.extra };
        const image = textExtra(extra.image); if (image && assetMap.has(image)) extra.image = assetMap.get(image)!;
        const images = tagsExtra(extra.images); if (images.length) extra.images = images.map(url => assetMap.get(url) || url);
        const existingProfile = entry.kind === "profile" ? entries.find(item => item.kind === "profile" && item.extra.slot === extra.slot) : undefined;
        await fetch("/api/entries", { method: existingProfile ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: existingProfile?.id, kind: entry.kind, title: entry.title, content: entry.content, extra }) });
      }
      await onReload(); onToast(`已导入 ${chosen.length} 则内容`); setOpen(false);
    } catch { onToast("导入中断，请检查备份文件后重试"); } finally { setBusy(false); }
  }

  async function documentHtml(chosen: Entry[], title: string) {
    const assets = new Map<string, string>();
    await Promise.all(Array.from(new Set(chosen.flatMap(entryAssetUrls))).map(async url => { try { assets.set(url, await urlToDataUrl(url)); } catch { /* keep document usable */ } }));
    const sections = chosen.map(entry => {
      const time = textExtra(entry.extra.timelineDate);
      const tags = tagsExtra(entry.extra.tags).map(tag => `#${escapeHtml(tag)}`).join(" · ");
      const images = entryAssetUrls(entry).map(url => assets.get(url)).filter(Boolean).map(data => `<img src="${data}" alt="" />`).join("");
      return `<section><div class="meta">${escapeHtml(time || tags || "一枕清欢")}</div><h2>${escapeHtml(entry.title)}</h2>${tags && time ? `<div class="tags">${tags}</div>` : ""}<div class="images">${images}</div><div class="prose">${escapeHtml(entry.content || "尚未落字。").replace(/\n/g, "<br>")}</div></section>`;
    }).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{margin:22mm}body{font-family:"Songti SC","SimSun",serif;color:#304c46;max-width:760px;margin:auto;padding:42px;background:#fbfaf5}h1{text-align:center;font-weight:400;letter-spacing:.25em;border-bottom:1px solid #b9c9c4;padding-bottom:24px}section{page-break-inside:avoid;margin:48px 0;padding-bottom:38px;border-bottom:1px solid #d6dfdc}h2{font-size:25px;font-weight:400;letter-spacing:.12em}.meta,.tags{font-size:11px;color:#78908a;letter-spacing:.12em}.images{display:grid;gap:12px;margin:22px 0}.images img{display:block;max-width:100%;max-height:700px;margin:auto;object-fit:contain}.prose{font-size:14px;line-height:2.05;white-space:normal}</style></head><body><h1>${escapeHtml(title)}</h1>${sections}</body></html>`;
  }

  async function downloadOriginals(chosen: Entry[]) {
    const pictures = chosen.flatMap(entry => entryAssetUrls(entry).map((url, index) => ({ url, title: entry.title, index })));
    if (!pictures.length) return onToast("所选画稿中还没有图片");
    setBusy(true);
    try {
      for (const picture of pictures) {
        const blob = await (await fetch(picture.url)).blob();
        const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
        downloadBlob(blob, `${safeName(picture.title)}-${picture.index + 1}.${ext}`);
        await new Promise(resolve => setTimeout(resolve, 160));
      }
      onToast(`已下载 ${pictures.length} 张原图`);
    } catch { onToast("原图下载未完成，请再试一次"); } finally { setBusy(false); }
  }

  async function exportSelected() {
    const chosen = exportEntries.filter(entry => selectedIds.includes(entry.id));
    if (!chosen.length) return onToast("请先勾选需要下载的内容");
    if (exportKind === "artwork") return downloadOriginals(chosen);
    setBusy(true);
    const title = exportKind === "story" ? "故事藏卷" : exportKind === "message" ? "传讯藏卷" : "待问藏卷";
    const printWindow = format === "pdf" ? window.open("", "_blank") : null;
    try {
      const html = await documentHtml(chosen, title);
      if (format === "word") downloadBlob(new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" }), `${title}.doc`);
      else if (printWindow) { printWindow.document.open(); printWindow.document.write(html); printWindow.document.close(); printWindow.onload = () => setTimeout(() => printWindow.print(), 350); }
      onToast(format === "word" ? "Word 藏卷已生成" : "请选择“存储为 PDF”完成下载");
    } catch { printWindow?.close(); onToast("文档生成未完成，请再试一次"); } finally { setBusy(false); }
  }

  function changeExportKind(kind: typeof exportKind) { setExportKind(kind); setSelectedIds([]); setFilterTag(""); setFilterMode(kind === "question" ? "tag" : "timeline"); }
  return <><button className="archive-handle" onClick={() => setOpen(true)} aria-label="打开藏卷功能栏"><span>藏</span><small>备份 · 下载</small></button>{open && <div className="archive-backdrop" onPointerDown={event => event.target === event.currentTarget && setOpen(false)}><aside className="archive-drawer"><header><div><small>一枕清欢 · 随身藏卷</small><h2>藏卷</h2></div><button onClick={() => setOpen(false)}>×</button></header><nav className="archive-tabs"><button className={tab === "backup" ? "active" : ""} onClick={() => setTab("backup")}>备份</button><button className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>导入</button><button className={tab === "download" ? "active" : ""} onClick={() => setTab("download")}>下载成卷</button></nav>
    <div className="archive-body">{tab === "backup" && <section><h3>选择需要备份的页面</h3><p>文字、标签、时间线和已上传图片会一并收存。</p><div className="archive-checks">{archiveSections.map(([kind, label]) => <label key={kind}><input type="checkbox" checked={backupKinds.includes(kind)} onChange={() => toggle(backupKinds, setBackupKinds, kind)} /><span>{label}</span><small>{entries.filter(entry => entry.kind === kind).length} 则</small></label>)}</div><button className="archive-primary" disabled={busy} onClick={createBackup}>{busy ? "正在收拢…" : "下载所选备份"}</button></section>}
    {tab === "import" && <section><h3>选择备份，再决定导入哪些页面</h3><label className="bundle-picker"><input type="file" accept="application/json,.json" onChange={event => readBundle(event.target.files?.[0])} /><b>＋</b><span>{bundle ? `已识别 ${bundle.entries.length} 则内容` : "选择一枕清欢备份文件"}</span></label>{bundle && <><div className="archive-checks">{archiveSections.filter(([kind]) => bundle.entries.some(entry => entry.kind === kind)).map(([kind, label]) => <label key={kind}><input type="checkbox" checked={importKinds.includes(kind)} onChange={() => toggle(importKinds, setImportKinds, kind)} /><span>{label}</span><small>{bundle.entries.filter(entry => entry.kind === kind).length} 则</small></label>)}</div><button className="archive-primary" disabled={busy} onClick={importBundle}>{busy ? "正在还原…" : "导入所选页面"}</button></>}</section>}
    {tab === "download" && <section><h3>选择一种藏卷</h3><div className="export-kinds">{([['story','故事'],['artwork','画稿原图'],['message','传讯记录'],['question','传讯问题']] as const).map(([kind, label]) => <button className={exportKind === kind ? "active" : ""} key={kind} onClick={() => changeExportKind(kind)}>{label}</button>)}</div>{exportKind !== "artwork" && <div className="export-options"><button className={filterMode === "timeline" ? "active" : ""} disabled={exportKind === "question"} onClick={() => setFilterMode("timeline")}>按时间线</button><button className={filterMode === "tag" ? "active" : ""} onClick={() => setFilterMode("tag")}>按标签</button><select value={format} onChange={event => setFormat(event.target.value as "word" | "pdf")}><option value="word">Word 文档</option><option value="pdf">PDF 文档</option></select></div>}{filterMode === "tag" && exportKind !== "artwork" && <select className="tag-select" value={filterTag} onChange={event => setFilterTag(event.target.value)}><option value="">全部标签</option>{exportTags.map(tag => <option key={tag}>{tag}</option>)}</select>}<div className="export-list">{visibleExportEntries.map(entry => <label key={entry.id}><input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={() => setSelectedIds(selectedIds.includes(entry.id) ? selectedIds.filter(id => id !== entry.id) : [...selectedIds, entry.id])} /><span><b>{entry.title}</b><small>{textExtra(entry.extra.timelineDate) || tagsExtra(entry.extra.tags).join(" · ") || `${entryAssetUrls(entry).length} 张图片`}</small></span></label>)}{!visibleExportEntries.length && <p className="archive-none">这里暂时没有可下载的内容。</p>}</div><button className="archive-primary" disabled={busy || !selectedIds.length} onClick={exportSelected}>{busy ? "正在成卷…" : exportKind === "artwork" ? "下载所选原图" : `生成所选${format === "word" ? " Word" : " PDF"}`}</button></section>}</div><footer>所有操作只处理你亲自选择的页面与内容</footer></aside></div>}</>;
}

function Assistant({ entries, onRemember }: { entries: Entry[]; onRemember: (title: string, content: string) => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
  const recent = entries.slice(0, 4).map((e) => e.title);
  function inspire() {
    if (!prompt.trim()) return;
    setThinking(true);
    setTimeout(() => {
      const anchor = recent.length ? `我从你留下的「${recent[0]}」里，拾到了一点回声。` : "这一念很适合从一个极静的时刻开始。";
      let body = "可以试着写：雨停后，他把未送出的信压在棋盘下。你偶然看见墨迹被水晕开，只认出自己的小字。不要立刻揭破，让答案藏到下一次重逢。";
      if (/初遇|相遇/.test(prompt)) body = "把初遇放在一场‘错认’里：你替人送伞，他却以为你知道他的身份。后来重逢，才发现两个人都把那一刻珍藏了很久。可用一枚沾雨的玉扣作暗线。";
      if (/矛盾|冲突/.test(prompt)) body = "让冲突来自两种都温柔的选择：他守的是家国旧诺，你护的是眼前之人。谁都没有错，才会真正难解。安排一个共同秘密，让你们不得不并肩，却仍不肯先低头。";
      if (/日常|甜/.test(prompt)) body = "写一段不说爱意的亲密：你在灯下替他补旧衣，他把案上的蜜饯悄悄推近。对话只谈天气，所有心意都落在手边的小动作里。";
      const result = `${anchor}\n\n${body}\n\n可继续追问：这一幕最想留下哪一种情绪？我会替你拆成场景与对白。`;
      setAnswer(result); onRemember(`与灵犀共想：${prompt.slice(0, 18)}`, `${prompt}\n\n${result}`); setThinking(false);
    }, 620);
  }
  return <>
    <button className="assistant-orb" onClick={() => setOpen(!open)} aria-label="打开灵犀助手"><span>灵</span><i /></button>
    <aside className={`assistant-panel ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="assistant-head"><div><small>与你共写，也替你记得</small><h3>灵犀</h3></div><button onClick={() => setOpen(false)} aria-label="关闭">×</button></div>
      <div className="memory-strip"><span className="memory-pulse" /> 已读过此间 {entries.length} 则记忆</div>
      <div className="assistant-body">
        {!answer && <div className="assistant-welcome"><b>今日想从何处落笔？</b><p>说一个片段、一种情绪，或你们之间尚未想明白的事。</p><div className="prompt-chips">{["设计一场初遇", "想一段含蓄日常", "制造温柔的矛盾"].map(x => <button key={x} onClick={() => setPrompt(x)}>{x}</button>)}</div></div>}
        {answer && <div className="assistant-answer">{answer.split("\n").map((line, i) => line ? <p key={i}>{line}</p> : <br key={i} />)}</div>}
      </div>
      <div className="assistant-input"><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="譬如：我想写一场雪夜重逢……" /><button onClick={inspire} disabled={thinking || !prompt.trim()}>{thinking ? "凝神…" : "共想"}</button></div>
    </aside>
  </>;
}

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [view, setView] = useState<View>("home");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [profileSlot, setProfileSlot] = useState<"self" | "beloved" | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [ripple, setRipple] = useState({ x: 50, y: 60, n: 0 });
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [reader, setReader] = useState<Entry | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; title: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch("/api/entries"), fetch("/api/files")]);
      if (a.ok) setEntries((await a.json()).entries);
      if (b.ok) setFiles((await b.json()).files);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setReader(null); setLightbox(null); }
      if (lightbox && event.key === "ArrowRight") setLightbox(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null);
      if (lightbox && event.key === "ArrowLeft") setLightbox(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null);
    };
    window.addEventListener("keydown", keys); return () => window.removeEventListener("keydown", keys);
  }, [lightbox]);

  const remember = useCallback(async (title: string, content: string) => {
    const res = await fetch("/api/entries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "inspiration", title, content, extra: { source: "assistant", tags: ["灵犀共想"] } }) });
    if (res.ok) { const data = await res.json(); setEntries(prev => [data.entry, ...prev]); }
  }, []);

  const profiles = useMemo(() => ({ self: entries.find(e => e.kind === "profile" && e.extra.slot === "self"), beloved: entries.find(e => e.kind === "profile" && e.extra.slot === "beloved") }), [entries]);
  const filtered = useMemo(() => view === "home" ? [] : entries.filter(e => {
    const tags = tagsExtra(e.extra.tags).join(" ");
    return e.kind === viewMeta[view].kind && `${e.title} ${e.content} ${tags} ${textExtra(e.extra.timelineDate)}`.toLowerCase().includes(query.toLowerCase());
  }), [entries, query, view]);
  const storyEntries = useMemo(() => filtered.filter(e => e.kind === "story").sort((a, b) => Number(textExtra(a.extra.timelineOrder) || 9999) - Number(textExtra(b.extra.timelineOrder) || 9999)), [filtered]);
  const messageEntries = useMemo(() => filtered.filter(e => e.kind === "message").sort((a, b) => Number(textExtra(a.extra.timelineOrder) || 9999) - Number(textExtra(b.extra.timelineOrder) || 9999)), [filtered]);
  const stats = useMemo(() => ({ story: entries.filter(e => e.kind === "story").length, thought: entries.filter(e => e.kind === "inspiration").length, all: entries.length + files.length }), [entries, files]);

  function selectView(id: View) { setView(id); closeComposer(); setQuery(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function showToast(text: string) { setToast(text); setTimeout(() => setToast(""), 2400); }
  function closeComposer() { setComposer(false); setEditing(null); setProfileSlot(null); setPendingImage(null); setPreview(""); setPendingImages([]); setPreviewImages([]); }
  function createFor(slot?: "self" | "beloved") { setEditing(slot ? profiles[slot] || null : null); setProfileSlot(slot || null); setPendingImage(null); setPreview(slot && profiles[slot] ? textExtra(profiles[slot]?.extra.image) : ""); setPendingImages([]); setPreviewImages([]); setComposer(true); }
  function editEntry(entry: Entry) { setEditing(entry); setProfileSlot(entry.kind === "profile" ? textExtra(entry.extra.slot) as "self" | "beloved" : null); setPendingImage(null); setPreview(textExtra(entry.extra.image)); setPendingImages([]); setPreviewImages(tagsExtra(entry.extra.images)); setComposer(true); }

  async function uploadAsset(file: File, note: string) {
    const body = new FormData(); body.append("file", file); body.append("note", note);
    const res = await fetch("/api/files", { method: "POST", body });
    if (!res.ok) throw new Error((await res.json()).error || "上传未成");
    return (await res.json()).file as ArchiveFile;
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const kind = profileSlot ? "profile" : view === "home" ? "inspiration" : viewMeta[view].kind;
    const title = String(form.get("title") || "");
    const content = String(form.get("content") || "");
    let image = editing ? textExtra(editing.extra.image) : "";
    try {
      if (pendingImage) { showToast("正在收存配图…"); image = (await uploadAsset(pendingImage, `${kind}配图`)).url; }
      const images = previewImages.filter(url => !url.startsWith("blob:"));
      if (pendingImages.length) {
        showToast(`正在收存 ${pendingImages.length} 张图片…`);
        for (const file of pendingImages) images.push((await uploadAsset(file, `${kind}组图`)).url);
      }
      let extra: Extra = editing ? { ...editing.extra } : {};
      if (kind === "link") extra = { url: String(form.get("url") || "") };
      if (kind === "story") extra = { ...extra, timelineDate: String(form.get("timelineDate") || ""), timelineLabel: String(form.get("timelineLabel") || ""), timelineOrder: String(form.get("timelineOrder") || ""), image };
      if (kind === "inspiration") extra = { ...extra, tags: String(form.get("tags") || "").split(/[,，、]/).map(x => x.trim()).filter(Boolean), image };
      if (kind === "artwork") extra = { ...extra, tags: String(form.get("tags") || "").split(/[,，、]/).map(x => x.trim()).filter(Boolean), images };
      if (kind === "message") extra = { ...extra, timelineDate: String(form.get("timelineDate") || ""), timelineOrder: editing ? textExtra(editing.extra.timelineOrder) : String(entries.filter(entry => entry.kind === "message").length + 1), tags: String(form.get("tags") || "").split(/[,，、]/).map(x => x.trim()).filter(Boolean), images };
      if (kind === "question") extra = { ...extra, tags: String(form.get("tags") || "").split(/[,，、]/).map(x => x.trim()).filter(Boolean) };
      if (kind === "profile") extra = { slot: profileSlot || textExtra(editing?.extra.slot), identity: String(form.get("identity") || ""), birthday: String(form.get("birthday") || ""), temperament: String(form.get("temperament") || ""), likes: String(form.get("likes") || ""), bond: String(form.get("bond") || ""), image };
      const method = editing ? "PUT" : "POST";
      const res = await fetch("/api/entries", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editing?.id, kind, title, content, extra }) });
      if (!res.ok) throw new Error((await res.json()).error || "保存未成");
      const result = await res.json();
      setEntries(prev => editing ? prev.map(e => e.id === editing.id ? result.entry : e) : [result.entry, ...prev]);
      closeComposer(); showToast(editing ? "修改已妥帖保存" : "已收入你的私藏");
    } catch (error) { showToast(error instanceof Error ? error.message : "保存未成，请再试一次"); }
  }

  async function remove(id: number) { await fetch(`/api/entries?id=${id}`, { method: "DELETE" }); setEntries(prev => prev.filter(e => e.id !== id)); showToast("已移出此间"); }
  async function reorderStories(dragId: number, targetId: number) {
    if (dragId === targetId) return;
    const ordered = [...storyEntries];
    const from = ordered.findIndex(entry => entry.id === dragId);
    const to = ordered.findIndex(entry => entry.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1); ordered.splice(to, 0, moved);
    const updates = ordered.map((entry, index) => ({ ...entry, extra: { ...entry.extra, timelineOrder: String(index + 1) } }));
    setEntries(prev => prev.map(entry => updates.find(item => item.id === entry.id) || entry));
    try {
      await Promise.all(updates.map(entry => fetch("/api/entries", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(entry) })));
      showToast("时间点次序已重新排好");
    } catch { await load(); showToast("次序未能保存，请再试一次"); }
  }
  async function reorderMessages(dragId: number, targetId: number) {
    if (dragId === targetId) return;
    const ordered = [...messageEntries];
    const from = ordered.findIndex(entry => entry.id === dragId);
    const to = ordered.findIndex(entry => entry.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1); ordered.splice(to, 0, moved);
    const updates = ordered.map((entry, index) => ({ ...entry, extra: { ...entry.extra, timelineOrder: String(index + 1) } }));
    setEntries(prev => prev.map(entry => updates.find(item => item.id === entry.id) || entry));
    try {
      await Promise.all(updates.map(entry => fetch("/api/entries", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(entry) })));
      showToast("传讯时间线已重新排好");
    } catch { await load(); showToast("次序未能保存，请再试一次"); }
  }
  function chooseImage(file?: File) { if (!file) return; setPendingImage(file); setPreview(URL.createObjectURL(file)); }
  function chooseImages(list?: FileList | null) { if (!list?.length) return; const chosen = Array.from(list); setPendingImages(prev => [...prev, ...chosen]); setPreviewImages(prev => [...prev, ...chosen.map(file => URL.createObjectURL(file))]); }
  function removePreviewImage(index: number) { const removed = previewImages[index]; const pendingIndex = previewImages.slice(0, index).filter(url => url.startsWith("blob:")).length; setPreviewImages(prev => prev.filter((_, i) => i !== index)); if (removed?.startsWith("blob:")) setPendingImages(prev => prev.filter((_, i) => i !== pendingIndex)); }

  if (!entered) return <><CustomCursor /><main className="visual-home" onPointerMove={e => setPointer({ x: (e.clientX / innerWidth - .5) * 12, y: (e.clientY / innerHeight - .5) * 8 })} onPointerDown={e => setRipple({ x: e.clientX / innerWidth * 100, y: e.clientY / innerHeight * 100, n: ripple.n + 1 })}>
    <div className="hero-image" style={{ transform: `scale(1.04) translate(${pointer.x}px, ${pointer.y}px)` }} /><div className="hero-wash" /><div className="ripple" key={ripple.n} style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }} />
    <div className="petals">{Array.from({ length: 12 }).map((_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>
    <button className="enter-seal" onClick={(e) => { e.stopPropagation(); setEntered(true); }} aria-label="进入一枕清欢"><span /></button>
  </main></>;

  return <div className="app-shell"><CustomCursor />
    <aside className="sidebar"><button className="brand-seal" onClick={() => selectView("home")} aria-label="回到庭中"><span>清</span><i>欢</i></button><nav>{nav.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)}><span>{item.mark}</span><em>{item.label}</em></button>)}</nav><div className="season"><i /><span>白露<br /><small>宜记旧梦</small></span></div></aside>
    <div className="mobile-bar"><button className="mini-seal" onClick={() => selectView("home")}>清</button><span>{view === "home" ? "一枕清欢" : viewMeta[view].title}</span><button onClick={() => view === "profiles" ? createFor("self") : setComposer(true)} aria-label="新建">＋</button></div>

    <main className="workspace">
      {view === "home" ? <section className="inner-home"><div className="inner-image" /><div className="inner-veil" /><div className="home-copy"><p>一方只属于你们的天地</p><h1>一枕<br />清欢</h1><span>山长水远，落笔皆为相逢</span></div><div className="today-card"><small>此间藏有</small><strong>{stats.all.toString().padStart(2, "0")}</strong><span>则心事</span><i /></div><div className="home-paths"><button onClick={() => selectView("profiles")}><span>并肩</span><b>{Number(Boolean(profiles.self)) + Number(Boolean(profiles.beloved))}</b><i /></button><button onClick={() => selectView("story")}><span>故事</span><b>{stats.story}</b><i /></button><button onClick={() => selectView("inspiration")}><span>灵思</span><b>{stats.thought}</b><i /></button></div><button className="quiet-mode" onClick={() => setEntered(false)} aria-label="回到纯景观首页"><i /> 静观</button></section> : <section className="content-view">
        <header className="page-head"><div><p>{viewMeta[view].eyebrow}</p><h1>{viewMeta[view].title}</h1><span>{viewMeta[view].note}</span></div>{view !== "profiles" && <div className="head-actions"><label><span>寻</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={["inspiration", "questions", "artworks", "messages"].includes(view) ? "搜索文字或标签" : "搜索此间记忆"} /></label><button onClick={() => createFor()}>＋ {viewMeta[view].action}</button></div>}</header>

        {view === "profiles" && <ProfilesView profiles={profiles} onEdit={createFor} />}
        {view === "story" && <StoryView entries={storyEntries} loading={loading} onEdit={editEntry} onRemove={remove} onAdd={() => createFor()} onRead={setReader} onReorder={reorderStories} />}
        {view === "inspiration" && <InspirationView entries={filtered} allEntries={entries.filter(entry => entry.kind === "inspiration")} query={query} loading={loading} onEdit={editEntry} onRemove={remove} onAdd={() => createFor()} onTag={tag => setQuery(tag)} />}
        {view === "artworks" && <ArtworkView entries={filtered} allEntries={entries.filter(entry => entry.kind === "artwork")} query={query} loading={loading} onEdit={editEntry} onRemove={remove} onAdd={() => createFor()} onTag={tag => setQuery(tag)} onOpen={(images, index, title) => setLightbox({ images, index, title })} />}
        {view === "messages" && <MessageView entries={messageEntries} allEntries={entries.filter(entry => entry.kind === "message")} query={query} loading={loading} onEdit={editEntry} onRemove={remove} onAdd={() => createFor()} onTag={tag => setQuery(tag)} onReorder={reorderMessages} onOpen={(images, index, title) => setLightbox({ images, index, title })} />}
        {view === "questions" && <QuestionView entries={filtered} allEntries={entries.filter(entry => entry.kind === "question")} query={query} loading={loading} onEdit={editEntry} onRemove={remove} onAdd={() => createFor()} onTag={tag => setQuery(tag)} />}
        {view === "links" && <div className="entry-grid">{filtered.map((entry, index) => <EntryCard entry={entry} index={index} key={entry.id} onEdit={editEntry} onRemove={remove} onTag={tag => setQuery(tag)} />)}{!filtered.length && !loading && <Empty kind={viewMeta[view].title} onAdd={() => createFor()} />}</div>}
      </section>}
    </main>

    <nav className="mobile-nav">{nav.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)}><span>{item.mark}</span><small>{item.label}</small></button>)}</nav>
    <ArchiveTools entries={entries} onReload={load} onToast={showToast} />
    <Assistant entries={entries} onRemember={remember} />

    {composer && view !== "home" && <div className="modal-backdrop" onPointerDown={e => e.target === e.currentTarget && closeComposer()}><form className="composer enhanced-composer" onSubmit={submitEntry}>
      <div className="composer-head"><div><small>{profileSlot ? "双笺 · 与君并肩" : viewMeta[view].eyebrow}</small><h2>{editing ? "续写与修改" : profileSlot ? (profileSlot === "self" ? "写下你的档案" : "写下他的档案") : viewMeta[view].action}</h2></div><button type="button" onClick={closeComposer}>×</button></div>
      <div className="form-scroll">
        <label><span>{profileSlot ? "姓名 / 称呼" : view === "links" ? "驿站名" : view === "questions" ? "想问的话" : "题记"}</span><input name="title" required autoFocus defaultValue={editing?.title || ""} placeholder={view === "story" ? "譬如：上元灯下初见" : "写一个名字"} /></label>
        {profileSlot && <div className="form-pair"><label><span>身份 / 来处</span><input name="identity" defaultValue={textExtra(editing?.extra.identity)} placeholder="譬如：汴京画师" /></label><label><span>生辰</span><input name="birthday" defaultValue={textExtra(editing?.extra.birthday)} placeholder="譬如：景和三年 · 白露" /></label></div>}
        {profileSlot && <div className="form-pair"><label><span>性情</span><input name="temperament" defaultValue={textExtra(editing?.extra.temperament)} placeholder="清醒、克制、温柔" /></label><label><span>偏爱</span><input name="likes" defaultValue={textExtra(editing?.extra.likes)} placeholder="春雨、旧书、桂花酿" /></label></div>}
        {profileSlot && <label><span>你们之间</span><input name="bond" defaultValue={textExtra(editing?.extra.bond)} placeholder="譬如：于乱世里互为归处" /></label>}
        {view === "story" && !profileSlot && <><div className="form-pair"><label><span>故事时间（自由填写）</span><input required name="timelineDate" defaultValue={textExtra(editing?.extra.timelineDate)} placeholder="譬如：景和三年 · 上元夜" /></label><label><span>时间题签</span><input name="timelineLabel" defaultValue={textExtra(editing?.extra.timelineLabel)} placeholder="譬如：初见 / 重逢" /></label></div><label><span>时间轴顺序</span><input type="number" min="1" name="timelineOrder" defaultValue={textExtra(editing?.extra.timelineOrder)} placeholder="数字越小越靠前，譬如：1" /></label></>}
        {(["inspiration", "questions", "artworks", "messages"] as View[]).includes(view) && !profileSlot && <label><span>标签</span><input name="tags" defaultValue={tagsExtra(editing?.extra.tags).join("，")} placeholder="用逗号分隔：重逢，雨夜，含蓄" /></label>}
        {view === "messages" && <label><span>本次传讯时间</span><input required name="timelineDate" defaultValue={textExtra(editing?.extra.timelineDate)} placeholder="譬如：景和四年 · 七月初七" /></label>}
        {view === "links" && <label><span>去处</span><input name="url" type="url" defaultValue={textExtra(editing?.extra.url)} placeholder="https://" /></label>}
        {(profileSlot || view === "story" || view === "inspiration") && <label className="image-picker"><span>{profileSlot ? "档案留影" : "配图"}</span><input hidden type="file" accept="image/*" onChange={e => chooseImage(e.target.files?.[0])} /><div className={preview ? "has-image" : ""}>{preview ? <img src={preview} alt="配图预览" /> : <><b>＋</b><small>选择一张图片，将自动适配不同屏幕</small></>}</div></label>}
        {(view === "artworks" || view === "messages") && <label className="multi-image-picker"><span>{view === "messages" ? "聊天截图（可一次选择任意数量）" : "画稿组图（可一次选择多张）"}</span><input hidden multiple type="file" accept="image/*" onChange={e => chooseImages(e.target.files)} /><div className="multi-upload-invite"><b>＋</b><small>{view === "messages" ? "按原聊天顺序选择图片，可继续追加" : "添加草图、过程图与成稿"}</small></div>{previewImages.length > 0 && <div className="multi-preview">{previewImages.map((url, index) => <figure key={`${url}-${index}`}><img src={url} alt={`预览 ${index + 1}`} /><small>{String(index + 1).padStart(2, "0")}</small><button type="button" onClick={event => { event.preventDefault(); removePreviewImage(index); }} aria-label="移除图片">×</button></figure>)}</div>}</label>}
        <label><span>{profileSlot ? "小传" : view === "questions" ? "为何想问" : "细写"}</span><textarea name="content" rows={7} defaultValue={editing?.content || ""} placeholder="慢慢写，这里会替你记住……" /></label>
      </div>
      <div className="composer-foot"><span>⟡ {editing ? "修改会同步更新此间记忆" : "自动存入此间记忆"}</span><button type="submit">{editing ? "保存修改" : "收存"}</button></div>
    </form></div>}
    {reader && <div className="reader-backdrop"><article className="story-reader"><button className="reader-close" onClick={() => setReader(null)} aria-label="关闭全文">×</button><header><small>{textExtra(reader.extra.timelineDate) || "年月未定"}</small><span>{textExtra(reader.extra.timelineLabel) || "此间一折"}</span><h1>{reader.title}</h1></header>{textExtra(reader.extra.image) && <div className="reader-image"><img src={textExtra(reader.extra.image)} alt={reader.title} /></div>}<div className="reader-prose">{(reader.content || "尚未落字。").split("\n").map((paragraph, index) => paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />)}</div><footer>一枕清欢 · 故事藏卷</footer></article></div>}
    {lightbox && <div className="lightbox" onPointerDown={event => event.target === event.currentTarget && setLightbox(null)}><button className="lightbox-close" onClick={() => setLightbox(null)}>×</button><div className="lightbox-head"><small>{lightbox.title}</small><span>{lightbox.index + 1} / {lightbox.images.length}</span></div><button className="lightbox-prev" onClick={() => setLightbox(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null)}>‹</button><img src={lightbox.images[lightbox.index]} alt={`${lightbox.title} ${lightbox.index + 1}`} /><button className="lightbox-next" onClick={() => setLightbox(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null)}>›</button></div>}
    {toast && <div className="toast"><i />{toast}</div>}
  </div>;
}

function ProfilesView({ profiles, onEdit }: { profiles: { self?: Entry; beloved?: Entry }; onEdit: (slot: "self" | "beloved") => void }) {
  return <div className="profiles-stage"><div className="profile-thread"><i /><span>两笺相合</span><i /></div><div className="profile-pair">{(["beloved", "self"] as const).map((slot) => { const person = profiles[slot]; const isSelf = slot === "self"; return <article className={`profile-card ${slot}`} key={slot}>
    <div className="profile-photo">{textExtra(person?.extra.image) ? <img src={textExtra(person?.extra.image)} alt={person?.title || "档案留影"} /> : <div className="profile-placeholder"><span>{isSelf ? "我" : "君"}</span><i /></div>}</div>
    <div className="profile-copy"><p>{textExtra(person?.extra.identity) || (isSelf ? "你的来处，静待你写下" : "他的来处，静待你写下")}</p><h2>{person?.title || (isSelf ? "你的名字" : "他的名字")}</h2>{person ? <><div className="profile-facts"><span><small>生辰</small>{textExtra(person.extra.birthday) || "未记"}</span><span><small>性情</small>{textExtra(person.extra.temperament) || "未记"}</span><span><small>偏爱</small>{textExtra(person.extra.likes) || "未记"}</span></div><blockquote>{person.content || "尚未写下小传。"}</blockquote></> : <div className="profile-empty">写下姓名、性情与小传，让这份相识有迹可循。</div>}<button onClick={() => onEdit(slot)}>{person ? "修订此笺" : "落笔建档"}</button></div>
  </article>; })}</div><div className="bond-note"><small>你们之间</small><p>{textExtra(profiles.self?.extra.bond) || textExtra(profiles.beloved?.extra.bond) || "从一场未曾预料的相逢，写到山长水远。"}</p></div></div>;
}

function StoryView({ entries, loading, onEdit, onRemove, onAdd, onRead, onReorder }: { entries: Entry[]; loading: boolean; onEdit: (e: Entry) => void; onRemove: (id: number) => void; onAdd: () => void; onRead: (e: Entry) => void; onReorder: (dragId: number, targetId: number) => void }) {
  const dragging = useRef<number | null>(null);
  const touchDrag = useRef({ id: 0, x: 0 });
  return <div className="story-space">{entries.length > 0 && <><div className="timeline-hint"><i />拖动时间点，即可调整故事前后顺序</div><div className="story-rail"><div className="rail-line" />{entries.map((entry, i) => <div className="rail-point" data-story-id={entry.id} draggable key={entry.id} onDragStart={() => { dragging.current = entry.id; }} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragging.current) onReorder(dragging.current, entry.id); dragging.current = null; }} onDragEnd={() => { dragging.current = null; }} onPointerDown={event => { if (event.pointerType !== "mouse") touchDrag.current = { id: entry.id, x: event.clientX }; }} onPointerUp={event => { if (event.pointerType === "mouse" || Math.abs(event.clientX - touchDrag.current.x) < 24) return; const target = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-story-id]"); if (target) onReorder(touchDrag.current.id, Number(target.dataset.storyId)); touchDrag.current = { id: 0, x: 0 }; }} onClick={() => document.getElementById(`story-${entry.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} role="button" tabIndex={0} title="拖动调整位置，点击前往故事"><i /><span>{textExtra(entry.extra.timelineLabel) || `第${i + 1}折`}</span><small>{textExtra(entry.extra.timelineDate) || "未定"}</small></div>)}</div></>}
    <div className="story-list">{entries.map((entry, index) => <article className={`story-chapter ${index % 2 ? "reverse" : ""}`} id={`story-${entry.id}`} key={entry.id}>
      <div className="chapter-date"><small>{textExtra(entry.extra.timelineDate) || "年月未定"}</small><span>{String(index + 1).padStart(2, "0")}</span></div>
      {textExtra(entry.extra.image) && <PanImage src={textExtra(entry.extra.image)} alt={entry.title} onOpen={() => onRead(entry)} />}
      <div className="chapter-copy"><div className="chapter-kicker"><i />{textExtra(entry.extra.timelineLabel) || "此间一折"}</div><h2>{entry.title}</h2><p>{entry.content || "尚未落字。"}</p><div className="card-actions"><button className="read-all" onClick={() => onRead(entry)}>阅览全篇</button><button onClick={() => onEdit(entry)}>修订</button><button onClick={() => onRemove(entry.id)}>移除</button></div></div>
    </article>)}</div>{!entries.length && !loading && <Empty kind="故事" onAdd={onAdd} />}</div>;
}

function PanImage({ src, alt, onOpen }: { src: string; alt: string; onOpen: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 });
  return <div className="chapter-image pan-image" ref={frame} onPointerDown={event => { const node = frame.current; if (!node) return; drag.current = { active: true, x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop }; node.setPointerCapture(event.pointerId); node.classList.add("is-dragging"); }} onPointerMove={event => { const node = frame.current; if (!node || !drag.current.active) return; node.scrollLeft = drag.current.left - (event.clientX - drag.current.x); node.scrollTop = drag.current.top - (event.clientY - drag.current.y); }} onPointerUp={event => { drag.current.active = false; frame.current?.releasePointerCapture(event.pointerId); frame.current?.classList.remove("is-dragging"); }}>
    <img src={src} alt={alt} draggable={false} /><span>上下滑动或拖动看图</span><button onPointerDown={event => event.stopPropagation()} onClick={onOpen}>全图 · 全文</button>
  </div>;
}

function InspirationView({ entries, allEntries, query, loading, onEdit, onRemove, onAdd, onTag }: { entries: Entry[]; allEntries: Entry[]; query: string; loading: boolean; onEdit: (e: Entry) => void; onRemove: (id: number) => void; onAdd: () => void; onTag: (tag: string) => void }) {
  const [expanded, setExpanded] = useState<Entry | null>(null);
  const tags = Array.from(new Set(allEntries.flatMap(entry => tagsExtra(entry.extra.tags))));
  return <div className="inspiration-space">{tags.length > 0 && <nav className="tag-navigator" aria-label="灵感标签导航"><button className={!query ? "active" : ""} onClick={() => onTag("")}>全部灵思</button>{tags.map(tag => <button className={query === tag ? "active" : ""} key={tag} onClick={() => onTag(tag)}>#{tag}</button>)}</nav>}<div className="inspiration-grid">{entries.map((entry, index) => <article className="inspiration-card" key={entry.id} style={{ "--delay": `${index * 45}ms` } as React.CSSProperties}>
    {textExtra(entry.extra.image) && <img className="inspiration-image" src={textExtra(entry.extra.image)} alt={entry.title} />}<div className="inspiration-inner"><div className="card-top"><small>{fmt(entry.updatedAt)}</small><span>念</span></div><h2>{entry.title}</h2><p>{entry.content || "尚未落字。"}</p><div className="tag-row">{tagsExtra(entry.extra.tags).map(tag => <button key={tag} onClick={() => onTag(tag)}>#{tag}</button>)}</div><div className="card-actions"><button className="read-all" onClick={() => setExpanded(entry)}>展开阅览</button><button onClick={() => onEdit(entry)}>修订</button><button onClick={() => onRemove(entry.id)}>移除</button></div></div>
  </article>)}{!entries.length && !loading && <Empty kind="灵思" onAdd={onAdd} />}</div>{expanded && <div className="note-reader-backdrop" onPointerDown={event => event.target === event.currentTarget && setExpanded(null)}><article className="note-reader"><button className="reader-close" onClick={() => setExpanded(null)}>×</button>{textExtra(expanded.extra.image) && <img src={textExtra(expanded.extra.image)} alt={expanded.title} />}<small>一念生花 · {fmt(expanded.updatedAt)}</small><h1>{expanded.title}</h1><div className="tag-row">{tagsExtra(expanded.extra.tags).map(tag => <button key={tag} onClick={() => { onTag(tag); setExpanded(null); }}>#{tag}</button>)}</div><p>{expanded.content || "尚未落字。"}</p></article></div>}</div>;
}

function TagNavigator({ entries, query, onTag, allLabel }: { entries: Entry[]; query: string; onTag: (tag: string) => void; allLabel: string }) {
  const tags = Array.from(new Set(entries.flatMap(entry => tagsExtra(entry.extra.tags))));
  if (!tags.length) return null;
  return <nav className="tag-navigator" aria-label="标签导航"><button className={!query ? "active" : ""} onClick={() => onTag("")}>{allLabel}</button>{tags.map(tag => <button className={query === tag ? "active" : ""} key={tag} onClick={() => onTag(tag)}>#{tag}</button>)}</nav>;
}

function ArtworkView({ entries, allEntries, query, loading, onEdit, onRemove, onAdd, onTag, onOpen }: { entries: Entry[]; allEntries: Entry[]; query: string; loading: boolean; onEdit: (e: Entry) => void; onRemove: (id: number) => void; onAdd: () => void; onTag: (tag: string) => void; onOpen: (images: string[], index: number, title: string) => void }) {
  return <div className="artwork-space"><TagNavigator entries={allEntries} query={query} onTag={onTag} allLabel="全部画稿" /><div className="artwork-gallery">{entries.map(entry => { const images = tagsExtra(entry.extra.images); return <article className="artwork-card" key={entry.id}>
    <div className="artwork-visual">{images.length ? <><img src={images[0]} alt={entry.title} onClick={() => onOpen(images, 0, entry.title)} />{images.length > 1 && <span>共 {images.length} 幅</span>}</> : <div className="artwork-placeholder">画</div>}</div>
    <div className="artwork-copy"><h2>{entry.title}</h2><p>{entry.content || "尚未写下画稿札记。"}</p>{images.length > 1 && <div className="artwork-strip">{images.slice(0, 6).map((image, index) => <button key={image} onClick={() => onOpen(images, index, entry.title)}><img src={image} alt={`${entry.title} ${index + 1}`} /></button>)}</div>}<div className="tag-row">{tagsExtra(entry.extra.tags).map(tag => <button key={tag} onClick={() => onTag(tag)}>#{tag}</button>)}</div><div className="card-actions"><button onClick={() => onEdit(entry)}>修订画卷</button><button onClick={() => onRemove(entry.id)}>移除</button></div></div>
  </article>; })}{!entries.length && !loading && <Empty kind="画稿" onAdd={onAdd} />}</div></div>;
}

function MessageView({ entries, allEntries, query, loading, onEdit, onRemove, onAdd, onTag, onReorder, onOpen }: { entries: Entry[]; allEntries: Entry[]; query: string; loading: boolean; onEdit: (e: Entry) => void; onRemove: (id: number) => void; onAdd: () => void; onTag: (tag: string) => void; onReorder: (dragId: number, targetId: number) => void; onOpen: (images: string[], index: number, title: string) => void }) {
  const dragging = useRef<number | null>(null);
  const touchDrag = useRef({ id: 0, x: 0 });
  return <div className="message-archive"><TagNavigator entries={allEntries} query={query} onTag={onTag} allLabel="全部传讯" />{entries.length > 0 && <><div className="timeline-hint"><i />拖动时间点调整传讯前后顺序</div><div className="message-rail"><div className="message-rail-line" />{entries.map((entry, index) => <div className="message-point" data-message-id={entry.id} draggable key={entry.id} onDragStart={() => { dragging.current = entry.id; }} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragging.current) onReorder(dragging.current, entry.id); dragging.current = null; }} onDragEnd={() => { dragging.current = null; }} onPointerDown={event => { if (event.pointerType !== "mouse") touchDrag.current = { id: entry.id, x: event.clientX }; }} onPointerUp={event => { if (event.pointerType === "mouse" || Math.abs(event.clientX - touchDrag.current.x) < 24) return; const target = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-message-id]"); if (target) onReorder(touchDrag.current.id, Number(target.dataset.messageId)); touchDrag.current = { id: 0, x: 0 }; }} onClick={() => document.getElementById(`message-${entry.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} role="button" tabIndex={0} title="拖动调整位置，点击前往传讯"><i /><span>{textExtra(entry.extra.timelineDate) || `传讯 ${index + 1}`}</span><small>{tagsExtra(entry.extra.tags)[0] || "尺素"}</small></div>)}</div></>}
    <div className="message-books">{entries.map(entry => { const images = tagsExtra(entry.extra.images); return <article id={`message-${entry.id}`} className="message-book" key={entry.id}><header><small>{textExtra(entry.extra.timelineDate) || "时日未记"}</small><h2>{entry.title}</h2><div className="tag-row">{tagsExtra(entry.extra.tags).map(tag => <button key={tag} onClick={() => onTag(tag)}>#{tag}</button>)}</div></header><p>{entry.content}</p><div className="chat-scroll">{images.map((image, index) => <button key={`${image}-${index}`} onClick={() => onOpen(images, index, entry.title)}><img src={image} alt={`${entry.title} 聊天记录 ${index + 1}`} /><span>{String(index + 1).padStart(2, "0")}</span></button>)}</div><footer><span>{images.length} 张聊天截图</span><div className="card-actions"><button onClick={() => onEdit(entry)}>修订此册</button><button onClick={() => onRemove(entry.id)}>移除</button></div></footer></article>; })}</div>{!entries.length && !loading && <Empty kind="传讯" onAdd={onAdd} />}</div>;
}

function QuestionView({ entries, allEntries, query, loading, onEdit, onRemove, onAdd, onTag }: { entries: Entry[]; allEntries: Entry[]; query: string; loading: boolean; onEdit: (e: Entry) => void; onRemove: (id: number) => void; onAdd: () => void; onTag: (tag: string) => void }) {
  const [expanded, setExpanded] = useState<Entry | null>(null);
  return <div className="question-space"><TagNavigator entries={allEntries} query={query} onTag={onTag} allLabel="全部待问" /><div className="entry-grid">{entries.map((entry, index) => <EntryCard entry={entry} index={index} key={entry.id} onEdit={onEdit} onRemove={onRemove} onTag={onTag} onRead={() => setExpanded(entry)} />)}{!entries.length && !loading && <Empty kind="待问" onAdd={onAdd} />}</div>{expanded && <div className="note-reader-backdrop" onPointerDown={event => event.target === event.currentTarget && setExpanded(null)}><article className="note-reader question-reader"><button className="reader-close" onClick={() => setExpanded(null)}>×</button><small>未语 · 欲寄心事</small><h1>{expanded.title}</h1><div className="tag-row">{tagsExtra(expanded.extra.tags).map(tag => <button key={tag} onClick={() => { onTag(tag); setExpanded(null); }}>#{tag}</button>)}</div><p>{expanded.content || "尚未写下缘由。"}</p></article></div>}</div>;
}

function EntryCard({ entry, index, onEdit, onRemove, onTag, onRead }: { entry: Entry; index: number; onEdit: (e: Entry) => void; onRemove: (id: number) => void; onTag: (tag: string) => void; onRead?: () => void }) {
  return <article className="entry-card" style={{ "--delay": `${index * 45}ms` } as React.CSSProperties}><div className="card-top"><small>{fmt(entry.updatedAt)}</small></div><h2>{entry.title}</h2><p>{entry.content || "尚未落字。"}</p>{entry.extra?.url && <a href={textExtra(entry.extra.url)} target="_blank" rel="noreferrer">循迹前往 <span>↗</span></a>}<div className="tag-row">{tagsExtra(entry.extra.tags).map(tag => <button key={tag} onClick={() => onTag(tag)}>#{tag}</button>)}</div><footer><i /><span>私藏</span><div className="card-actions">{onRead && <button className="read-all" onClick={onRead}>展开</button>}<button onClick={() => onEdit(entry)}>修订</button><button onClick={() => onRemove(entry.id)}>移除</button></div></footer></article>;
}

function Empty({ kind, onAdd }: { kind: string; onAdd?: () => void }) { return <div className="empty"><div className="empty-moon"><i /></div><h3>此处尚静</h3><p>第一则{kind}，正等你落笔。</p>{onAdd && <button onClick={onAdd}>写下第一则</button>}</div>; }
