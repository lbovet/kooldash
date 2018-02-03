var rx = Rx.Observable;
var months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
var days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
var now$ = rx.timer(0, 1000).map(x => new Date())

var events$ = () =>
  rx.timer(0, 58000)
  .flatMap(_ => rx.ajax({ url: config.calendar.calendarUrl, crossDomain: true, responseType: "text" })
    .map(data => Object.values(ical.parseICS(data.response)))
    .flatMap(data => data)
    .filter(entry => entry.type == "VEVENT")
    .filter(event => !config.calendar.ignores.includes(event.summary))
    .flatMap(event => {
      if(event.rrule) {
        var str = event.rrule+";"+RRule.optionsToString({dtstart: event.start});
        var rule = rrulestr(str);
        var duration = event.end - event.start;
        var recently = new Date(date());
        var soon = new Date(date());
        recently.setMonth(recently.getMonth()-1);
        soon.setMonth(soon.getMonth()+1);
        return rx.from(rule.between(recently, soon))
          .filter( date => date)
          .map( date => Object({
            summary: event.summary,
            start: date,
            end: new Date(date.getTime()+duration)
          }))
      } else {
        return rx.of(event)
      }
    })
    .filter(event => {
      var now = date();
      var today = new Date(now);
      today.setHours(0, 0, 0, 0);
      var tomorrow = new Date(today);
      tomorrow.setHours(now.getHours()+24);
      return event.start > today && event.start < tomorrow ||
        event.start < now && event.end > now;
    })
    .toArray()
    .flatMap(events => events.sort((l,r) => l.start-r.start))
    .do(event => {
      var now = date();
      if(event.end - event.start < 64800000) {
          event.time = event.start.toString().split(" ")[4].substring(0,5)
      }
      if(event.start.getDay() != now.getDay()) {
        event.tomorrow = true;
      }
      if(event.start < now && event.end > now) {
        event.now = true;
      }
    }).toArray())

var tasks$ = () =>
  rx.timer(0, 54000)
  .flatMap(_ => rx.ajax({ url: config.calendar.tasksUrl })
    .flatMap(data => data.response)
    .filter(task => config.calendar.taskLists.includes(task.idList))
    .map(task => Object({ summary: task.name, now: config.calendar.nowList == task.idList }))
    .toArray())

var items$ = () => rx.combineLatest(events$(), tasks$(),
  (events, tasks) => events.concat(tasks));

var buses$ = () =>
  rx.timer(0, 300000)
    .flatMap(_ => rx.ajax({ url: config.calendar.busUrl, crossDomain: true })
      .flatMap(data => data.response.connections)
      .map(connection => new Date(Date.parse(connection.from.departure)))
      .toArray())
  .cacheRepeat(5000)
  .flatMap( departures => rx.from(departures)
    .map(departure => Math.round((departure.getTime() - date().getTime()) / (60*1000)))
    .filter(minutes => minutes > 3 && minutes < 60)
    .take(2)
    .toArray())

Vue.component('calendar', function(resolve) {
  rx.ajax({ url: "calendar/calendar.html", responseType: "text"})
  .map(data => Object({
    template: data.response,
    subscriptions: {
      time: now$.map(now => now.toString().split(" ")[4].substring(0,5)),
      day: now$.map(now => days[now.getDay()]),
      date: now$.map(now => now.getUTCDate()),
      month: now$.map(now => months[now.getMonth()]),
      items: items$(),
      buses: buses$()
    },
    methods: {
      itemClass: function(item) {
        if(item) {
          return {
            "list-group-item": true,
            task: !item.start,
            now: item.now,
            tomorrow: item.tomorrow
          }
        }
      }
    }
  }))
  .subscribe(resolve);
})

function date() {
  return new Date();
}
