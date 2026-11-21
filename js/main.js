// 画面切替・タイマー・判定・結果計算（画面に出す文章は data.js の GAME_DATA から読む）
(function () {
  'use strict';

  var D = window.GAME_DATA;
  var UI = D.UI;
  var SCREENS = ['title', 'diagnosis', 'collect', 'sort', 'result'];

  // ---------- ゲームの数値（SPEC.md「ゲームシステム」） ----------
  var SECONDS_PER_DAY = 4;        // ゲーム内1日＝実時間4秒
  var TOTAL_DAYS = 30;            // 30日（120秒）から開始
  var WARN_DAYS = 7;              // 残り7日以下で表示を赤みのピンクにして点滅
  var FOCUS_START = 80;
  var FOCUS_MAX = 100;
  var FOCUS_RECOVER = 40;         // 集中力0のあと回復する値
  var FOCUS_ZERO_PENALTY_DAYS = 3; // 集中力0で減る日数
  var FOCUS_DELTA = { collect: 3, temptation: -15, correct: 5, wrong: -10 };
  var SCORE_CORRECT_MAX = 90;     // 達成度のうち正解の配点
  var SCORE_DAYS_DIVISOR = 3;     // 残り日数ボーナス＝残り日数÷3（切り捨て）
  var FORCED_SUBMIT_MS = 2000;    // 「強制提出」演出の表示時間
  var TOAST_MS = 2000;

  var state;
  var toastTimer = null;

  function initialState() {
    return {
      genre: null,
      typePoints: { ensei: 0, genba: 0, saidan: 0, fukyo: 0 },
      deck: [],                   // 今回の書類カード8枚
      collected: [],              // 回収済みカードID
      answers: [],                // { id, chosen, correct }
      sortIndex: 0,
      secondsLeft: TOTAL_DAYS * SECONDS_PER_DAY,
      focus: FOCUS_START,
      temptationTaps: 0,
      flags: { rational: false, splurge: false },
      eventsFired: [],            // 出たイベントのID（重複させない）
      eventDaysFired: [],         // イベントを出し終えた日（22日・12日）
      currentEvent: null,
      timerId: null,
      forcedTimerId: null,
      paused: false,
      finished: false,            // 提出済み（結果へ向かっている）
      screen: 'title',
      diagIndex: 0
    };
  }

  // ---------- 小さな道具 ----------
  function $(id) { return document.getElementById(id); }

  // '回収 {n}/{total}' のような文章の {…} を値に置き換える
  function fmt(text, values) {
    return text.replace(/\{(\w+)\}/g, function (_, key) {
      return values[key] !== undefined ? values[key] : '';
    });
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function cardById(id) { return findById(D.CARDS, id); }
  function categoryLabel(id) { var c = findById(D.CATEGORIES, id); return c ? c.label : ''; }

  function makeButton(label, className, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function showToast(text) {
    var t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, TOAST_MS);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    $('toast').hidden = true;
  }

  // ---------- 画面切替 ----------
  function show(id) {
    state.screen = id;
    SCREENS.forEach(function (s) {
      $(s).classList.toggle('active', s === id);
    });
    $('gameHeader').hidden = !(id === 'collect' || id === 'sort');
    window.scrollTo(0, 0);
  }

  function openModal(id) { $(id).hidden = false; }
  function closeModal(id) { $(id).hidden = true; }

  // ================================================================
  // ① タイトル
  // ================================================================
  function goTitle() {
    if (state) {
      clearInterval(state.timerId);
      clearTimeout(state.forcedTimerId);
    }
    state = initialState();
    closeModal('eventModal');
    closeModal('forcedModal');
    closeModal('howtoModal');
    hideToast();
    show('title');
  }

  // ================================================================
  // ② オタク属性診断
  // ================================================================
  function startDiagnosis() {
    state.diagIndex = 0;
    $('diagQuestionArea').hidden = false;
    $('diagDoneArea').hidden = true;
    renderQuestion();
    show('diagnosis');
  }

  function renderDots(current) {
    var box = $('diagDots');
    box.innerHTML = '';
    for (var i = 0; i < D.DIAGNOSIS.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'dot' + (i < current ? ' on' : '');
      box.appendChild(dot);
    }
  }

  function renderQuestion() {
    var q = D.DIAGNOSIS[state.diagIndex];
    renderDots(state.diagIndex + 1);
    $('diagProgress').textContent = fmt(UI.diagProgress, { n: state.diagIndex + 1, total: D.DIAGNOSIS.length });
    $('diagQuestion').textContent = q.q;
    var box = $('diagChoices');
    box.innerHTML = '';
    q.choices.forEach(function (c) {
      box.appendChild(makeButton(c.label, 'btn-choice', function () { answerQuestion(c); }));
    });
  }

  function answerQuestion(choice) {
    if (state.diagIndex >= D.DIAGNOSIS.length) return;
    if (choice.genre) state.genre = choice.genre;
    if (choice.type) state.typePoints[choice.type] += 1;
    state.diagIndex += 1;
    if (state.diagIndex < D.DIAGNOSIS.length) {
      renderQuestion();
    } else {
      $('diagQuestionArea').hidden = true;
      $('diagDoneArea').hidden = false;
    }
  }

  // ポイントが最大のタイプ（同点は TYPES の並び順で先のもの）
  function otakuType() {
    var best = D.TYPES[0];
    D.TYPES.forEach(function (t) {
      if (state.typePoints[t.id] > state.typePoints[best.id]) best = t;
    });
    return best;
  }

  // ================================================================
  // 提出期限カウントダウン・集中力ゲージ
  // ================================================================
  function daysLeft() { return Math.ceil(state.secondsLeft / SECONDS_PER_DAY); }

  function startTimer() {
    if (state.timerId) return;
    state.timerId = setInterval(tick, 1000);
  }

  function stopTimer() {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  function tick() {
    if (state.paused || state.finished) return;
    state.secondsLeft = Math.max(0, state.secondsLeft - 1);
    afterTimeChange();
    if (!state.finished) maybeFireEvent();
  }

  // 期限を日単位で増減（マイナスで減る）
  function changeDays(days) {
    state.secondsLeft = Math.max(0, state.secondsLeft + days * SECONDS_PER_DAY);
  }

  // 時間が変わったあとの共通処理：表示更新と、0日なら強制提出
  function afterTimeChange() {
    updateHeader();
    if (state.secondsLeft <= 0) forceSubmit();
  }

  function changeFocus(delta) {
    state.focus = clamp(state.focus + delta, 0, FOCUS_MAX);
    if (state.focus === 0) {
      // ゲームオーバーにはせず、期限-3日して集中力を回復
      showToast(UI.focusZero);
      changeDays(-FOCUS_ZERO_PENALTY_DAYS);
      state.focus = FOCUS_RECOVER;
    }
    afterTimeChange();
  }

  function updateHeader() {
    var d = daysLeft();
    var days = $('headerDays');
    days.textContent = fmt(UI.headerDays, { d: d });
    days.classList.toggle('warn', d <= WARN_DAYS);
    $('headerFocus').textContent = fmt(UI.headerFocus, { f: state.focus });
    $('focusFill').style.width = (state.focus / FOCUS_MAX * 100) + '%';
  }

  // 期限0日：③④どちらの途中でも「強制提出」演出のあと結果へ
  function forceSubmit() {
    if (state.finished) return;
    state.finished = true;
    stopTimer();
    closeModal('eventModal');
    openModal('forcedModal');
    state.forcedTimerId = setTimeout(function () {
      closeModal('forcedModal');
      showResult();
    }, FORCED_SUBMIT_MS);
  }

  // ================================================================
  // ランダムイベント（残り22日・12日で1件ずつ。表示中はタイマー停止）
  // ================================================================
  function maybeFireEvent() {
    if (state.paused) return;
    var d = daysLeft();
    for (var i = 0; i < D.EVENT_DAYS.length; i++) {
      var day = D.EVENT_DAYS[i];
      if (d <= day && state.eventDaysFired.indexOf(day) === -1) {
        state.eventDaysFired.push(day);
        openEvent();
        return;
      }
    }
  }

  function openEvent() {
    var remaining = D.EVENTS.filter(function (e) { return state.eventsFired.indexOf(e.id) === -1; });
    if (remaining.length === 0) return;
    var ev = pick(remaining);
    state.eventsFired.push(ev.id);
    state.currentEvent = ev;
    state.paused = true;
    $('eventHeading').textContent = ev.text;
    $('eventABtn').textContent = ev.a.label;
    $('eventBBtn').textContent = ev.b.label;
    openModal('eventModal');
  }

  function chooseEvent(key) {
    var ev = state.currentEvent;
    if (!ev || state.finished) return;
    var opt = ev[key];
    state.currentEvent = null;
    state.paused = false;
    closeModal('eventModal');

    if (opt.flag === 'splurge') state.flags.splurge = true;
    if (opt.flag === 'rational') state.flags.rational = true;
    if (opt.days) changeDays(opt.days);
    if (opt.special === 'postcard') {
      if (state.screen === 'collect') autoCollectOne();
      else if (state.screen === 'sort') changeFocus(opt.postcardFocus);
    }
    if (opt.focus) changeFocus(opt.focus);
    else afterTimeChange();
  }

  // ================================================================
  // ③ 書類集め
  // ================================================================
  // 群ごとに DRAW_COUNTS の枚数だけランダムに選び、順番も混ぜる
  function drawDeck() {
    var ids = [];
    Object.keys(D.DRAW_COUNTS).forEach(function (group) {
      var pool = D.CARDS.filter(function (c) { return c.group === group; });
      shuffle(pool).slice(0, D.DRAW_COUNTS[group]).forEach(function (c) { ids.push(c.id); });
    });
    return shuffle(ids);
  }

  function startCollect() {
    state.deck = drawDeck();
    state.collected = [];

    var tiles = state.deck.map(function (id) { return { kind: 'doc', id: id }; })
      .concat(D.TEMPTATIONS.map(function (name) { return { kind: 'temptation', name: name }; }));

    var grid = $('tileGrid');
    grid.innerHTML = '';
    shuffle(tiles).forEach(function (tile) {
      if (tile.kind === 'doc') {
        var btn = makeButton(UI.docTile, 'tile tile-doc', function () { collectDoc(tile.id, btn, true); });
        btn.setAttribute('data-id', tile.id);
        grid.appendChild(btn);
      } else {
        grid.appendChild(makeButton(tile.name, 'tile tile-temptation', tapTemptation));
      }
    });

    updateCollectCount();
    updateHeader();
    show('collect');
    startTimer();
  }

  function collectDoc(id, btn, byTap) {
    if (state.finished || state.screen !== 'collect') return;
    if (state.collected.indexOf(id) !== -1) return;
    state.collected.push(id);
    btn.disabled = true;
    btn.classList.add('collected');
    updateCollectCount();
    if (byTap) changeFocus(FOCUS_DELTA.collect);
    if (!state.finished && state.collected.length === state.deck.length) startSort();
  }

  // ハガキイベント：未回収の書類を1枚自動で回収
  function autoCollectOne() {
    var grid = $('tileGrid');
    for (var i = 0; i < state.deck.length; i++) {
      var id = state.deck[i];
      if (state.collected.indexOf(id) === -1) {
        collectDoc(id, grid.querySelector('[data-id="' + id + '"]'), false);
        return;
      }
    }
  }

  function tapTemptation() {
    if (state.finished) return;
    state.temptationTaps += 1;
    showToast(pick(D.COMMENTS.temptation));
    changeFocus(FOCUS_DELTA.temptation);
  }

  function updateCollectCount() {
    $('collectCount').textContent = fmt(UI.collectCount, { n: state.collected.length, total: state.deck.length });
  }

  // ================================================================
  // ④ 控除の振り分け（回収した書類だけを出す。未回収は「未提出」）
  // ================================================================
  function startSort() {
    if (state.finished) return;
    state.sortIndex = 0;
    state.answers = [];
    if (state.collected.length === 0) { finishGame(); return; }
    updateHeader();
    renderSortCard();
    show('sort');
  }

  function renderSortCard() {
    var card = cardById(state.collected[state.sortIndex]);
    $('sortProgress').textContent = fmt(UI.sortProgress, { n: state.sortIndex + 1, total: state.collected.length });
    $('cardTitle').textContent = card.title;
    $('cardNote').textContent = card.note;
    $('cardNote').hidden = !card.note;
    $('feedback').hidden = true;
    setCategoryButtonsDisabled(false);
  }

  function buildCategoryButtons() {
    var box = $('categoryButtons');
    box.innerHTML = '';
    D.CATEGORIES.forEach(function (cat) {
      box.appendChild(makeButton(cat.label, 'btn-category', function () { answerCard(cat.id); }));
    });
  }

  function setCategoryButtonsDisabled(disabled) {
    var buttons = $('categoryButtons').querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) buttons[i].disabled = disabled;
  }

  function answerCard(chosen) {
    if (state.finished) return;
    var card = cardById(state.collected[state.sortIndex]);
    if (state.answers.length > state.sortIndex) return; // 二重回答の防止
    var correct = chosen === card.answer;
    state.answers.push({ id: card.id, chosen: chosen, correct: correct });

    var comment;
    if (correct) comment = pick(D.COMMENTS.correct);
    else if (card.oshi) comment = pick(D.COMMENTS.oshiWrong);
    else comment = pick(D.COMMENTS.wrong);

    $('feedbackResult').textContent = correct ? UI.correctLabel : UI.wrongLabel;
    $('feedbackResult').className = 'feedback-result ' + (correct ? 'ok' : 'ng');
    $('feedbackComment').textContent = comment;
    $('feedbackExplain').textContent = (correct ? '' : UI.answerIs + categoryLabel(card.answer) + '　') + card.explain;
    $('feedback').hidden = false;
    setCategoryButtonsDisabled(true);

    changeFocus(correct ? FOCUS_DELTA.correct : FOCUS_DELTA.wrong);
  }

  function nextCard() {
    if (state.finished) return;
    state.sortIndex += 1;
    if (state.sortIndex < state.collected.length) renderSortCard();
    else finishGame();
  }

  // 全カード回答（または回収0枚）で提出
  function finishGame() {
    if (state.finished) return;
    state.finished = true;
    stopTimer();
    showResult();
  }

  // ================================================================
  // ⑤ 結果発表
  // ================================================================
  // 8枚それぞれの結果（回答していないカードは「未提出」で不正解）
  function deckResults() {
    return state.deck.map(function (id) {
      var a = findById(state.answers, id);
      return { id: id, chosen: a ? a.chosen : null, correct: a ? a.correct : false };
    });
  }

  function calcResult() {
    var results = deckResults();
    var correctCount = results.filter(function (r) { return r.correct; }).length;
    var days = daysLeft();
    var score = Math.min(100, Math.floor(
      correctCount / state.deck.length * SCORE_CORRECT_MAX + Math.floor(days / SCORE_DAYS_DIVISOR)
    ));
    var rank = D.TITLES[D.TITLES.length - 1];
    for (var i = 0; i < D.TITLES.length; i++) {
      if (score >= D.TITLES[i].min) { rank = D.TITLES[i]; break; }
    }
    var type = otakuType();
    return {
      results: results,
      correctCount: correctCount,
      days: days,
      score: score,
      rank: rank,
      type: type,
      title: rank.adjective + type.name,
      badge: pickBadge(results, days)
    };
  }

  // バッジは上から優先で1つだけ
  function pickBadge(results, days) {
    var oshiResults = results.filter(function (r) { return cardById(r.id).oshi; });
    var checks = {
      oshiAllNone: function () {
        return oshiResults.length > 0 && oshiResults.every(function (r) { return r.chosen === 'none'; });
      },
      early: function (b) { return days >= b.minDays; },
      iron: function () { return state.flags.rational && state.temptationTaps === 0; },
      splurge: function () { return state.flags.splurge; }
    };
    for (var i = 0; i < D.BADGES.length; i++) {
      var b = D.BADGES[i];
      if (checks[b.id] && checks[b.id](b)) return b;
    }
    return null;
  }

  function showResult() {
    stopTimer();
    hideToast();
    var r = calcResult();
    state.lastResult = r;

    $('resultScore').textContent = fmt(UI.resultScore, { score: r.score });
    $('resultRank').textContent = fmt(UI.resultRank, { rank: r.rank.rank });
    $('resultCorrect').textContent = fmt(UI.resultCorrect, { c: r.correctCount, total: state.deck.length });
    $('resultType').textContent = fmt(UI.resultType, { type: r.type.name });
    $('resultTitleText').textContent = r.title;
    $('resultBadge').textContent = r.badge ? r.badge.label : '';
    $('resultBadge').hidden = !r.badge;

    var list = $('mistakeList');
    list.innerHTML = '';
    var wrong = r.results.filter(function (x) { return !x.correct; });
    if (wrong.length === 0) {
      var li = document.createElement('li');
      li.textContent = UI.noMistakes;
      list.appendChild(li);
    } else {
      wrong.forEach(function (x) {
        var card = cardById(x.id);
        var item = document.createElement('li');
        var name = document.createElement('span');
        name.textContent = (x.chosen === null ? UI.mistakeUnsubmitted : '') + fmt(UI.mistakeItem, { card: card.title });
        var ans = document.createElement('span');
        ans.className = 'mistake-answer';
        ans.textContent = fmt(UI.mistakeAnswer, { answer: categoryLabel(card.answer) });
        item.appendChild(name);
        item.appendChild(ans);
        list.appendChild(item);
      });
    }

    $('resultTrivia').textContent = pick(D.TRIVIA);
    show('result');
  }

  function copyResult() {
    var r = state.lastResult;
    if (!r) return;
    var text = fmt(UI.copyText, { title: r.title, score: r.score, rank: r.rank.rank });
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(UI.copied); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }

  // ダブルクリックで開いたとき（file://）用の予備のコピー方法
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    showToast(ok ? UI.copied : UI.copyFailed);
  }

  // ================================================================
  // 起動
  // ================================================================
  function fillStaticText() {
    var els = document.querySelectorAll('[data-ui]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-ui');
      if (typeof UI[key] === 'string') els[i].textContent = UI[key];
    }
    var ol = $('howtoList');
    ol.innerHTML = '';
    UI.howtoLines.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      ol.appendChild(li);
    });
  }

  function bindButtons() {
    $('startBtn').addEventListener('click', startDiagnosis);
    $('howtoBtn').addEventListener('click', function () { openModal('howtoModal'); });
    $('howtoCloseBtn').addEventListener('click', function () { closeModal('howtoModal'); });
    $('toCollectBtn').addEventListener('click', startCollect);
    $('toSortBtn').addEventListener('click', startSort);
    $('nextBtn').addEventListener('click', nextCard);
    $('retryBtn').addEventListener('click', goTitle);
    $('copyBtn').addEventListener('click', copyResult);
    $('eventABtn').addEventListener('click', function () { chooseEvent('a'); });
    $('eventBBtn').addEventListener('click', function () { chooseEvent('b'); });
  }

  fillStaticText();
  buildCategoryButtons();
  bindButtons();
  goTitle();
})();
