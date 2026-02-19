<script>
import { ref, computed, onUnmounted } from 'vue';
import axios from 'axios';

const API_URL = 'https://api.serble.net/api/v1';
const MAX_STRIKES = 3;
const TIMER_START = 30;

export default {
  setup() {
    // Game state
    const words = ref([]);         // { text, correct }[]
    const strikes = ref(0);
    const secondsLeft = ref(TIMER_START);
    const finished = ref(false);
    const newRecord = ref(false);
    const inputVal = ref('');
    const inputRef = ref(null);

    // Dictionary
    const dictionary = ref(null);
    const dictLoading = ref(true);
    const dictError = ref(false);

    // Record
    const record = ref(parseInt(localStorage.getItem('wordmaster-record') ?? '0', 10));

    // Timer
    let timer = null;

    function startTimer() {
      if (timer) return;
      timer = setInterval(() => {
        secondsLeft.value--;
        if (secondsLeft.value <= 0) {
          secondsLeft.value = 0;
          endGame();
        }
      }, 1000);
    }

    function endGame() {
      clearInterval(timer);
      timer = null;
      finished.value = true;
      checkRecord();
    }

    function checkRecord() {
      const score = words.value.filter(w => w.correct).length;
      if (score > record.value) {
        record.value = score;
        localStorage.setItem('wordmaster-record', String(score));
        newRecord.value = true;
      }
    }

    function submit() {
      if (finished.value || !dictionary.value) return;
      const guess = inputVal.value.trim();
      inputVal.value = '';
      inputRef.value?.focus();
      if (!guess) return;

      // Start the timer on first submission
      if (words.value.length === 0) startTimer();

      const upper = guess.toUpperCase();
      const alreadyUsed = words.value.some(w => w.text.toUpperCase() === upper);
      const correct = dictionary.value.includes(upper) && !alreadyUsed;

      words.value.push({ text: guess, correct });

      if (!correct) {
        strikes.value++;
        if (strikes.value >= MAX_STRIKES) {
          endGame();
        }
      }
    }

    function reset() {
      clearInterval(timer);
      timer = null;
      words.value = [];
      strikes.value = 0;
      secondsLeft.value = TIMER_START;
      finished.value = false;
      newRecord.value = false;
      inputVal.value = '';
      inputRef.value?.focus();
    }

    function handleKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (finished.value) reset();
        else submit();
      }
    }

    // Computed
    const score = computed(() => words.value.filter(w => w.correct).length);
    const lastWord = computed(() => words.value.length ? words.value[words.value.length - 1] : null);
    const timerPercent = computed(() => (secondsLeft.value / TIMER_START) * 100);
    const timerColour = computed(() => {
      if (secondsLeft.value > 15) return '#4ade80';
      if (secondsLeft.value > 7) return '#facc15';
      return '#f87171';
    });
    const strikesArray = computed(() => Array.from({ length: MAX_STRIKES }, (_, i) => i < strikes.value));

    // Load dictionary
    axios.get(`${API_URL}/raw/dictionary`).then(res => {
      dictionary.value = res.data;
      dictLoading.value = false;
    }).catch(() => {
      dictError.value = true;
      dictLoading.value = false;
    });

    onUnmounted(() => {
      clearInterval(timer);
    });

    return {
      words, strikes, secondsLeft, finished, newRecord,
      inputVal, inputRef, score, lastWord, record,
      timerPercent, timerColour, strikesArray,
      dictLoading, dictError,
      submit, reset, handleKey,
      TIMER_START
    };
  }
};
</script>

