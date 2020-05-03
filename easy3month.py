import datetime

import pywikibot
from dateutil.relativedelta import relativedelta
from pywikibot import User


site = pywikibot.Site()
sysops = []
no_edit_sysops = []
no_event_sysops = []
three_month_ago: datetime.datetime = datetime.datetime.utcnow() - relativedelta(months=3)

for s in site.allusers(group='sysop'):
    sysops.append(User(site, s['name']))

for s in sysops:
    last_edit = s.last_edit
    if last_edit and last_edit[2] < three_month_ago:
        no_edit_sysops.append(s)

for s in no_edit_sysops:
    last_event = s.last_event
    if last_event and last_event.timestamp() < three_month_ago:
        no_event_sysops.append(s)

print(no_event_sysops)
input()
