$(() => {
  $.getJSON('data.json', (json) => {
    let usingUTC = true;

    dayjs.extend(window.dayjs_plugin_utc);

    // dayjs 文字列フォーマット UTC/ローカル 表示切り替え用
    const dayjsFormat = (date = dayjs(), format = 'YYYY/MM/DD HH:mm:ss') =>
      (usingUTC ? date.utc() : date).format(format);

    // データ整理
    const makeData = (users, rmPeriod) => {
      // 自動退任までの期間
      const rmDeadline = dayjs().subtract(...rmPeriod);

      // 利用者の情報整理
      const userData = users.map((d) => {
        const lastActionType = dayjs(d.lastEditTimestamp).isAfter(dayjs(d.lastEventTimestamp)) ? 'edit' : 'log';
        const lastActionTimestamp = lastActionType === 'edit' ? d.lastEditTimestamp : d.lastEventTimestamp;

        return {
          name: d.name,
          lastEditId: d.lastEditId,
          lastEditTimestamp: dayjs(d.lastEditTimestamp),
          lastEditOk: rmDeadline.isBefore(dayjs(d.lastEditTimestamp)),
          lastEventId: d.lastEventId,
          lastEventTimestamp: dayjs(d.lastEventTimestamp),
          lastEventOk: rmDeadline.isBefore(dayjs(d.lastEventTimestamp)),
          lastActionType,
          lastActionTimestamp: dayjs(lastActionTimestamp),
          lastActionOk: rmDeadline.isBefore(dayjs(lastActionTimestamp)),
          estimatedRmRight: dayjs(lastActionTimestamp).add(...rmPeriod),
        };
      });

      // 自動退任が近い順に並び替え
      userData.sort((a, b) => (a.lastActionTimestamp.isBefore(b.lastActionTimestamp) ? -1 : 1));
      return userData;
    };

    // 表作成関数
    const makeTable = (table, usersData, rmPeriodHeader) => {
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
        const tds = [];
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
            const mark = v.lastEditOk ? okMark : ngMark;
            const timestamp = `<span class="timestamp">${dayjsFormat(v.lastEditTimestamp)}</span>`;
            const link = `<span class="wp-link small">(<a href="${wpEndpoint}?diff=${v.lastEditId}">差分</a>)</span>`;
            return `<td class="can-hide">${mark}${timestamp}${link}</td>`;
          })(),

          // 最新ログ (操作)
          (() => {
            const mark = v.lastEventOk ? okMark : ngMark;
            const timestamp = `<span class="timestamp">${dayjsFormat(v.lastEventTimestamp)}</span>`;
            const link = `<span class="wp-link small">(<a href="${wpEndpoint}?title=Special:Log&logid=${v.lastEventId}">操作</a>)</span>`;
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
      let table;

      // 管理者
      table = $('#sysopTable').html(
        '<caption>管理者<span class="small">(BC CU OS 兼任含む)</span><br><span class="small">3か月で自動退任</span></caption>'
      );
      makeTable(table, sysopData, '最新より3か月');

      // 巻き戻し者
      table = $('#rollbackerTable').html(
        '<caption>巻き戻し者<br /><span class="small">1年で会話ページ通知 その後1か月で権限除去提案</span></caption>'
      );
      makeTable(table, rollbackerData, '最新より1年');

      // 削除者
      table = $('#eliminatorTable').html(
        '<caption>削除者<br /><span class="small">1年で会話ページ通知 その後1か月で権限除去提案</span></caption>'
      );
      makeTable(table, eliminatorData, '最新より1年');

      // インターフェース管理者
      table = $('#interfaceAdminTable').html(
        '<caption>インターフェース管理者<br /><span class="small">6か月で権限除去提案</span></caption>'
      );
      makeTable(table, interfaceAdminData, '最新より6か月');

      // 最終更新/ページ描画
      $('#lastUpdate').html(
        `<ul><li>データ最終更新: ${dayjsFormat(dayjs(json.lastUpdate))}</li><li>ページ描画: ${dayjsFormat()}</li></ul>`
      );

      // タイムゾーン切り替えスイッチのクラス切り替え
      if (usingUTC) {
        $('#utcToggle').addClass('active');
        $('#localToggle').removeClass('active');
      } else {
        $('#localToggle').addClass('active');
        $('#utcToggle').removeClass('active');
      }

      // タイムゾーン表示を切り替え
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
  });
});
