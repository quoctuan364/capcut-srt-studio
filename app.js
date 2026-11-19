/* ============================================================================
 * CapCut Auto-SRT & Viral Hook Studio — Core Engine (Zero Dependencies)
 * Author: Quốc Tuấn (@quoctuan364)
 * ============================================================================ */

const SAMPLE_SCRIPT = `Đừng mất 2 tiếng mỗi ngày để ngồi gõ phụ đề thủ công trên CapCut nữa!
Đây là 3 bí mật giúp kênh của bạn tăng gấp đôi thời lượng xem ngay trong tuần này.
Thứ nhất: 3 giây đầu tiên phải đánh thẳng vào nỗi đau của người xem, tuyệt đối không chào hỏi dài dòng.
Thứ hai: Phụ đề chỉ nên để từ 4 đến 6 chữ mỗi dòng để mắt người xem đọc lướt cực nhanh mà không bị mỏi.
Thứ ba: Sử dụng công cụ tự động ngắt nhịp SRT và xuất thẳng vào Timeline CapCut PC chỉ với 1 cú kéo thả.
Nếu bạn thấy quy trình này hữu ích, hãy lưu lại video và bình luận chữ CAPCUT ở bên dưới nhé!`;

const state = {
  cues: [], // { index, startSec, endSec, text }
  totalDuration: 0,
  isPlaying: false,
  playStartTime: 0,
  rafId: null,
  teleRunning: false,
  teleRafId: null
};

/* ============================================================================
 * 1. TIME FORMATTING HELPERS (SRT & VTT STANDARDS)
 * ============================================================================ */
function formatSrtTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatVttTime(totalSeconds) {
  return formatSrtTime(totalSeconds).replace(',', '.');
}

function formatShortTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/* ============================================================================
 * 2. INTELLIGENT VIETNAMESE CHUNKING & TIMING ENGINE
 * ============================================================================ */
function generateCuesFromScript(rawText, wpm, maxWords, caseMode) {
  if (!rawText || !rawText.trim()) return { cues: [], totalDuration: 0, wordCount: 0 };

  const wordsPerSec = wpm / 60;
  // Split first by newlines and natural Vietnamese punctuation pauses
  const rawClauses = rawText
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .flatMap(line => line.split(/(?<=[.!?;:…])\s+/))
    .map(s => s.trim())
    .filter(Boolean);

  const chunks = [];
  let totalWords = 0;

  for (const clause of rawClauses) {
    // Also split softly on commas if clause is longer than maxWords
    const subParts = clause.split(/(?<=,)\s+/);
    for (const part of subParts) {
      const words = part.trim().split(/\s+/).filter(Boolean);
      totalWords += words.length;

      let i = 0;
      while (i < words.length) {
        let take = maxWords;
        // Avoid leaving an orphan 1-word line at the end
        if (words.length - (i + take) === 1 && take > 2) {
          take = maxWords - 1;
        }
        let lineText = words.slice(i, i + take).join(' ');
        if (caseMode === 'upper') {
          lineText = lineText.toUpperCase();
        } else if (caseMode === 'no-punct') {
          lineText = lineText.replace(/[.,;:]+$/, '');
        }
        chunks.push({ text: lineText, wordCount: words.slice(i, i + take).length });
        i += take;
      }
    }
  }

  let cursorSec = 0;
  const cues = chunks.map((ch, idx) => {
    // Base duration proportional to word count + micro breath pause
    const rawDur = ch.wordCount / wordsPerSec;
    const hasEndPause = /[.!?…]$/.test(ch.text) ? 0.22 : 0.06;
    const duration = Math.max(0.75, Number((rawDur + hasEndPause).toFixed(2)));
    const startSec = Number(cursorSec.toFixed(2));
    const endSec = Number((cursorSec + duration).toFixed(2));
    cursorSec = endSec;
    return {
      index: idx + 1,
      startSec,
      endSec,
      duration,
      text: ch.text
    };
  });

  return { cues, totalDuration: cursorSec, wordCount: totalWords };
}

