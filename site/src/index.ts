import _dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import $ from 'jquery';

const json: DataJson = require('./data.json');

let usingUTC: boolean = true;

_dayjs.extend(utc);

// UTC/ローカル切り替え用のラッパー
const dayjs = (date?: string | number | Date | _dayjs.Dayjs) => {
  return usingUTC ? _dayjs(date).utc() : _dayjs(date);
};

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
  lastEditTimestamp: _dayjs.Dayjs;
  lastEditOk: boolean; // true: No exceed  false: exceed
  lastEventId: number;
  lastEventTimestamp: _dayjs.Dayjs;
  lastEventOk: boolean; // true: No exceed  false: exceed
  lastActionType: ActionType;
  lastActionId: number;
  lastActionTimestamp: _dayjs.Dayjs;
  lastActionOk: boolean; // true: No exceed  false: exceed
  estimatedRmRight: _dayjs.Dayjs;
  rightOk: boolean; // true: No exceed  false: exceed
}

const init = () => {
  // データ整理
  const makeData = (users: DataJsonUserInfo[], rmPeriod: [number, _dayjs.OpUnitType]) => {
    const userData: UserInfo[] = [];

    // 自動退任までの期間
    const rmDeadline = dayjs().subtract(...rmPeriod);

    users.forEach((v) => {
      const lastActionType: ActionType = dayjs(v.lastEditTimestamp).isAfter(dayjs(v.lastEventTimestamp))
        ? 'edit'
        : 'log';
      const lastActionId: number = lastActionType === 'edit' ? v.lastEditId : v.lastEventId;
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
        lastActionId,
        lastActionTimestamp: dayjs(lastActionTimestamp),
        lastActionOk: rmDeadline.isBefore(dayjs(lastActionTimestamp)),
        estimatedRmRight: dayjs(lastActionTimestamp).add(...rmPeriod),
        rightOk: rmDeadline.isBefore(dayjs(lastActionTimestamp)),
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

  const sysopData = makeData(json.sysops, [3, 'month']);
  const rollbackerData = makeData(json.rollbackers, [1, 'year']);
  const eliminatorData = makeData(json.eliminators, [1, 'year']);
  const interfaceAdminData = makeData(json.interfaceAdmins, [6, 'month']);

  const datePattern = 'YYYY/MM/DD HH:mm:ss';

  // 最終更新/ページ描画
  $('#lastUpdate')
    .empty()
    .append(
      $('<ul></ul>').append(
        $('<li>データ最終更新: ' + dayjs(json.lastUpdate).format(datePattern) + '</li>'),
        $('<li>ページ描画: ' + dayjs().format(datePattern) + '</li>')
      )
    );

  const makeTable = (table: JQuery<HTMLElement>, usersData: UserInfo[]): JQuery<HTMLElement> => {
    // 表ヘッダー
    (() => {
      const tr = $('<tr></tr>');
      const headers = ['項番', '利用者名', '最新編集 (差分)', '最新ログ (操作)', '最新編集/ログ', '自動退任日時'];
      headers.forEach((value) => {
        const th = $(`<th>${value}</th>`);
        if (value === '最新編集 (差分)' || value === '最新ログ (操作)') {
          th.addClass('can-hide');
        }
        tr.append(th);
      });
      table.append(tr);
    })();

    // チェックマーク
    const okMark = () => $('<span>✓</span>').addClass('ok-mark');

    // バツマーク
    const ngMark = () => $('<span>✘</span>').addClass('ng-mark');

    usersData.forEach((v, index) => {
      const tr = $('<tr></tr>');

      // 項番
      tr.append($(`<td>${(index + 1).toString()}</td>`).addClass('index'));

      // 利用者名
      tr.append($(`<td>${v.name}</td>`).addClass('username'));

      // 最新編集 (差分)
      (() => {
        const mark = v.lastEditOk ? okMark() : ngMark();
        const timestamp = $(`<span>${v.lastEditTimestamp.format(datePattern)}</span>`).addClass('timestamp');
        const link = $('<a>(差分)</a>').prop('href', 'https://ja.wikipedia.org/w/index.php?diff=' + v.lastEditId);
        tr.append($('<td></td>').addClass('can-hide').append(mark, timestamp, link));
      })();

      // 最新ログ (操作)
      (() => {
        const mark = v.lastEventOk ? okMark() : ngMark();
        const timestamp = $(`<span>${v.lastEventTimestamp.format(datePattern)}</span>`).addClass('timestamp');
        const link = $('<a>(操作)</a>').prop(
          'href',
          'https://ja.wikipedia.org/w/index.php?title=Special:Log&logid=' + v.lastEventId
        );
        tr.append($('<td></td>').addClass('can-hide').append(mark, timestamp, link));
      })();

      // 最新編集/ログ
      (() => {
        const mark = v.lastActionOk ? okMark() : ngMark();
        const timestamp = $(`<span>${v.lastActionTimestamp.format(datePattern)}</span>`).addClass('timestamp');
        const link = $(`<a>${v.lastActionType === 'edit' ? '(編集)' : '(ログ)'}</a>`).prop(
          'href',
          'https://ja.wikipedia.org/w/index.php?' +
            (v.lastActionType === 'edit' ? 'diff=' : 'title=Special:Log&logid=') +
            v.lastActionId
        );
        tr.append($('<td></td>').append(mark, timestamp, link));
      })();

      // 権限除去/自動退任 日時
      (() => {
        const mark = v.rightOk ? okMark() : ngMark();
        const timestamp = $(`<span>${v.estimatedRmRight.format(datePattern)}</span>`).addClass('timestamp');
        tr.append($('<td></td>').append(mark, timestamp));
      })();

      // 行追加
      table.append(tr);
    });

    return table;
  };

  makeTable(
    $('#sysopTable').html(
      '<caption>管理者 <span class="small">(BC CU OS 兼任含む)</span><br /><span class="small">3か月で自動退任</span></caption>'
    ),
    sysopData
  );
  makeTable(
    $('#rollbackerTable').html(
      '<caption>巻き戻し者<br /><span class="small">1年で会話ページ通知 その後1か月で権限除去提案</span></caption>'
    ),
    rollbackerData
  );
  makeTable(
    $('#eliminatorTable').html(
      '<caption>削除者<br /><span class="small">1年で会話ページ通知 その後1か月で権限除去提案</span></caption>'
    ),
    eliminatorData
  );
  makeTable(
    $('#interfaceAdminTable').html(
      '<caption>インターフェース管理者<br /><span class="small">6か月で権限除去提案</span></caption>'
    ),
    interfaceAdminData
  );

  if (usingUTC) {
    $('#utcToggle').addClass('active');
    $('#localToggle').removeClass('active');
  } else {
    $('#localToggle').addClass('active');
    $('#utcToggle').removeClass('active');
  }
};

init();

$('#utcToggle').click(() => {
  usingUTC = true;
  init();
});

$('#localToggle').click(() => {
  usingUTC = false;
  init();
});
