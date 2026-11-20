/* ============================================================================
 * CapCut Auto-SRT & Viral Hook Studio v2.0 — Core Engine (Zero Dependencies)
 * Author: Quốc Tuấn (@quoctuan364)
 * ============================================================================ */

const TEMPLATES = {
  tech: `Đừng mất 2 tiếng mỗi ngày để ngồi gõ phụ đề thủ công trên CapCut nữa!
Đây là 3 bí mật giúp kênh của bạn tăng gấp đôi thời lượng xem ngay trong tuần này.
Thứ nhất: 3 giây đầu tiên phải đánh thẳng vào nỗi đau của người xem, tuyệt đối không chào hỏi dài dòng.
Thứ hai: Phụ đề chỉ nên để từ 4 đến 6 chữ mỗi dòng để mắt người xem đọc lướt cực nhanh mà không bị mỏi.
Thứ ba: Dùng công cụ tự động ngắt nhịp SRT và kéo thẳng vào Timeline CapCut PC chỉ với 1 lần Import.`,

  review: `Cảnh báo: 90% người mới quay video bán hàng đều mất đơn ngay ở 3 giây đầu tiên!
Lý do không phải sản phẩm tệ, mà vì câu mở đầu chưa chỉ ra vấn đề khách hàng đang gặp phải.
Hãy thử đổi sang công thức 3 bước: Nêu sai lầm phổ biến, đưa ra bằng chứng thực tế, rồi mới giới thiệu giải pháp.
Nhớ giữ tốc độ nói khoảng 175 từ mỗi phút và chèn phụ đề chữ lớn ngay vùng an toàn 9:16.`,

  story: `Sai lầm lớn nhất khi mới tập làm nội dung ngắn là cố nhồi nhét quá nhiều chữ lên màn hình.
Chỉ cần 1 câu chuyện thật kéo dài 35 giây, chia đúng 4 từ mỗi nhịp để tạo cảm giác kịch tính liên tục.
Mỗi đoạn chuyển ý hãy chừa nửa giây nghỉ để người xem kịp tiêu hóa thông tin quan trọng nhất.`
};

const SAMPLE_SCRIPT = TEMPLATES.tech;
const STORAGE_KEY = 'capcut_srt_studio_v2';

const state = {
  cues: [],
  totalDuration: 0,
  manualMode: false,
  isPlaying: false,
  playClockOffsetSec: 0,
  playStartedPerf: 0,
  playbackRate: 1,
  rafId: null,
  mediaUrl: null,
  mediaType: null, // 'video' | 'audio' | null
  teleRunning: false,
  teleRafId: null,
  showSafeZone: true,
  captionStyle: 'cinema',
  captionPos: 'bottom'
};

/* ============================================================================
 * 1. TIME FORMATTING & SRT/VTT PARSING (INTEGER-MS SAFE)
 * ============================================================================ */