/* ============================================================================
 * 3. VIRAL 3-SECOND HOOK ANALYZER
 * ============================================================================ */
function analyzeHook(rawText) {
  const badge = document.getElementById('hookScoreBadge');
  const firstLineEl = document.getElementById('hookFirstLine');
  const fbList = document.getElementById('hookFeedbackList');

  if (!rawText.trim()) {
    badge.textContent = '--/100';
    firstLineEl.textContent = 'Nhập kịch bản để phân tích câu mở đầu 3 giây...';
    fbList.innerHTML = '';
    return;
  }

  const firstSentence = rawText.trim().split(/[\n.!?]+/)[0].trim();
  const words = firstSentence.split(/\s+/).filter(Boolean);
  const lower = firstSentence.toLowerCase();

  let score = 68;
  const feedback = [];

  // Check 1: Length (ideal 3-second hook is 8 - 18 words)
  if (words.length >= 7 && words.length <= 18) {
    score += 12;
    feedback.push({ type: 'good', text: `Độ dài chuẩn 3s (${words.length} từ)` });
  } else if (words.length > 18) {
    score -= 8;
    feedback.push({ type: 'warn', text: `Hơi dài (${words.length} từ) — nên rút gọn dưới 16 từ` });
  } else {
    feedback.push({ type: 'warn', text: 'Câu mở đầu hơi ngắn, cần thêm bối cảnh' });
  }

  // Check 2: Power triggers (Warning, Numbers, Curiosity, Negative Hook)
  if (/\b(đừng|sai lầm|cảnh báo|tuyệt đối|không bao giờ|mất|tránh)\b/i.test(lower)) {
    score += 10;
    feedback.push({ type: 'good', text: 'Có yếu tố Cảnh báo / Phủ định mạnh' });
  }
  if (/\d+/.test(firstSentence)) {
    score += 8;
    feedback.push({ type: 'good', text: 'Có con số cụ thể tạo uy tín' });
  }
  if (/\b(bí mật|cách|tại sao|lý do|sự thật|mẹo|quy trình|tự động)\b/i.test(lower)) {
    score += 7;
    feedback.push({ type: 'good', text: 'Kích thích tò mò (Curiosity Gap)' });
  }

  // Penalize boring intros
  if (/^(xin chào|hello|chào mọi người|hôm nay mình sẽ)/i.test(lower)) {
    score -= 18;
    feedback.push({ type: 'warn', text: 'Tránh chào hỏi dài dòng ở 3 giây đầu!' });
  }

  score = Math.min(99, Math.max(40, score));
  badge.textContent = `${score}/100`;
  firstLineEl.textContent = `"${firstSentence}"`;
  fbList.innerHTML = feedback
    .map(f => `<span class="fb-chip ${f.type}">${f.text}</span>`)
    .join('');
}

/* ============================================================================
 * 4. EXPORT FORMATTERS (.SRT, .VTT, .TXT)
 * ============================================================================ */
function buildSrtContent() {
  return state.cues
    .map(c => `${c.index}\n${formatSrtTime(c.startSec)} --> ${formatSrtTime(c.endSec)}\n${c.text}\n`)
    .join('\n');
}

function buildVttContent() {
  return (
    'WEBVTT\n\n' +
    state.cues
      .map(c => `${formatVttTime(c.startSec)} --> ${formatVttTime(c.endSec)}\n${c.text}\n`)
      .join('\n')
  );
}

function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================================================================
 * 5. UI RENDERING & REACTIVE SYNC
 * ============================================================================ */
