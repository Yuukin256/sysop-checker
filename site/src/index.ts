import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import $ from 'jquery';

const json: DataJson = require('./data.json');

let usingUTC: boolean = true;

dayjs.extend(utc);

interface DataJsonUserInfo {
  name: string;
  lastEditId: number;
  lastEditTimestamp: Date;
  lastEventId: number;
  lastEventTimestamp: Date;
}

interface DataJson {
  sysops: DataJsonUserInfo[];
  rollbackers: DataJsonUserInfo[];
  eliminators: DataJsonUserInfo[];
  interfaceAdmins: DataJsonUserInfo[];
  lastUpdate: Date;
}

type ActionType = 'log' | 'edit';

interface UserInfo {
  name: string;
  lastEditId: number;
  lastEditTimestamp: dayjs.Dayjs;
  lastEditOk: boolean; // true: No exceed  false: exceed
  lastEventId: number;
  lastEventTimestamp: dayjs.Dayjs;
  lastEventOk: boolean; // true: No exceed  false: exceed
  lastActionType: ActionType;
  lastActionTimestamp: dayjs.Dayjs;
  lastActionOk: boolean; // true: No exceed  false: exceed
  estimatedRmRight: dayjs.Dayjs;
}

// dayjs 文字列フォーマット UTC/ローカル 表示切り替え用
const dayjsFormat = (date: dayjs.Dayjs = dayjs(), format: string = 'YYYY/MM/DD HH:mm:ss') =>
  (usingUTC ? date.utc() : date).format(format);

// データ整理
const makeData = (users: DataJsonUserInfo[], rmPeriod: [number, dayjs.OpUnitType]) => {
  const userData: UserInfo[] = [];

  // 自動退任までの期間
  const rmDeadline = dayjs().subtract(...rmPeriod);

  // 利用者の情報整理
  users.forEach((v) => {
    const lastActionType: ActionType = dayjs(v.lastEditTimestamp).isAfter(dayjs(v.lastEventTimestamp)) ? 'edit' : 'log';
    const lastActionTimestamp: Date = lastActionType === 'edit' ? v.lastEditTimestamp : v.lastEventTimestamp;

    const data: UserInfo = {
      name: v.name,
      lastEditId: v.lastEditId,
      lastEditTimestamp: dayjs(v.lastEditTimestamp),
      lastEditOk: rmDeadline.isBefore(dayjs(v.lastEditTimestamp)),
      lastEventId: v.lastEventId,
      lastEventTimestamp: dayjs(v.lastEventTimestamp),
      lastEventOk: rmDeadline.isBefore(dayjs(v.lastEventTimestamp)),
      lastActionType,
      lastActionTimestamp: dayjs(lastActionTimestamp),
      lastActionOk: rmDeadline.isBefore(dayjs(lastActionTimestamp)),
      estimatedRmRight: dayjs(lastActionTimestamp).add(...rmPeriod),
    };

    userData.push(data);
  });

  // 自動退任が近い順に並び替え
  userData.sort((a, b) => {
    if (a.lastActionTimestamp.isBefore(b.lastActionTimestamp)) {
      return -1;
    } else {
      return 1;
    }
  });

  return userData;
};

