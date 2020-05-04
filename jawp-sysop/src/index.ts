import _dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import $ from 'jquery';

const json: DataJson = require('./data.json');

_dayjs.extend(utc);
let usingUTC: boolean = true;

// UTC/ローカル切り替え用のラッパー
function dayjs(date?: string | number | Date | _dayjs.Dayjs) {
  return usingUTC ? _dayjs(date).utc() : _dayjs(date);
}

interface DataJsonUserInfo {
  name: string;
  lastEditId: number;
  lastEditTimestamp: Date;
  lastEventId: number;
  lastEventTimestamp: Date;
};

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
  estimatedDeSysop: _dayjs.Dayjs;
  sysopOk: boolean; // true: No exceed  false: exceed
};

interface DataJson {
  sysops: DataJsonUserInfo[];
  lastUpdate: Date;
};

const init = () => {
  // データ整理
  const makeSysopsData = () => {
    const userData: UserInfo[] = [];

    // 自動退任までの期間
    const threeMonthAgo = dayjs().subtract(3, 'month');

    json.sysops.forEach((v) => {
      const lastActionType: ActionType = dayjs(v.lastEditTimestamp).isAfter(dayjs(v.lastEventTimestamp))
        ? 'edit'
        : 'log';
      const lastActionId: number = lastActionType === 'edit' ? v.lastEditId : v.lastEventId;
      const lastActionTimestamp: Date = lastActionType === 'edit' ? v.lastEditTimestamp : v.lastEventTimestamp;

      const data: UserInfo = {
        name: v.name,
        lastEditId: v.lastEditId,
        lastEditTimestamp: dayjs(v.lastEditTimestamp),
        lastEditOk: threeMonthAgo.isBefore(dayjs(v.lastEditTimestamp)),
        lastEventId: v.lastEventId,
        lastEventTimestamp: dayjs(v.lastEventTimestamp),
        lastEventOk: threeMonthAgo.isBefore(dayjs(v.lastEventTimestamp)),
        lastActionType,
        lastActionId,
        lastActionTimestamp: dayjs(lastActionTimestamp),
        lastActionOk: threeMonthAgo.isBefore(dayjs(lastActionTimestamp)),
        estimatedDeSysop: dayjs(lastActionTimestamp).add(3, 'month'),
        sysopOk: threeMonthAgo.isBefore(dayjs(lastActionTimestamp)),
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
  const data = makeSysopsData();

  const datePattern: string = 'YYYY/MM/DD HH:mm:ss';

  // 最終更新/ページ描画
  $('#lastUpdate')
    .empty()
    .append(
      $('<ul></ul>').append(
        $('<li>データ最終更新: ' + dayjs(json.lastUpdate).format(datePattern) + '</li>'),
        $('<li>ページ描画: ' + dayjs().format(datePattern) + '</li>')
      )
    );

  const table = $('#sysopTable').empty();

  // 表ヘッダー
  (() => {
    const tr = document.createElement('tr');
    const headers = ['項番', '利用者名', '最新編集 (差分)', '最新ログ (操作)', '最新編集/ログ', '自動退任日時'];
    headers.forEach((value) => {
      const th = document.createElement('th');
      th.textContent = value;
      if (value === '最新編集 (差分)' || value === '最新ログ (操作)') {
        th.className = 'can-hide';
      }
      tr.append(th);
    });
    table.append(tr);
  })();

  // チェックマーク
  const okMark = () => {
    const mark = document.createElement('span');
    mark.textContent = '✓';
    mark.className = 'ok-mark';
    return mark;
  };

  // バツマーク
  const ngMark = () => {
    const mark = document.createElement('span');
    mark.textContent = '✘';
    mark.className = 'ng-mark';
    return mark;
  };

  data.forEach((v, index) => {
    const tr = document.createElement('tr');

    // 項番
    (() => {
      const td = document.createElement('td');
      td.textContent = (index + 1).toString();
      td.className = 'index';
      tr.append(td);
    })();

    // 利用者名
    (() => {
      const td = document.createElement('td');
      td.textContent = v.name;
      td.className = 'username';
      tr.append(td);
    })();

    // 最新編集 (差分)
    (() => {
      const td = document.createElement('td');
      td.className = 'can-hide';
      const mark = v.lastEditOk ? okMark() : ngMark();
      const timestamp = document.createElement('span');
      timestamp.className = 'timestamp';
      timestamp.textContent = v.lastEditTimestamp.format(datePattern);
      const link = document.createElement('a');
      link.href = 'https://ja.wikipedia.org/w/index.php?diff=' + v.lastEditId;
      link.textContent = '(差分)';
      td.append(mark, timestamp, link);
      tr.append(td);
    })();

    // 最新ログ (操作)
    (() => {
      const td = document.createElement('td');
      td.className = 'can-hide';
      const mark = v.lastEventOk ? okMark() : ngMark();
      const timestamp = document.createElement('span');
      timestamp.className = 'timestamp';
      timestamp.textContent = v.lastEventTimestamp.format(datePattern);
      const link = document.createElement('a');
      link.href = 'https://ja.wikipedia.org/w/index.php?title=Special:Log&logid=' + v.lastEventId;
      link.textContent = '(操作)';
      td.append(mark, timestamp, link);
      tr.append(td);
    })();

    // 最新編集/ログ
    (() => {
      const td = document.createElement('td');
      const mark = v.lastActionOk ? okMark() : ngMark();
      const timestamp = document.createElement('span');
      timestamp.className = 'timestamp';
      timestamp.textContent = v.lastActionTimestamp.format(datePattern);
      const link = document.createElement('a');
      link.href =
        'https://ja.wikipedia.org/w/index.php?' +
        (v.lastActionType === 'edit' ? 'diff=' : 'title=Special:Log&logid=') +
        v.lastActionId;
      link.textContent = v.lastActionType === 'edit' ? '(編集)' : '(ログ)';
      td.append(mark, timestamp, link);
      tr.append(td);
    })();

    // 自動退任日時
    (() => {
      const td = document.createElement('td');
      const mark = v.sysopOk ? okMark() : ngMark();
      const timestamp = document.createElement('span');
      timestamp.className = 'timestamp';
      timestamp.textContent = v.estimatedDeSysop.format(datePattern);
      td.append(mark, timestamp);
      tr.append(td);
    })();

    table.append(tr);
  });
};

init();

$('#tz-toggle-switch').click(() => {
  usingUTC = !usingUTC;
  init();
});