<template>
  <div class="wm-page">
    <div class="wm-inner">

      <!-- Title -->
      <h1 class="wm-title">{{ $t('word-master') }}</h1>

      <!-- Loading / error state -->
      <div v-if="dictLoading" class="wm-status-card">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16" class="spin text-primary mb-3">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
        </svg>
        <p class="text-muted">{{ $t('loading') }}</p>
      </div>

      <div v-else-if="dictError" class="wm-status-card">
        <p class="text-danger mb-2">{{ $t('unknown-error-occured') }}</p>
        <button class="btn btn-outline-secondary btn-sm" @click="$router.go(0)">{{ $t('reload') }}</button>
      </div>

      <!-- Game board -->
      <div v-else class="wm-board">

        <!-- Stats row -->
        <div class="wm-stats">
          <!-- Word count -->
          <div class="stat-chip">
            <span class="stat-label">{{ $t('words') }}</span>
            <span class="stat-value">{{ score }}</span>
          </div>

          <!-- Strikes -->
          <div class="stat-chip strikes-chip">
            <span
              v-for="(hit, i) in strikesArray"
              :key="i"
              class="strike-dot"
              :class="{ 'strike-dot-hit': hit }"
            ></span>
          </div>

          <!-- Timer / game over -->
          <div class="stat-chip" :class="{ 'stat-chip-danger': finished }">
            <span class="stat-label">{{ finished ? $t('game-over') : $t('time-left') }}</span>
            <span class="stat-value" :style="{ color: finished ? '#f87171' : timerColour }">
              {{ finished ? '—' : secondsLeft + 's' }}
            </span>
          </div>
        </div>

        <!-- Timer bar -->
        <div class="timer-track">
          <div
            class="timer-fill"
            :style="{
              width: timerPercent + '%',
              background: timerColour,
              transition: words.length === 0 ? 'none' : 'width 1s linear, background 0.5s'
            }"
          ></div>
        </div>

        <!-- Last word display -->
        <div class="word-display">
          <div v-if="lastWord" class="word-bubble" :class="lastWord.correct ? 'word-correct' : 'word-wrong'">
            <span class="word-icon">{{ lastWord.correct ? '✓' : '✗' }}</span>
            {{ lastWord.text }}
          </div>
          <div v-else class="word-placeholder">
            {{ $t('enter-word-to-begin') }}
          </div>
        </div>

        <!-- Word history (last 5, scrollable) -->
        <div v-if="words.length > 1" class="word-history">
          <div
            v-for="(w, i) in [...words].reverse().slice(1, 6)"
            :key="i"
            class="history-item"
            :class="w.correct ? 'history-correct' : 'history-wrong'"
          >
            <span class="history-icon">{{ w.correct ? '✓' : '✗' }}</span>
            {{ w.text }}
          </div>
        </div>

        <!-- Input row -->
        <div class="wm-input-row">
          <input
            ref="inputRef"
            type="text"
            class="wm-input"
            :placeholder="$t('enter-word')"
            :readonly="finished"
            v-model="inputVal"
            @keydown="handleKey"
            autocomplete="off"
            spellcheck="false"
            autofocus
          />
          <button
            v-if="!finished"
            class="wm-btn wm-btn-primary"
            @click="submit"
          >{{ $t('submit') }}</button>
          <button
            v-else
            class="wm-btn wm-btn-reset"
            @click="reset"
          >{{ $t('reset') }}</button>
        </div>

        <!-- Record -->
        <div class="record-row">
          <span v-if="newRecord" class="record-badge record-new">
            🏆 {{ $t('new-record') }} {{ record }}
          </span>
          <span v-else class="record-badge">
            {{ $t('record') }} {{ record === 0 ? '—' : record }}
          </span>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.wm-page {
  min-height: 70vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 20px 60px;
}

.wm-inner {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.wm-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #f4f4f5;
  margin: 0;
}

/* Status (loading/error) */
.wm-status-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 14px;
  padding: 48px 32px;
  text-align: center;
  width: 100%;
}

/* Board */
.wm-board {
  width: 100%;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Stats row */
.wm-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.stat-chip {
  background: #111113;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.stat-chip-danger {
  border-color: #3f1515;
  background: #1a0a0a;
}

.stat-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #52525b;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 800;
  color: #f4f4f5;
  line-height: 1;
}

/* Strikes chip */
.strikes-chip {
  flex-direction: row;
  gap: 8px;
  padding: 12px 16px;
}

.strike-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #3f3f46;
  background: transparent;
  transition: background 0.2s, border-color 0.2s;
}

.strike-dot-hit {
  background: #f87171;
  border-color: #f87171;
  box-shadow: 0 0 6px rgba(248, 113, 113, 0.5);
}

/* Timer bar */
.timer-track {
  width: 100%;
  height: 5px;
  background: #27272a;
  border-radius: 999px;
  overflow: hidden;
}

.timer-fill {
  height: 100%;
  border-radius: 999px;
}

/* Word display */
.word-display {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.word-placeholder {
  font-size: 0.9rem;
  color: #3f3f46;
  font-style: italic;
}

.word-bubble {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 10px 28px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.word-correct {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.25);
}

.word-wrong {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.25);
}

.word-icon {
  font-size: 1.1rem;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}

/* History */
.word-history {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid #1f1f23;
  padding-top: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  padding: 4px 8px;
  border-radius: 6px;
  color: #71717a;
}

.history-icon {
  font-size: 0.75rem;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.history-correct .history-icon { color: #4ade80; }
.history-wrong .history-icon   { color: #f87171; }

/* Input row */
.wm-input-row {
  display: flex;
  gap: 8px;
  border-top: 1px solid #1f1f23;
  padding-top: 16px;
}

.wm-input {
  flex: 1;
  background: #111113;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: #f4f4f5;
  font-size: 1rem;
  font-weight: 600;
  padding: 10px 14px;
  text-align: center;
  letter-spacing: 0.05em;
  outline: none;
  transition: border-color 0.15s;
}

.wm-input::placeholder {
  color: #52525b;
  font-weight: 400;
  letter-spacing: 0;
}

.wm-input:focus {
  border-color: #6ea8fe;
}

.wm-input:read-only {
  opacity: 0.4;
  cursor: not-allowed;
}

.wm-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.wm-btn-primary {
  background: #2563eb;
  color: #fff;
}

.wm-btn-primary:hover {
  background: #1d4ed8;
}

.wm-btn-reset {
  background: #dc2626;
  color: #fff;
}

.wm-btn-reset:hover {
  background: #b91c1c;
}

/* Record */
.record-row {
  text-align: center;
}

.record-badge {
  font-size: 0.82rem;
  color: #52525b;
  font-weight: 500;
}

.record-new {
  color: #facc15;
  font-weight: 700;
  font-size: 0.9rem;
}

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 0.9s linear infinite;
  display: block;
  margin: 0 auto;
}
</style>
