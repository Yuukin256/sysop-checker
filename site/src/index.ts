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
const dayjsFormat = (date: dayjs.Dayjs = dayjs(), format = 'YYYY/MM/DD HH:mm:ss') =>
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
  userData.sort((a, b) => (a.lastActionTimestamp.isBefore(b.lastActionTimestamp) ? -1 : 1));
  return userData;
};

// 表作成関数
const makeTable = (table: JQuery<HTMLElement>, usersData: UserInfo[], rmPeriodHeader: string): JQuery<HTMLElement> => {
  // チェックマーク
  const okMark = '<span class="ok-mark">✓</span>';

  // バツマーク
  const ngMark = '<span class="ng-mark">✘</span>';

  // ウィキペディア日本語版 URLエンドポイント
  const wpEndpoint = 'https://ja.wikipedia.org/w/index.php';

  // 表ヘッダー
  const headersText = ['項番', '利用者', '最新編集 (差分)', '最新ログ (操作)', '最新編集/ログ', rmPeriodHeader];
  const tableHeader =
    '<tr>' +
    headersText.map((value, index) =>
      index == 2 || index == 3 ? `<th class="can-hide">${value}</th>` : `<th>${value}</th>`
    ) +
    '</tr>';

  // 表データ
  const tableRows = usersData.map((v, index) => {
    const tds: string[] = [];
    tds.push(
      // 項番
      `<td class="index">${(index + 1).toString()}</td>`,

      // 利用者
      (() => {
        const name = `<a class="wp-link" href="${wpEndpoint}?title=User:${v.name}">${v.name}</a>`;
        const contributes = `<a href="${wpEndpoint}?title=Special:Contributions/${v.name}">投稿記録</a>`;
        const logs = `<a href="${wpEndpoint}?title=Special:Log&user=${v.name}">ログ</a>`;
        return `<td class="user">${name}<span class="wp-link small">(${contributes} / ${logs})</span></td>`;
      })(),

      // 最新編集 (差分)
      (() => {
        const mark = v.lastEventOk ? okMark : ngMark;
        const timestamp = `<span class="timestamp">${dayjsFormat(v.lastEditTimestamp)}</span>`;
        const link = `<span class="wp-link small">(<a href="${wpEndpoint}?diff=${v.lastEditId}">差分</a>)</span>`;
        return `<td class="can-hide">${mark}${timestamp}${link}</td>`;
      })(),

      // 最新ログ (操作)
      (() => {
        const mark = v.lastEventOk ? okMark : ngMark;
        const timestamp = `<span class="timestamp">${dayjsFormat(v.lastEventTimestamp)}</span>`;
        const link = `<span class="wp-link small">(<a href="${wpEndpoint}?title=Special:Log&logid=${v.lastEventId}">差分</a>)</span>`;
        return `<td class="can-hide">${mark}${timestamp}${link}</td>`;
      })(),

      // 最新編集/ログ
      (() => {
        const mark = v.lastActionOk ? okMark : ngMark;
        const timestamp = `<span class="timestamp">${dayjsFormat(v.lastActionTimestamp)}</span>`;
        const link =
          v.lastActionType === 'edit'
            ? `<a href="${wpEndpoint}?diff=${v.lastEditId}">編集</a>`
            : `<a href="${wpEndpoint}?title=Special:Log&logid=${v.lastEventId}">ログ</a>`;
        return `<td>${mark}${timestamp}<span class="wp-link small">(${link})</span></td>`;
      })(),

      // 権限除去/自動退任 日時
      (() => {
        const mark = v.lastActionOk ? okMark : ngMark;
        const timestamp = `<span class="timestamp">${dayjsFormat(v.estimatedRmRight)}</span>`;
        return `<td>${mark}${timestamp}</td>`;
      })()
    );

    return `<tr>${tds}</tr>`;
  });

  return table.append(tableHeader, ...tableRows);
};

const init = () => {
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

  // 最終更新/ページ描画
  $('#lastUpdate').html(
    `<ul><li>データ最終更新: ${dayjsFormat(dayjs(json.lastUpdate))}</li><li>ページ描画: ${dayjsFormat()}</li></ul>`
  );

  // タイムゾーン切り替えスイッチの調整
  if (usingUTC) {
    $('#utcToggle').addClass('active');
    $('#localToggle').removeClass('active');
  } else {
    $('#localToggle').addClass('active');
    $('#utcToggle').removeClass('active');
  }
  $('#now-timezone').html(`UTC ${dayjsFormat(undefined, 'Z')}`);
};

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