function formatSrtTime(totalSeconds) {
  const totalMs = Math.max(0, Math.round(Number(totalSeconds || 0) * 1000));
  const hrs = Math.floor(totalMs / 3600000);
  const mins = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatVttTime(totalSeconds) {
  return formatSrtTime(totalSeconds).replace(',', '.');
}

function formatShortTime(totalSeconds) {
  const safe = Math.max(0, Math.round(Number(totalSeconds || 0)));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseTimestampToSeconds(ts) {
  const clean = String(ts || '').trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return 0;
}

function parseSrtOrVtt(rawText) {
  const clean = String(rawText || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const blocks = clean
    .replace(/^WEBVTT[^\n]*\n+/i, '')
    .trim()
    .split(/\n{2,}/);

  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trimEnd()).filter(Boolean);
    if (lines.length === 0) continue;

    const arrowIdx = lines.findIndex(l => l.includes('-->'));
    if (arrowIdx === -1) continue;

    const timeLine = lines[arrowIdx];
    const [left, rightRaw] = timeLine.split('-->');
    if (!left || !rightRaw) continue;
    const right = rightRaw.trim().split(/\s+/)[0];

    const startSec = Number(Math.max(0, parseTimestampToSeconds(left)).toFixed(2));
    const endSec = Number(Math.max(startSec + 0.1, parseTimestampToSeconds(right)).toFixed(2));
    const text = lines.slice(arrowIdx + 1).join(' ').trim();
    if (!text) continue;

    cues.push({
      index: cues.length + 1,
      startSec,
      endSec,
      duration: Number((endSec - startSec).toFixed(2)),
      text
    });
  }
  return reindexCues(cues);
}

/* ============================================================================
 * 2. PURE CHUNKING & TIMELINE OPERATIONS
 * ============================================================================ */
function reindexCues(cues) {
  return cues.map((c, idx) => {
    const startSec = Number(Math.max(0, Number(c.startSec || 0)).toFixed(2));
    const endSec = Number(Math.max(startSec + 0.15, Number(c.endSec || startSec + 1)).toFixed(2));
    return {
      index: idx + 1,
      startSec,
      endSec,
      duration: Number((endSec - startSec).toFixed(2)),
      text: String(c.text || '').trim()
    };
  });
}

function generateCuesFromScript(rawText, wpm, maxWords, caseMode) {
  if (!rawText || !rawText.trim()) return { cues: [], totalDuration: 0, wordCount: 0 };

  const wordsPerSec = (Number(wpm) || 175) / 60;
  const limit = Math.max(2, Number(maxWords) || 6);
  const rawClauses = rawText
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .flatMap(line => line.split(/(?<=[.!?;:…])\s+/))
    .map(s => s.trim())
    .filter(Boolean);

  const chunks = [];
  let totalWords = 0;

  for (const clause of rawClauses) {
    const subParts = clause.split(/(?<=,)\s+/);
    for (const part of subParts) {
      const words = part.trim().split(/\s+/).filter(Boolean);
      totalWords += words.length;

      let i = 0;
      while (i < words.length) {
        let take = limit;
        if (words.length - (i + take) === 1 && take > 2) {
          take = limit - 1;
        }
        const slice = words.slice(i, i + take);
        let lineText = slice.join(' ');
        if (caseMode === 'upper') lineText = lineText.toUpperCase();
        else if (caseMode === 'no-punct') lineText = lineText.replace(/[.,;:]+$/, '');
        chunks.push({ text: lineText, wordCount: slice.length });
        i += take;
      }
    }
  }

  let cursorSec = 0;
  const cues = chunks.map((ch, idx) => {
    const rawDur = ch.wordCount / wordsPerSec;
    const hasEndPause = /[.!?…]$/.test(ch.text) ? 0.22 : 0.06;
    const duration = Math.max(0.75, Number((rawDur + hasEndPause).toFixed(2)));
    const startSec = Number(cursorSec.toFixed(2));
    const endSec = Number((cursorSec + duration).toFixed(2));
    cursorSec = endSec;
    return { index: idx + 1, startSec, endSec, duration, text: ch.text };
  });

  return { cues, totalDuration: Number(cursorSec.toFixed(2)), wordCount: totalWords };
}

function shiftCuesArray(cues, deltaSec) {
  return reindexCues(
    cues.map(c => {
      const shiftedStart = Math.max(0, c.startSec + deltaSec);
      const shiftedEnd = Math.max(shiftedStart + c.duration, c.endSec + deltaSec);
      return { ...c, startSec: shiftedStart, endSec: shiftedEnd };
    })
  );
}

function splitCueInArray(cues, index) {
  const target = cues[index];
  if (!target) return cues;
  const words = target.text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return cues;

  const mid = Math.ceil(words.length / 2);
  const firstText = words.slice(0, mid).join(' ');
  const secondText = words.slice(mid).join(' ');
  const ratio = mid / words.length;
  const splitPoint = Number((target.startSec + target.duration * ratio).toFixed(2));

  const updated = [...cues];
  updated.splice(
    index,
    1,
    { startSec: target.startSec, endSec: splitPoint, text: firstText },
    { startSec: splitPoint, endSec: target.endSec, text: secondText }
  );
  return reindexCues(updated);
}

function mergeCueWithNextInArray(cues, index) {
  if (index < 0 || index >= cues.length - 1) return cues;
  const a = cues[index];
  const b = cues[index + 1];
  const merged = {
    startSec: a.startSec,
    endSec: Math.max(a.endSec, b.endSec),
    text: `${a.text} ${b.text}`.trim()
  };
  const updated = [...cues];
  updated.splice(index, 2, merged);
  return reindexCues(updated);
}

function computeTotalDuration(cues) {
  if (!cues || cues.length === 0) return 0;
  return Number(Math.max(...cues.map(c => c.endSec)).toFixed(2));
}

function computeAverageCps(cues) {
  if (!cues || cues.length === 0) return 0;
  const totalChars = cues.reduce((sum, c) => sum + c.text.replace(/\s+/g, '').length, 0);
  const totalCueTime = cues.reduce((sum, c) => sum + Math.max(0.1, c.duration), 0);
  return totalCueTime > 0 ? totalChars / totalCueTime : 0;
}

/* ============================================================================
 * 3. UI FEEDBACK & STORAGE
 * ============================================================================ */
function showToast(message, variant = 'ok') {
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${variant}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 2600);
}