function recalculateAndRender() {
  const raw = document.getElementById('scriptInput').value;
  const wpm = Number(document.getElementById('selWpm').value);
  const maxWords = Number(document.getElementById('selMaxWords').value);
  const caseMode = document.getElementById('selCase').value;

  const { cues, totalDuration, wordCount } = generateCuesFromScript(raw, wpm, maxWords, caseMode);
  state.cues = cues;
  state.totalDuration = totalDuration;

  document.getElementById('inputWordStat').textContent = `${wordCount} từ · ${formatShortTime(totalDuration)}`;
  document.getElementById('statCueCount').textContent = cues.length;
  document.getElementById('statTotalDur').textContent = formatShortTime(totalDuration);
  const avgCue = cues.length > 0 ? (totalDuration / cues.length).toFixed(1) : '0.0';
  document.getElementById('statAvgCue').textContent = `${avgCue}s`;

  analyzeHook(raw);
  renderSrtList();

  if (!state.isPlaying) {
    document.getElementById('previewTimecode').textContent = `00:00.0 / ${totalDuration.toFixed(1)}s`;
    document.getElementById('liveCaptionText').textContent = cues[0]
      ? cues[0].text
      : 'Nhập kịch bản để xem trước phụ đề 9:16...';
  }
}

function renderSrtList() {
  const listEl = document.getElementById('srtBlocksList');
  if (state.cues.length === 0) {
    listEl.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:32px 16px;">Chưa có dòng phụ đề nào. Hãy dán kịch bản bên trái hoặc bấm "Nạp kịch bản mẫu".</div>`;
    return;
  }

  listEl.innerHTML = state.cues
    .map(
      (c, i) => `
    <div class="srt-cue-card" id="cue-card-${i}">
      <div class="cue-meta">
        <span>#${String(c.index).padStart(2, '0')} · ${formatSrtTime(c.startSec)} → ${formatSrtTime(c.endSec)}</span>
        <span class="cue-dur">${c.duration.toFixed(2)}s</span>
      </div>
      <input type="text" class="cue-text-edit" data-cueidx="${i}" value="${c.text.replace(/"/g, '&quot;')}" />
    </div>
  `
    )
    .join('');
}

/* ============================================================================
 * 6. LIVE 9:16 PREVIEW PLAYER + WEB SPEECH API VOICEOVER
 * ============================================================================ */
function stopPreview() {
  state.isPlaying = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  document.getElementById('btnPlayPreview').textContent = '▶ Chạy Thử Nhịp Phụ Đề + Giọng Đọc';
  document.querySelectorAll('.srt-cue-card.active-playing').forEach(el => el.classList.remove('active-playing'));
}

