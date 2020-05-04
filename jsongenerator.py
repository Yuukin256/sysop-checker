from json import dumps
from time import sleep

import pywikibot
from pywikibot import User


site = pywikibot.Site()
json = {
    'sysops': [],
    'rollbackers': [],
    'eliminators': [],
    'interfaceAdmins': [],
    'lastUpdate': ''
}
rolls = [('sysop', 'sysops'), ('rollbacker', 'rollbackers'), ('eliminator', 'eliminators'),
         ('interface-admin', 'interfaceAdmins')]

for s, p in rolls:
    users = []
    for u in site.allusers(group=s):
        users.append(User(site, u['name']))

    for u in users:
        if u.username == '編集フィルター':
            continue

        last_edit = u.last_edit
        last_event = u.last_event
        data = {
            'name': u.username,
            'lastEditId': last_edit[1] if last_edit else '',
            'lastEditTimestamp': last_edit[2].isoformat() if last_edit else '',
            'lastEventId': last_event.logid() if last_event else '',
            'lastEventTimestamp': last_event.timestamp().isoformat() if last_event else ''
        }
        json[p].append(data)
        print(u.username)
        sleep(1)

json['lastUpdate'] = pywikibot.Timestamp.utcnow().isoformat()

with open('site/src/data.json', 'w', encoding='utf_8') as f:
    f.write(dumps(json, ensure_ascii=False, indent=2))