// 表作成関数
const makeTable = (
  table: JQuery<HTMLElement>,
  usersData: UserInfo[],
  rmPeriodHeader: string = '自動退任日時'
): JQuery<HTMLElement> => {
  // チェックマーク
  const okMark = () => $('<span>✓</span>').addClass('ok-mark');

  // バツマーク
  const ngMark = () => $('<span>✘</span>').addClass('ng-mark');

  // ウィキペディア日本語版 URLエンドポイント
  const wpEndpoint = 'https://ja.wikipedia.org/w/index.php';

  // 表ヘッダー
  (() => {
    const tr = $('<tr></tr>');
    const headers = ['項番', '利用者', '最新編集 (差分)', '最新ログ (操作)', '最新編集/ログ', rmPeriodHeader];
    headers.forEach((value) => {
      const th = $(`<th>${value}</th>`);
      if (value === '最新編集 (差分)' || value === '最新ログ (操作)') {
        th.addClass('can-hide');
      }
      th.appendTo(tr);
    });
    tr.appendTo(table);
  })();

  // 表データ
  usersData.forEach((v, index) => {
    $('<tr></tr>')
      .append(
        // 項番
        $(`<td>${(index + 1).toString()}</td>`).addClass('index'),

        // 利用者
        (() => {
          const name = $(`<a>${v.name}</a>`).addClass('wp-link').prop('href', `${wpEndpoint}?title=User:${v.name}`);
          const links = $('<span></span>')
            .addClass(['wp-link', 'small'])
            .append(
              '(',
              $('<a>投稿記録</a>').prop('href', `${wpEndpoint}?title=Special:Contributions/${v.name}`),
              ' / ',
              $('<a>ログ</a>').prop('href', `${wpEndpoint}?title=Special:Log&user=${v.name}`),
              ')'
            );
          return $(`<td></td>`).addClass('user').append(name, links);
        })(),

        // 最新編集 (差分)
        (() => {
          const mark = v.lastEditOk ? okMark() : ngMark();
          const timestamp = $(`<span>${dayjsFormat(v.lastEditTimestamp)}</span>`).addClass('timestamp');
          const link = $('<span></span>')
            .addClass(['wp-link', 'small'])
            .append('(', $('<a>差分</a>').prop('href', `${wpEndpoint}?diff=${v.lastEditId}`), ')');
          return $('<td></td>').addClass('can-hide').append(mark, timestamp, link);
        })(),

        // 最新ログ (操作)
        (() => {
          const mark = v.lastEventOk ? okMark() : ngMark();
          const timestamp = $(`<span>${dayjsFormat(v.lastEventTimestamp)}</span>`).addClass('timestamp');
          const link = $('<span></span>')
            .addClass(['wp-link', 'small'])
            .append('(', $('<a>操作</a>').prop('href', `${wpEndpoint}?title=Special:Log&logid=${v.lastEventId}`), ')');
          return $('<td></td>').addClass('can-hide').append(mark, timestamp, link);
        })(),

        // 最新編集/ログ
        (() => {
          const mark = v.lastActionOk ? okMark() : ngMark();
          const timestamp = $(`<span>${dayjsFormat(v.lastActionTimestamp)}</span>`).addClass('timestamp');
          const linkContent =
            v.lastActionType === 'edit'
              ? $('<a>編集</a>').prop('href', `${wpEndpoint}?diff=${v.lastEditId}`)
              : $('<a>ログ</a>').prop('href', `${wpEndpoint}?title=Special:Log&logid=${v.lastEventId}`);
          const link = $(`<span></span>`).addClass(['wp-link', 'small']).append('(', linkContent, ')');
          return $('<td></td>').append(mark, timestamp, link);
        })(),

        // 権限除去/自動退任 日時
        (() => {
          const mark = v.lastActionOk ? okMark() : ngMark();
          const timestamp = $(`<span>${dayjsFormat(v.estimatedRmRight)}</span>`).addClass('timestamp');
          return $('<td></td>').append(mark, timestamp);
        })()
      )
      .appendTo(table);
  });

  return table;
};

const init = () => {
  // 表を作成
  let caption: string;

  // 管理者
  caption =
    '<caption>管理者 <span class="small">(BC CU OS 兼任含む)</span><br /><span class="small">3か月で自動退任</span></caption>';
  makeTable($('#sysopTable').html(caption), sysopData, '最新より3か月');

  // 巻き戻し者
  caption =
    '<caption>巻き戻し者<br /><span class="small">1年で会話ページ通知 その後1か月で権限除去提案</span></caption>';
  makeTable($('#rollbackerTable').html(caption), rollbackerData, '最新より1年');

  // 削除者
  caption = '<caption>削除者<br /><span class="small">1年で会話ページ通知 その後1か月で権限除去提案</span></caption>';
  makeTable($('#eliminatorTable').html(caption), eliminatorData, '最新より1年');

  // インターフェース管理者
  caption = '<caption>インターフェース管理者<br /><span class="small">6か月で権限除去提案</span></caption>';
  makeTable($('#interfaceAdminTable').html(caption), interfaceAdminData, '最新より6か月');

  // タイムゾーン切り替えスイッチの調整
  if (usingUTC) {
    $('#utcToggle').addClass('active');
    $('#localToggle').removeClass('active');
  } else {
    $('#localToggle').addClass('active');
    $('#utcToggle').removeClass('active');
  }
};

// 最終更新/ページ描画
$('#lastUpdate')
  .empty()
  .append(
    $('<ul></ul>').append(
      $(`<li>データ最終更新: ${dayjsFormat(dayjs(json.lastUpdate))}</li>`),
      $(`<li>ページ描画: ${dayjsFormat()}</li>`)
    )
  );

// UTC に切り替え
$('#utcToggle').click(() => {
  if (!usingUTC) {
    usingUTC = true;
    init();
  }
});

// ローカルタイムゾーン に切り替え
$('#localToggle').click(() => {
  if (usingUTC) {
    usingUTC = false;
    init();
  }
});

const sysopData = makeData(json.sysops, [3, 'month']);
const rollbackerData = makeData(json.rollbackers, [1, 'year']);
const eliminatorData = makeData(json.eliminators, [1, 'year']);
const interfaceAdminData = makeData(json.interfaceAdmins, [6, 'month']);

init();