function startPreview() {
  if (state.cues.length === 0) return;
  if (state.isPlaying) {
    stopPreview();
    return;
  }

  state.isPlaying = true;
  state.playStartTime = performance.now();
  document.getElementById('btnPlayPreview').textContent = '■ Dừng Xem Trước';

  // Optional Vietnamese TTS Voiceover
  const enableVoice = document.getElementById('chkEnableVoice').checked;
  if (enableVoice && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(document.getElementById('scriptInput').value);
    utter.lang = 'vi-VN';
    const wpm = Number(document.getElementById('selWpm').value);
    utter.rate = wpm >= 200 ? 1.25 : wpm <= 150 ? 0.95 : 1.1;
    window.speechSynthesis.speak(utter);
  }

  let lastCueIdx = -1;

  const tick = now => {
    if (!state.isPlaying) return;
    const elapsed = (now - state.playStartTime) / 1000;

    if (elapsed >= state.totalDuration) {
      stopPreview();
      return;
    }

    document.getElementById('previewTimecode').textContent = `${elapsed.toFixed(1)}s / ${state.totalDuration.toFixed(1)}s`;

    const activeIdx = state.cues.findIndex(c => elapsed >= c.startSec && elapsed < c.endSec);
    if (activeIdx !== -1 && activeIdx !== lastCueIdx) {
      lastCueIdx = activeIdx;
      const cue = state.cues[activeIdx];
      const capEl = document.getElementById('liveCaptionText');
      capEl.textContent = cue.text;
      capEl.style.transform = 'scale(1.06)';
      setTimeout(() => { capEl.style.transform = 'scale(1)'; }, 90);

      document.querySelectorAll('.srt-cue-card.active-playing').forEach(el => el.classList.remove('active-playing'));
      const card = document.getElementById(`cue-card-${activeIdx}`);
      if (card) {
        card.classList.add('active-playing');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    state.rafId = requestAnimationFrame(tick);
  };

  state.rafId = requestAnimationFrame(tick);
}

/* ============================================================================
 * 7. TELEPROMPTER ENGINE
 * ============================================================================ */
function setupTeleprompter() {
  const modal = document.getElementById('teleprompterModal');
  const scrollArea = document.getElementById('teleScrollArea');
  const textEl = document.getElementById('teleTextContent');
  const toggleBtn = document.getElementById('btnTeleToggle');

  const stopTele = () => {
    state.teleRunning = false;
    if (state.teleRafId) cancelAnimationFrame(state.teleRafId);
    toggleBtn.textContent = '▶ Bắt đầu cuộn';
  };

  document.getElementById('btnOpenTeleprompter').addEventListener('click', () => {
    textEl.textContent = document.getElementById('scriptInput').value || SAMPLE_SCRIPT;
    scrollArea.scrollTop = 0;
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

  toggleBtn.addEventListener('click', () => {
    if (state.teleRunning) {
      stopTele();
      return;
    }
    state.teleRunning = true;
    toggleBtn.textContent = '⏸ Tạm dừng';
    const scrollStep = () => {
      if (!state.teleRunning) return;
      const speed = Number(document.getElementById('teleSpeed').value) * 0.55;
      scrollArea.scrollTop += speed;
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
window.addEventListener('DOMContentLoaded', () => {
  const scriptEl = document.getElementById('scriptInput');
  scriptEl.value = SAMPLE_SCRIPT;

  scriptEl.addEventListener('input', recalculateAndRender);
  document.getElementById('selWpm').addEventListener('change', recalculateAndRender);
  document.getElementById('selMaxWords').addEventListener('change', recalculateAndRender);
  document.getElementById('selCase').addEventListener('change', recalculateAndRender);

  // Allow inline editing of individual SRT lines
  document.getElementById('srtBlocksList').addEventListener('input', e => {
    if (e.target.matches('.cue-text-edit')) {
      const idx = Number(e.target.dataset.cueidx);
      if (state.cues[idx]) state.cues[idx].text = e.target.value;
    }
  });

  document.getElementById('selCaptionStyle').addEventListener('change', e => {
    const capEl = document.getElementById('liveCaptionText');
    capEl.className = `caption-overlay style-${e.target.value}`;
  });

  document.getElementById('btnLoadSample').addEventListener('click', () => {
    scriptEl.value = SAMPLE_SCRIPT;
    recalculateAndRender();
  });

  document.getElementById('btnPlayPreview').addEventListener('click', startPreview);

  document.getElementById('btnDownloadSrt').addEventListener('click', () => {
    if (state.cues.length === 0) return;
    downloadFile('capcut-subtitles.srt', buildSrtContent());
  });

  document.getElementById('btnDownloadVtt').addEventListener('click', () => {
    if (state.cues.length === 0) return;
    downloadFile('subtitles.vtt', buildVttContent());
  });

  document.getElementById('btnDownloadTxt').addEventListener('click', () => {
    if (state.cues.length === 0) return;
    downloadFile('script-chunks.txt', state.cues.map(c => c.text).join('\n'));
  });

  document.getElementById('btnCopySrt').addEventListener('click', async e => {
    if (state.cues.length === 0) return;
    await navigator.clipboard.writeText(buildSrtContent());
    const btn = e.currentTarget;
    btn.textContent = 'Đã Copy!';
    setTimeout(() => { btn.textContent = 'Copy SRT'; }, 1500);
  });

  setupTeleprompter();
  recalculateAndRender();
});