function saveDraft() {
  try {
    const payload = {
      script: document.getElementById('scriptInput').value,
      wpm: document.getElementById('selWpm').value,
      maxWords: document.getElementById('selMaxWords').value,
      caseMode: document.getElementById('selCase').value,
      captionStyle: state.captionStyle,
      captionPos: state.captionPos,
      manualMode: state.manualMode,
      cues: state.manualMode ? state.cues : null
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    const chip = document.getElementById('draftSavedChip');
    if (chip) chip.textContent = 'Đã lưu nháp';
  } catch {
    // Ignore storage quota errors
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (typeof saved.script === 'string') {
      document.getElementById('scriptInput').value = saved.script;
    }
    if (saved.wpm) document.getElementById('selWpm').value = saved.wpm;
    if (saved.maxWords) document.getElementById('selMaxWords').value = saved.maxWords;
    if (saved.caseMode) document.getElementById('selCase').value = saved.caseMode;
    if (saved.captionStyle) {
      state.captionStyle = saved.captionStyle;
      document.getElementById('selCaptionStyle').value = saved.captionStyle;
    }
    if (saved.captionPos) {
      state.captionPos = saved.captionPos;
      document.getElementById('selCaptionPos').value = saved.captionPos;
    }
    if (saved.manualMode && Array.isArray(saved.cues) && saved.cues.length > 0) {
      state.manualMode = true;
      state.cues = reindexCues(saved.cues);
      state.totalDuration = computeTotalDuration(state.cues);
    }
    return true;
  } catch {
    return false;
  }
}

/* ============================================================================
 * 4. VIRAL 3-SECOND HOOK ANALYZER
 * ============================================================================ */
function analyzeHook(rawText) {
  const badge = document.getElementById('hookScoreBadge');
  const bar = document.getElementById('hookScoreBar');
  const firstLineEl = document.getElementById('hookFirstLine');
  const fbList = document.getElementById('hookFeedbackList');

  if (!rawText.trim()) {
    badge.textContent = '--/100';
    bar.style.width = '0%';
    firstLineEl.textContent = 'Nhập kịch bản để phân tích câu mở đầu 3 giây...';
    fbList.innerHTML = '';
    return;
  }

  const firstSentence = rawText.trim().split(/[\n.!?]+/)[0].trim();
  const words = firstSentence.split(/\s+/).filter(Boolean);
  const lower = firstSentence.toLowerCase();

  let score = 68;
  const feedback = [];

  if (words.length >= 7 && words.length <= 18) {
    score += 12;
    feedback.push({ type: 'good', text: `Độ dài chuẩn 3s (${words.length} từ)` });
  } else if (words.length > 18) {
    score -= 8;
    feedback.push({ type: 'warn', text: `Hơi dài (${words.length} từ) — nên rút gọn dưới 16 từ` });
  } else {
    feedback.push({ type: 'warn', text: 'Câu mở đầu ngắn, nên bổ sung bối cảnh' });
  }

  if (/\b(đừng|sai lầm|cảnh báo|tuyệt đối|không bao giờ|mất|tránh)\b/i.test(lower)) {
    score += 10;
    feedback.push({ type: 'good', text: 'Có yếu tố Cảnh báo / Phủ định' });
  }
  if (/\d+/.test(firstSentence)) {
    score += 8;
    feedback.push({ type: 'good', text: 'Có con số cụ thể' });
  }
  if (/\b(bí mật|cách|tại sao|lý do|sự thật|mẹo|quy trình|tự động|công thức)\b/i.test(lower)) {
    score += 7;
    feedback.push({ type: 'good', text: 'Tạo Curiosity Gap' });
  }
  if (/^(xin chào|hello|chào mọi người|hôm nay mình sẽ)/i.test(lower)) {
    score -= 18;
    feedback.push({ type: 'warn', text: 'Tránh chào hỏi dài ở 3s đầu' });
  }

  score = Math.min(99, Math.max(40, score));
  badge.textContent = `${score}/100`;
  bar.style.width = `${score}%`;
  bar.style.backgroundColor = score >= 80 ? '#10b981' : '#f59e0b';
  firstLineEl.textContent = `"${firstSentence}"`;
  fbList.innerHTML = feedback.map(f => `<span class="fb-chip ${f.type}">${escapeHtml(f.text)}</span>`).join('');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================================
 * 5. EXPORT & TIMELINE RENDERING
 * ============================================================================ */
function buildSrtContent() {
  return state.cues
    .map(c => `${c.index}\n${formatSrtTime(c.startSec)} --> ${formatSrtTime(c.endSec)}\n${c.text}\n`)
    .join('\n');
}

function buildVttContent() {
  return 'WEBVTT\n\n' + state.cues
    .map(c => `${formatVttTime(c.startSec)} --> ${formatVttTime(c.endSec)}\n${c.text}\n`)
    .join('\n');
}

function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getEffectiveDuration() {
  const vid = document.getElementById('stageVideo');
  const aud = document.getElementById('stageAudio');
  const mediaDur = state.mediaType === 'video' && vid && Number.isFinite(vid.duration)
    ? vid.duration
    : state.mediaType === 'audio' && aud && Number.isFinite(aud.duration)
      ? aud.duration
      : 0;
  return Math.max(state.totalDuration, mediaDur || 0);
}

function updateStatsAndModeBadge() {
  const cues = state.cues;
  const raw = document.getElementById('scriptInput').value;
  const wordCount = raw.trim() ? raw.trim().split(/\s+/).filter(Boolean).length : 0;
  state.totalDuration = computeTotalDuration(cues);
  const effDur = getEffectiveDuration();

  document.getElementById('inputWordStat').textContent = `${wordCount} từ · ${formatShortTime(effDur)}`;
  document.getElementById('statCueCount').textContent = String(cues.length);
  document.getElementById('statTotalDur').textContent = formatShortTime(effDur);
  const avgCue = cues.length > 0 ? (cues.reduce((s, c) => s + c.duration, 0) / cues.length).toFixed(1) : '0.0';
  document.getElementById('statAvgCue').textContent = `${avgCue}s`;

  const avgCps = computeAverageCps(cues);
  const cpsEl = document.getElementById('statAvgCps');
  cpsEl.textContent = `${avgCps.toFixed(1)} CPS`;
  cpsEl.className = `m-val ${avgCps > 20 ? 'danger' : avgCps > 16 ? 'amber' : 'emerald'}`;

  const modeBadge = document.getElementById('modeBadge');
  if (state.manualMode) {
    modeBadge.textContent = 'Thủ công';
    modeBadge.classList.add('manual');
  } else {
    modeBadge.textContent = 'Tự động';
    modeBadge.classList.remove('manual');
  }

  document.getElementById('scrubTotal').textContent = `${effDur.toFixed(1)}s`;
  if (!state.isPlaying) {
    updateCaptionAtTime(state.playClockOffsetSec);
  }
}

function recalculateFromScript(forceAuto = false) {
  const raw = document.getElementById('scriptInput').value;
  analyzeHook(raw);

  if (state.manualMode && !forceAuto) {
    updateStatsAndModeBadge();
    renderSrtList();
    saveDraft();
    return;
  }

  state.manualMode = false;
  const wpm = Number(document.getElementById('selWpm').value);
  const maxWords = Number(document.getElementById('selMaxWords').value);
  const caseMode = document.getElementById('selCase').value;

  const { cues } = generateCuesFromScript(raw, wpm, maxWords, caseMode);
  state.cues = cues;
  state.playClockOffsetSec = 0;

  updateStatsAndModeBadge();
  renderSrtList();
  saveDraft();
}

function renderSrtList() {
  const listEl = document.getElementById('srtBlocksList');
  if (state.cues.length === 0) {
    listEl.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:32px 16px;">Chưa có dòng phụ đề nào. Dán kịch bản bên trái, chọn mẫu kịch bản hoặc bấm Import .SRT.</div>';
    return;
  }

  listEl.innerHTML = state.cues
    .map((c, i) => {
      const charCount = c.text.replace(/\s+/g, '').length;
      const cps = c.duration > 0 ? charCount / c.duration : 0;
      const cpsWarn = cps > 20 ? 'warn' : '';
      return `
      <div class="srt-cue-card" id="cue-card-${i}">
        <div class="cue-meta">
          <div class="cue-meta-left">
            <button type="button" class="cue-seek-btn" data-seek="${i}" title="Phát từ mốc này">#${String(c.index).padStart(2, '0')}</button>
            <input type="number" step="0.1" min="0" class="time-input" data-timefield="startSec" data-cueidx="${i}" value="${c.startSec.toFixed(2)}" aria-label="Bắt đầu dòng ${c.index}" />
            <span>→</span>
            <input type="number" step="0.1" min="0.15" class="time-input" data-timefield="endSec" data-cueidx="${i}" value="${c.endSec.toFixed(2)}" aria-label="Kết thúc dòng ${c.index}" />
          </div>
          <div class="cue-actions">
            <span class="cue-cps ${cpsWarn}">${cps.toFixed(1)} CPS</span>
            <button type="button" class="cue-op-btn" data-op="split" data-cueidx="${i}" title="Tách đôi dòng này">Tách</button>
            <button type="button" class="cue-op-btn" data-op="merge" data-cueidx="${i}" title="Gộp với dòng kế tiếp">Gộp</button>
            <button type="button" class="cue-op-btn del" data-op="delete" data-cueidx="${i}" title="Xóa dòng này">Xóa</button>
          </div>
        </div>
        <input type="text" class="cue-text-edit" data-cueidx="${i}" value="${escapeHtml(c.text)}" />
      </div>`;
    })
    .join('');
}

/* ============================================================================
 * 6. REAL MEDIA + 9:16 STAGE PLAYBACK & SCRUBBING
 * ============================================================================ */
function getActiveMediaEl() {
  if (state.mediaType === 'video') return document.getElementById('stageVideo');
  if (state.mediaType === 'audio') return document.getElementById('stageAudio');
  return null;
}

function applyCaptionStyleAndPos() {
  const capEl = document.getElementById('liveCaptionText');
  capEl.className = `caption-overlay style-${state.captionStyle} pos-${state.captionPos}`;
}

function updateCaptionAtTime(elapsedSec) {
  const effDur = getEffectiveDuration();
  document.getElementById('previewTimecode').textContent = `${elapsedSec.toFixed(1)}s / ${effDur.toFixed(1)}s`;
  document.getElementById('scrubCurrent').textContent = `${elapsedSec.toFixed(1)}s`;

  const scrub = document.getElementById('scrubRange');
  if (effDur > 0) {
    scrub.value = String(Math.min(1000, Math.round((elapsedSec / effDur) * 1000)));
  } else {
    scrub.value = '0';
  }

  const activeIdx = state.cues.findIndex(c => elapsedSec >= c.startSec && elapsedSec < c.endSec);
  const capEl = document.getElementById('liveCaptionText');

  if (activeIdx !== -1) {
    const cue = state.cues[activeIdx];
    if (capEl.textContent !== cue.text) {
      capEl.textContent = cue.text;
    }
    const prev = document.querySelector('.srt-cue-card.active-playing');
    const next = document.getElementById(`cue-card-${activeIdx}`);
    if (prev && prev !== next) prev.classList.remove('active-playing');
    if (next && !next.classList.contains('active-playing')) {
      next.classList.add('active-playing');
      next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } else {
    capEl.textContent = state.cues.length === 0 ? 'Chưa có phụ đề...' : '';
    document.querySelectorAll('.srt-cue-card.active-playing').forEach(el => el.classList.remove('active-playing'));
  }
}

function stopPreview(resetToStart = false) {
  state.isPlaying = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();

  const mediaEl = getActiveMediaEl();
  if (mediaEl) {
    mediaEl.pause();
    if (resetToStart) mediaEl.currentTime = 0;
  }

  if (resetToStart) {
    state.playClockOffsetSec = 0;
    updateCaptionAtTime(0);
  }
  document.getElementById('btnPlayPreview').textContent = 'Phát xem thử';
}

function startPreview(fromSec = null) {
  const effDur = getEffectiveDuration();
  if (effDur <= 0) return;

  if (fromSec !== null) {
    stopPreview(false);
    state.playClockOffsetSec = Math.max(0, Math.min(effDur, fromSec));
  } else if (state.isPlaying) {
    const mediaEl = getActiveMediaEl();
    if (mediaEl) state.playClockOffsetSec = mediaEl.currentTime;
    stopPreview(false);
    return;
  }

  if (state.playClockOffsetSec >= effDur - 0.05) {
    state.playClockOffsetSec = 0;
  }

  state.isPlaying = true;
  document.getElementById('btnPlayPreview').textContent = 'Tạm dừng';

  const mediaEl = getActiveMediaEl();
  if (mediaEl) {
    mediaEl.playbackRate = state.playbackRate;
    mediaEl.currentTime = state.playClockOffsetSec;
    mediaEl.play().catch(() => {});
  } else {
    state.playStartedPerf = performance.now();
    const enableVoice = document.getElementById('chkEnableVoice').checked;
    if (enableVoice && 'speechSynthesis' in window && state.playClockOffsetSec < 0.25) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(document.getElementById('scriptInput').value);
      utter.lang = 'vi-VN';
      const wpm = Number(document.getElementById('selWpm').value);
      utter.rate = (wpm >= 200 ? 1.25 : wpm <= 150 ? 0.95 : 1.1) * state.playbackRate;
      window.speechSynthesis.speak(utter);
    }
  }

  const tick = now => {
    if (!state.isPlaying) return;
    const currentMedia = getActiveMediaEl();
    let elapsed;
    if (currentMedia) {
      elapsed = currentMedia.currentTime;
      state.playClockOffsetSec = elapsed;
      if (currentMedia.ended || elapsed >= effDur) {
        stopPreview(true);
        return;
      }
    } else {
      elapsed = state.playClockOffsetSec + ((now - state.playStartedPerf) / 1000) * state.playbackRate;
      if (elapsed >= effDur) {
        stopPreview(true);
        return;
      }
    }

    updateCaptionAtTime(elapsed);
    state.rafId = requestAnimationFrame(tick);
  };

  state.rafId = requestAnimationFrame(tick);
}

function clearMedia() {
  stopPreview(false);
  const vid = document.getElementById('stageVideo');
  const aud = document.getElementById('stageAudio');
  vid.pause();
  vid.removeAttribute('src');
  vid.classList.add('hidden');
  aud.pause();
  aud.removeAttribute('src');
  aud.classList.add('hidden');

  if (state.mediaUrl) {
    URL.revokeObjectURL(state.mediaUrl);
    state.mediaUrl = null;
  }
  state.mediaType = null;
  document.getElementById('mediaPlaceholder').classList.remove('hidden');
  document.getElementById('audioWaveBar').classList.add('hidden');
  document.getElementById('btnClearMedia').classList.add('hidden');
  document.getElementById('mediaStatusLabel').innerHTML = 'Kéo thả Video/Audio 9:16 vào đây<br/>hoặc chạy thử nhịp tự động';
  document.getElementById('chkEnableVoice').checked = true;
  updateStatsAndModeBadge();
}

function loadMediaFile(file) {
  if (!file) return;
  clearMedia();
  const url = URL.createObjectURL(file);
  state.mediaUrl = url;

  if (file.type.startsWith('video/')) {
    state.mediaType = 'video';
    const vid = document.getElementById('stageVideo');
    vid.src = url;
    vid.classList.remove('hidden');
    document.getElementById('mediaPlaceholder').classList.add('hidden');
    vid.onloadedmetadata = () => {
      updateStatsAndModeBadge();
      showToast(`Đã nạp video "${file.name}" (${vid.duration.toFixed(1)}s)`);
    };
  } else if (file.type.startsWith('audio/')) {
    state.mediaType = 'audio';
    const aud = document.getElementById('stageAudio');
    aud.src = url;
    document.getElementById('mediaPlaceholder').classList.add('hidden');
    document.getElementById('audioWaveBar').classList.remove('hidden');
    aud.onloadedmetadata = () => {
      updateStatsAndModeBadge();
      showToast(`Đã nạp audio "${file.name}" (${aud.duration.toFixed(1)}s)`);
    };
  } else {
    showToast('Vui lòng chọn file Video hoặc Audio hợp lệ.', 'warn');
    clearMedia();
    return;
  }

  document.getElementById('btnClearMedia').classList.remove('hidden');
  document.getElementById('chkEnableVoice').checked = false;
}

/* ============================================================================
 * 7. TELEPROMPTER ENGINE
 * ============================================================================ */
function setupTeleprompter() {
  const modal = document.getElementById('teleprompterModal');
  const scrollArea = document.getElementById('teleScrollArea');
  const textEl = document.getElementById('teleTextContent');
  const toggleBtn = document.getElementById('btnTeleToggle');
  const progEl = document.getElementById('teleProgress');

  const updateProg = () => {
    const max = scrollArea.scrollHeight - scrollArea.clientHeight;
    const pct = max > 0 ? Math.min(100, Math.round((scrollArea.scrollTop / max) * 100)) : 0;
    progEl.textContent = `${pct}%`;
  };

  const stopTele = () => {
    state.teleRunning = false;
    if (state.teleRafId) cancelAnimationFrame(state.teleRafId);
    toggleBtn.textContent = 'Bắt đầu cuộn';
  };

  document.getElementById('btnOpenTeleprompter').addEventListener('click', () => {
    textEl.textContent = document.getElementById('scriptInput').value || SAMPLE_SCRIPT;
    scrollArea.scrollTop = 0;
    updateProg();
    modal.classList.remove('hidden');
  });

  document.getElementById('btnCloseTele').addEventListener('click', () => {
    stopTele();
    modal.classList.add('hidden');
  });

  document.getElementById('teleFontSize').addEventListener('input', e => {
    textEl.style.fontSize = `${e.target.value}px`;
  });

  document.getElementById('btnTeleMirror').addEventListener('click', () => {
    textEl.classList.toggle('mirrored');
  });

  scrollArea.addEventListener('scroll', updateProg);

  toggleBtn.addEventListener('click', () => {
    if (state.teleRunning) {
      stopTele();
      return;
    }
    state.teleRunning = true;
    toggleBtn.textContent = 'Tạm dừng';
    const scrollStep = () => {
      if (!state.teleRunning) return;
      const speed = Number(document.getElementById('teleSpeed').value) * 0.55;
      scrollArea.scrollTop += speed;
      updateProg();
      state.teleRafId = requestAnimationFrame(scrollStep);
    };
    state.teleRafId = requestAnimationFrame(scrollStep);
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      stopTele();
      modal.classList.add('hidden');
    }
  });
}

/* ============================================================================
 * 8. BOOTSTRAP & EVENT WIRING
 * ============================================================================ */
function initApp() {
  const scriptEl = document.getElementById('scriptInput');
  const hadDraft = loadDraft();
  if (!hadDraft || !scriptEl.value.trim()) {
    scriptEl.value = SAMPLE_SCRIPT;
  }

  applyCaptionStyleAndPos();
  recalculateFromScript(false);

  scriptEl.addEventListener('input', () => {
    if (state.manualMode) {
      state.manualMode = false;
    }
    recalculateFromScript(true);
  });

  document.getElementById('selWpm').addEventListener('change', () => recalculateFromScript(true));
  document.getElementById('selMaxWords').addEventListener('change', () => recalculateFromScript(true));
  document.getElementById('selCase').addEventListener('change', () => recalculateFromScript(true));

  document.getElementById('selTemplate').addEventListener('change', e => {
    const key = e.target.value;
    if (!key || !TEMPLATES[key]) return;
    scriptEl.value = TEMPLATES[key];
    recalculateFromScript(true);
    e.target.value = '';
    showToast('Đã nạp kịch bản mẫu.');
  });

  document.getElementById('btnResetDraft').addEventListener('click', () => {
    scriptEl.value = SAMPLE_SCRIPT;
    state.manualMode = false;
    recalculateFromScript(true);
    showToast('Đã khôi phục kịch bản mặc định.');
  });

  // Import .SRT / .VTT
  const srtInput = document.getElementById('fileSrtInput');
  document.getElementById('btnImportSrt').addEventListener('click', () => srtInput.click());
  srtInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseSrtOrVtt(text);
    if (parsed.length === 0) {
      showToast('Không đọc được dòng phụ đề hợp lệ từ file này.', 'warn');
      return;
    }
    state.manualMode = true;
    state.cues = parsed;
    scriptEl.value = parsed.map(c => c.text).join('\n');
    analyzeHook(scriptEl.value);
    updateStatsAndModeBadge();
    renderSrtList();
    saveDraft();
    srtInput.value = '';
    showToast(`Đã import ${parsed.length} dòng từ "${file.name}"`);
  });

  // Import Video / Audio + Drag & Drop
  const mediaInput = document.getElementById('fileMediaInput');
  document.getElementById('btnImportMedia').addEventListener('click', () => mediaInput.click());
  mediaInput.addEventListener('change', e => {
    if (e.target.files[0]) loadMediaFile(e.target.files[0]);
    mediaInput.value = '';
  });

  const dropZone = document.getElementById('mediaDropZone');
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) loadMediaFile(e.dataTransfer.files[0]);
  });

  document.getElementById('btnClearMedia').addEventListener('click', () => {
    clearMedia();
    showToast('Đã gỡ media khỏi sân khấu 9:16.');
  });

  // Time-Shift & Batch Toolbar
  document.querySelectorAll('.shift-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.cues.length === 0) return;
      state.manualMode = true;
      state.cues = shiftCuesArray(state.cues, Number(btn.dataset.shift));
      updateStatsAndModeBadge();
      renderSrtList();
      saveDraft();
      showToast(`Đã dịch toàn bộ timeline ${btn.textContent}`);
    });
  });

  document.getElementById('btnAddCue').addEventListener('click', () => {
    state.manualMode = true;
    const lastEnd = state.cues.length > 0 ? state.cues[state.cues.length - 1].endSec : 0;
    state.cues = reindexCues([
      ...state.cues,
      { startSec: lastEnd, endSec: lastEnd + 1.5, text: 'Dòng phụ đề mới' }
    ]);
    updateStatsAndModeBadge();
    renderSrtList();
    saveDraft();
  });

  document.getElementById('btnRegenerateCues').addEventListener('click', () => {
    recalculateFromScript(true);
    showToast('Đã tạo lại timeline tự động từ kịch bản.');
  });

  // Inline Timeline Cue Actions & Editing
  const listEl = document.getElementById('srtBlocksList');
  listEl.addEventListener('input', e => {
    if (e.target.matches('.cue-text-edit')) {
      const idx = Number(e.target.dataset.cueidx);
      if (state.cues[idx]) {
        state.manualMode = true;
        state.cues[idx].text = e.target.value;
        updateStatsAndModeBadge();
        saveDraft();
      }
    }
  });

  listEl.addEventListener('change', e => {
    if (e.target.matches('.time-input')) {
      const idx = Number(e.target.dataset.cueidx);
      const field = e.target.dataset.timefield;
      const val = Number(e.target.value);
      if (!state.cues[idx] || !Number.isFinite(val)) return;
      state.manualMode = true;
      state.cues[idx][field] = Math.max(0, val);
      state.cues = reindexCues(state.cues);
      updateStatsAndModeBadge();
      renderSrtList();
      saveDraft();
    }
  });

  listEl.addEventListener('click', e => {
    const seekBtn = e.target.closest('[data-seek]');
    if (seekBtn) {
      const idx = Number(seekBtn.dataset.seek);
      if (state.cues[idx]) startPreview(state.cues[idx].startSec);
      return;
    }

    const opBtn = e.target.closest('[data-op]');
    if (!opBtn) return;
    const idx = Number(opBtn.dataset.cueidx);
    const op = opBtn.dataset.op;
    state.manualMode = true;

    if (op === 'split') {
      const next = splitCueInArray(state.cues, idx);
      if (next.length === state.cues.length) {
        showToast('Cần tối thiểu 2 từ để tách dòng.', 'warn');
        return;
      }
      state.cues = next;
    } else if (op === 'merge') {
      if (idx >= state.cues.length - 1) {
        showToast('Không có dòng tiếp theo để gộp.', 'warn');
        return;
      }
      state.cues = mergeCueWithNextInArray(state.cues, idx);
    } else if (op === 'delete') {
      state.cues = reindexCues(state.cues.filter((_, i) => i !== idx));
    }

    updateStatsAndModeBadge();
    renderSrtList();
    saveDraft();
  });

  // Caption Style, Position, Safe Zone & Transport
  document.getElementById('selCaptionStyle').addEventListener('change', e => {
    state.captionStyle = e.target.value;
    applyCaptionStyleAndPos();
    saveDraft();
  });

  document.getElementById('selCaptionPos').addEventListener('change', e => {
    state.captionPos = e.target.value;
    applyCaptionStyleAndPos();
    saveDraft();
  });

  document.getElementById('btnToggleSafeZone').addEventListener('click', e => {
    state.showSafeZone = !state.showSafeZone;
    document.getElementById('safeZoneOverlay').classList.toggle('hidden', !state.showSafeZone);
    e.currentTarget.classList.toggle('active', state.showSafeZone);
  });

  document.getElementById('selPlaybackRate').addEventListener('change', e => {
    state.playbackRate = Number(e.target.value) || 1;
    const m = getActiveMediaEl();
    if (m) m.playbackRate = state.playbackRate;
  });

  document.getElementById('scrubRange').addEventListener('input', e => {
    const effDur = getEffectiveDuration();
    const targetSec = (Number(e.target.value) / 1000) * effDur;
    state.playClockOffsetSec = targetSec;
    const m = getActiveMediaEl();
    if (m) m.currentTime = targetSec;
    updateCaptionAtTime(targetSec);
  });

  document.getElementById('btnPlayPreview').addEventListener('click', () => startPreview(null));

  // Space hotkey for Play/Pause when not typing
  window.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    const tag = (e.target && e.target.tagName) || '';
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return;
    if (!document.getElementById('teleprompterModal').classList.contains('hidden')) return;
    e.preventDefault();
    startPreview(null);
  });

  // Exports
  document.getElementById('btnDownloadSrt').addEventListener('click', () => {
    if (state.cues.length === 0) return;
    downloadFile('capcut-subtitles.srt', buildSrtContent());
    showToast('Đã tải xuống file capcut-subtitles.srt');
  });

  document.getElementById('btnDownloadVtt').addEventListener('click', () => {
    if (state.cues.length === 0) return;
    downloadFile('subtitles.vtt', buildVttContent());
    showToast('Đã tải xuống file subtitles.vtt');
  });

  document.getElementById('btnDownloadTxt').addEventListener('click', () => {
    if (state.cues.length === 0) return;
    downloadFile('script-chunks.txt', state.cues.map(c => c.text).join('\n'));
    showToast('Đã tải xuống file script-chunks.txt');
  });

  document.getElementById('btnCopySrt').addEventListener('click', async e => {
    if (state.cues.length === 0) return;
    try {
      await navigator.clipboard.writeText(buildSrtContent());
      const btn = e.currentTarget;
      btn.textContent = 'Đã Copy';
      setTimeout(() => { btn.textContent = 'Copy SRT'; }, 1500);
      showToast('Đã sao chép toàn bộ nội dung .SRT vào clipboard.');
    } catch {
      showToast('Không thể truy cập clipboard.', 'warn');
    }
  });

  setupTeleprompter();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initApp);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatSrtTime,
    formatVttTime,
    parseSrtOrVtt,
    generateCuesFromScript,
    shiftCuesArray,
    splitCueInArray,
    mergeCueWithNextInArray,
    computeAverageCps
  };
}
