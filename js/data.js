// 画面に出す文章とゲームのデータはすべてここに置く（ロジックは書かない）
// 年末調整の内容は SPEC.md の記述どおり。変更・追加する前に必ず確認すること
window.GAME_DATA = {
  // 画面の見出し・ボタンなどの文章（{n} などは main.js で数字に置き換える）
  UI: {
    appTitle: '限界オタクの年末調整',
    appSubtitle: '〜推しの周年まであと30日〜',
    subcopy: '提出期限は、周年イベントの前日。',
    start: 'はじめる',
    howto: '遊びかた',
    howtoTitle: '遊びかた',
    // ※ SPEC.md に本文の指定がないため仮の文章
    howtoLines: [
      '診断に答えて、あなたのオタクタイプを決めよう。（仮）',
      '散らかった部屋から、年末調整の書類だけを集めよう。（仮）',
      '集めた書類を、正しい提出先に振り分けよう。（仮）'
    ],
    howtoNote: '推し活費用は控除の対象ではありません。',
    close: 'とじる',

    diagTitle: 'オタク属性診断',
    diagProgress: '{n} / {total}',
    diagDone: '診断完了！',
    toNenmatsu: '年末調整へ',

    headerDays: '提出期限まであと {d}日',
    headerFocus: '集中力 {f}',
    focusZero: '推しの配信アーカイブを見始めてしまった…',
    forcedSubmit: '強制提出',
    forcedSubmitNote: '提出期限になりました。集めた書類をこのまま提出します…',
    unsubmitted: '未提出',

    collectTitle: '書類集め',
    collectHint: '散らかった部屋から、書類だけを集めよう',
    collectCount: '回収 {n}/{total}',
    docTile: '書類',
    toSort: '仕分けへ',

    sortTitle: '控除の振り分け',
    sortProgress: '{n} / {total}',
    correctLabel: '正解！',
    wrongLabel: '不正解…',
    answerIs: '正しい提出先：',
    next: '次へ',

    resultTitle: '結果発表',
    resultScoreLabel: '年末調整の達成度',
    resultScore: '{score}%',
    resultRank: 'ランク {rank}',
    resultCorrect: '正解 {c} / {total}',
    resultType: 'あなたのオタクタイプ：{type}',
    resultBadgeTitle: '称号',
    ticketMark: 'ADMIT ONE',
    mistakes: '間違えたカード（復習用）',
    mistakeItem: '{card}',
    mistakeAnswer: '正しい提出先：{answer}',
    mistakeUnsubmitted: '（未提出）',
    noMistakes: '間違えたカードはありません',
    triviaTitle: '令和8年分の豆知識',
    notice: 'このゲームは令和8年分の制度をもとに簡略化しています。実際の手続きは勤務先の案内と国税庁の情報を確認してください。推し活費用は所得控除の対象ではありません。',
    retry: 'もう一度',
    copy: '結果をコピー',
    copyText: '限界オタクの年末調整\n称号：{title}\n達成度：{score}%（ランク{rank}）',
    copied: 'コピーしました',
    copyFailed: 'コピーできませんでした',

    eventTitle: 'ランダムイベント'
  },

  // 1プレイで各群から引く枚数（A：控除になる / B：確定申告 / C：対象外）
  DRAW_COUNTS: { A: 4, B: 1, C: 3 },

  // 振り分けカテゴリー（SPEC.md「振り分けカテゴリー（6つ）」）
  // label：ボタン名 / formal：正式名称 / content：主な内容
  CATEGORIES: [
    { id: 'fuyo',    label: '扶養控除等申告書',
      formal: '給与所得者の扶養控除等（異動）申告書',
      content: '扶養親族、障害者、ひとり親、勤労学生など' },
    { id: 'kiso',    label: '基礎控除申告書など',
      formal: '基礎控除申告書 兼 配偶者控除等申告書 兼 所得金額調整控除申告書 兼 特定親族特別控除申告書',
      content: '本人の所得見積額（基礎控除）、配偶者控除など' },
    { id: 'hoken',   label: '保険料控除申告書',
      formal: '給与所得者の保険料控除申告書',
      content: '生命保険料、地震保険料、本人が直接払った社会保険料、小規模企業共済等掛金（iDeCo）' },
    { id: 'jutaku',  label: '住宅ローン控除申告書',
      formal: '給与所得者の（特定増改築等）住宅借入金等特別控除申告書',
      content: '2年目以降の住宅ローン控除' },
    { id: 'kakutei', label: '年末調整では不可（確定申告へ）',
      formal: '',
      content: '医療費控除、寄附金控除（ふるさと納税）、住宅ローン控除の1年目' },
    { id: 'none',    label: '控除対象外',
      formal: '',
      content: '推し活費用すべて' }
  ],

  // 書類カード14枚（SPEC.md「書類カード一覧（14枚）」の文章をそのまま使用）
  // title：カード文 / answer：CATEGORIES の id / oshi：推し活費用なら true / explain：解説
  CARDS: [
    { id: 'a1', group: 'A', title: '生命保険料控除証明書（自分が契約して払っている医療保険）', note: '',
      answer: 'hoken', oshi: false,
      explain: '医療保険は介護医療保険料として生命保険料控除の対象。証明書を添えて提出する' },
    { id: 'a2', group: 'A', title: '推しがCMに出ている保険会社の定期保険（自分が契約・支払い）の控除証明書', note: '',
      answer: 'hoken', oshi: false,
      explain: '控除になるのは生命保険だから。推しがCMに出ていることは関係ない' },
    { id: 'a3', group: 'A', title: '地震保険料控除証明書（自分の部屋の火災保険に付けた地震保険）', note: '',
      answer: 'hoken', oshi: false,
      explain: '地震保険料控除の対象（最高5万円）。火災保険の部分は対象外' },
    { id: 'a4', group: 'A', title: '同居する弟の国民年金保険料を自分が払った控除証明書', note: '',
      answer: 'hoken', oshi: false,
      explain: '生計を一にする親族の分を本人が払った場合、社会保険料控除の対象。給与天引きの健保・厚生年金は書かなくてよい' },
    { id: 'a5', group: 'A', title: 'iDeCoの小規模企業共済等掛金払込証明書（自分の口座から振替）', note: '',
      answer: 'hoken', oshi: false,
      explain: '個人で払い込んだiDeCo掛金は小規模企業共済等掛金控除の対象で、全額が控除される' },
    { id: 'a6', group: 'A', title: '同居して生計を一にする母の情報（パートの給与収入 年100万円）', note: '',
      answer: 'fuyo', oshi: false,
      explain: '令和8年分から扶養親族の所得要件は合計所得62万円以下（給与だけなら収入136万円以下）。100万円なら扶養親族になれる' },
    { id: 'a7', group: 'A', title: '自分の今年の給与収入の見積額', note: '',
      answer: 'kiso', oshi: false,
      explain: '基礎控除は本人の合計所得金額で額が決まるので、見積額を基礎控除申告書に書く' },
    { id: 'a8', group: 'A', title: '税務署から届いた住宅借入金等特別控除申告書（マンション購入から2年目）', note: '',
      answer: 'jutaku', oshi: false,
      explain: '1年目に確定申告を済ませれば、2年目以降は年末調整で控除できる' },
    { id: 'b1', group: 'B', title: '歯科の治療費の領収書', note: '',
      answer: 'kakutei', oshi: false,
      explain: '医療費控除は年末調整では受けられず、本人が確定申告する' },
    { id: 'b2', group: 'B', title: 'ふるさと納税の寄附金受領証明書（推しの出身地に寄附）', note: '',
      answer: 'kakutei', oshi: false,
      explain: '寄附金控除は年末調整の対象外。確定申告か、条件を満たせばワンストップ特例で手続きする' },
    { id: 'c1', group: 'C', title: '遠征の新幹線とホテルの領収書', note: '',
      answer: 'none', oshi: true,
      explain: '個人の趣味の旅費はどの控除にも当たらない' },
    { id: 'c2', group: 'C', title: 'アクスタとランダムトレカの購入レシート', note: '',
      answer: 'none', oshi: true,
      explain: 'グッズ代は個人の消費。何枚買っても控除にはならない' },
    { id: 'c3', group: 'C', title: 'ライブチケット代とファンクラブ年会費の明細', note: '',
      answer: 'none', oshi: true,
      explain: 'チケット代も会費も個人の娯楽費で、控除の対象ではない' },
    { id: 'c4', group: 'C', title: '推しの誕生日祭のケーキとお花代', note: '',
      answer: 'none', oshi: true,
      explain: 'お祝いの費用も個人の支出。推しへの愛は控除できない' }
  ],

  // 書類集めの誘惑アイテム
  TEMPTATIONS: ['アクスタ', 'ランダムトレカ（未開封）', 'ペンライト', '推しウチワ'],

  // ランダムイベント（SPEC.md「ランダムイベント」）
  // focus：集中力の増減 / days：期限の増減（日） / flag：立てるフラグ
  // special: 'postcard' は「③中なら書類1枚を自動回収、④中なら集中力+postcardFocus」
  EVENT_DAYS: [22, 12],
  EVENTS: [
    { id: 'visual',  text: '推しの新ビジュアル解禁！',
      a: { label: '今すぐ拝む', focus: 20, days: -2 },
      b: { label: '後でじっくり', focus: -5, days: 0 } },
    { id: 'goods',   text: '周年グッズの受注が今夜締切',
      a: { label: '全種ポチる', focus: 0, days: -1, flag: 'splurge' },
      b: { label: '年末調整を優先', focus: -5, days: 0, flag: 'rational' } },
    { id: 'ticket',  text: '同担から「周年チケ当たった！」',
      a: { label: '即レス', focus: 15, days: -1 },
      b: { label: 'スタンプだけ', focus: 0, days: 0 } },
    { id: 'mail',    text: '総務から催促メール',
      a: { label: 'すぐ対応します', focus: 10, days: 0 },
      b: { label: '既読スルー', focus: -10, days: 0 } },
    { id: 'postcard', text: '保険会社からハガキが届いた',
      a: { label: '開封する', focus: 0, days: 0, special: 'postcard', postcardFocus: 10 },
      b: { label: '後で', focus: 0, days: 0 } },
    { id: 'stream',  text: '推しの生配信が始まった',
      a: { label: 'BGMにして作業', focus: 10, days: -1 },
      b: { label: 'アーカイブで見る', focus: -5, days: 0 } }
  ],

  // コメント（SPEC.md「コメント文の例」。場面ごとにランダム表示）
  COMMENTS: {
    correct: [
      '提出先、完璧。総務さんが拝んでる',
      'その判断力、チケットの名義確認で鍛えたやつだ',
      '書類の推し事情も把握済み。素晴らしい'
    ],
    wrong: [
      '惜しい！解釈違いは公式からの供給を待ちましょう',
      'その書類、提出先を推し違いしてます'
    ],
    // 推し活費用のカードを控除対象外以外に振り分けたとき
    oshiWrong: [
      '気持ちは痛いほどわかる。でも税法は推しを知らない…',
      '尊い出費だけど、控除にはなりません'
    ],
    temptation: [
      'それは推しのアクスタです。提出しないでください',
      '開封は年末調整のあとで！'
    ]
  },

  // オタクタイプ（並び順＝同点のときの優先順）
  TYPES: [
    { id: 'ensei',  name: '遠征ガチ勢' },
    { id: 'genba',  name: '現場皆勤賞' },
    { id: 'saidan', name: '祭壇建築士' },
    { id: 'fukyo',  name: '在宅布教師' }
  ],

  // 称号＝ランクの形容詞＋オタクタイプ（min：その達成度以上でこのランク。上から判定）
  TITLES: [
    { rank: 'S', min: 95, adjective: '税法と推しを両立する' },
    { rank: 'A', min: 80, adjective: '控除証明書を持ち歩く' },
    { rank: 'B', min: 60, adjective: '締切前夜に覚醒する' },
    { rank: 'C', min: 0,  adjective: '来年こそ本気を出す' }
  ],

  // 特殊バッジ（上から優先、1つだけ）
  BADGES: [
    { id: 'oshiAllNone', label: '推し活費は心の控除',
      condition: '推し活費用のカードを全部「控除対象外」に振り分けた' },
    { id: 'early',       label: '早期提出の天才',
      condition: '残り15日以上で提出', minDays: 15 },
    { id: 'iron',        label: '鉄の理性',
      condition: '理性フラグあり、誘惑タップ0回' },
    { id: 'splurge',     label: '散財も推しのため',
      condition: '散財フラグあり' }
  ],

  // 令和8年分の豆知識（結果画面でランダムに1つ表示）
  TRIVIA: [
    '令和8年分の基礎控除は、合計所得489万円以下なら最大104万円（令和8・9年分の特例を含む）',
    '扶養親族の所得要件は合計所得62万円以下（給与だけなら収入136万円以下）に引き上げ',
    '23歳未満の扶養親族がいると、一般の生命保険料控除の上限が6万円に（令和8・9年分）',
    '今年の改正分は毎月の源泉徴収には反映されず、12月の年末調整でまとめて精算される'
  ],

  // オタク属性診断（SPEC.md「② オタク属性診断」）
  // genre：Q1の回答として保存（加算なし） / type：ポイントを加算するタイプ
  DIAGNOSIS: [
    { q: 'Q1 推しのジャンルは？', choices: [
      { label: 'アイドル', genre: 'idol' },
      { label: '2.5次元・舞台', genre: 'stage' },
      { label: 'アニメ・ソシャゲ', genre: 'anime' },
      { label: 'VTuber・配信者', genre: 'vtuber' }
    ] },
    { q: 'Q2 遠征の頻度は？', choices: [
      { label: '月1以上', type: 'ensei' },
      { label: '年数回', type: 'genba' },
      { label: '近場だけ', type: 'saidan' },
      { label: '在宅派', type: 'fukyo' }
    ] },
    { q: 'Q3 グッズの買い方は？', choices: [
      { label: '全種コンプ', type: 'saidan' },
      { label: '推しの分だけ', type: 'genba' },
      { label: '布教用に複数', type: 'fukyo' },
      { label: '買わず遠征費へ', type: 'ensei' }
    ] },
    { q: 'Q4 推し活の軸は？', choices: [
      { label: '現場に行く', type: 'genba' },
      { label: '祭壇を作る', type: 'saidan' },
      { label: 'SNSで布教', type: 'fukyo' },
      { label: 'どこへでも飛ぶ', type: 'ensei' }
    ] }
  ]
};
