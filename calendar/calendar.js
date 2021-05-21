if (window.require) {
  window.ical = require('ical');
  window.RRule = require('rrule');
  window.rrulestr = RRule.rrulestr;
}

var rx = Rx.Observable;

var months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
var days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
var now$ = rx.timer(0, 1000).map(x => new Date())

var events$ = () =>
  rx.merge(rx.fromEvent(window, 'online').delay(8000), rx.timer(0, 58000))
    .debounceTime(10000)
    .flatMap(_ => rx.from(config.calendar.calendarUrls).flatMap(url => rx.ajax({ url: url, crossDomain: true, responseType: "text" }))
      .swallowError()
      .map(data => Object.values(ical.parseICS(data.response)))
      .flatMap(data => data)
      .filter(entry => entry.type == "VEVENT")
      .filter(event => !config.calendar.ignores.includes(event.summary))
      .flatMap(event => {
        if (event.rrule) {
          var str = event.rrule + ";" + RRule.optionsToString({ dtstart: event.start });
          var rule = rrulestr(str);
          var duration = event.end - event.start;
          var recently = new Date(date());
          var soon = new Date(date());
          recently.setMonth(recently.getMonth() - 1);
          soon.setMonth(soon.getMonth() + 1);
          return rx.from(rule.between(recently, soon))
            .filter(date => date)
            .map(date => Object({
              summary: event.summary,
              start: date,
              end: new Date(date.getTime() + duration)
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
        tomorrow.setHours(now.getHours() + 24);
        return event.start > now && event.start < tomorrow ||
          event.start < now && event.end > now;
      })
      .toArray()
      .flatMap(events => events.sort((l, r) => l.start - r.start))
      .do(event => {
        var now = date();
        if (event.end - event.start < 64800000) {
          event.time = event.start.toString().split(" ")[4].substring(0, 5)
        }
        if (event.start.getDay() != now.getDay()) {
          event.tomorrow = true;
        }
        if (event.start - now < 4 * 3600 * 1000 && event.end > now) {
          event.now = true;
        }
      }).toArray())

var tasks$ = () =>
  rx.merge(rx.fromEvent(window, 'online').delay(8000), rx.timer(0, 54000))
    .debounceTime(10000)
    .flatMap(_ => rx.ajax({ url: config.calendar.tasksUrl })
      .swallowError()
      .flatMap(data => data.response)
      .filter(task => config.calendar.taskLists.includes(task.idList))
      .map(task => Object({ summary: task.name, now: config.calendar.nowList == task.idList }))
      .toArray())

var notes$ = () =>
  rx.merge(rx.fromEvent(window, 'online').delay(3000), rx.timer(0, 55000))
    .debounceTime(500)
    .flatMap(_ => rx.ajax({ url: config.calendar.notesUrl })
      .swallowError()
      .flatMap(data => data.response.notes)
      .map(note => Object({ summary: note, now: true }))
      .toArray())

var items$ = () => rx.combineLatest(events$(), notes$(), tasks$(),
  (events, notes, tasks) => events.concat(notes).concat(tasks));

var buses$ = () =>
  rx.merge(rx.fromEvent(window, 'online').delay(8000), rx.timer(0, 300000))
    .debounceTime(10000)
    .flatMap(_ => rx.ajax({ url: config.calendar.busUrl, crossDomain: true })
      .swallowError()
      .flatMap(data => data.response.connections)
      .map(connection => new Date(Date.parse(connection.from.departure)))
      .toArray())
    .cacheRepeat(5000)
    .flatMap(departures => rx.from(departures)
      .map(departure => Math.round((departure.getTime() - date().getTime()) / (60 * 1000)))
      .filter(minutes => minutes > 3 && minutes < 60)
      .take(2)
      .toArray())

Vue.component('calendar', function (resolve) {
  rx.ajax({ url: "calendar/calendar.html", responseType: "text" })
    .map(data => Object({
      template: data.response,
      subscriptions: {
        time: now$.map(now => now.toString().split(" ")[4].substring(0, 5)),
        day: now$.map(now => days[now.getDay()]),
        date: now$.map(now => now.getUTCDate()),
        month: now$.map(now => months[now.getMonth()]),
        items: items$(),
        buses: buses$()
      },
      methods: {
        itemClass: function (item) {
          if (item) {
            return {
              "list-group-item": true,
              task: !item.start,
              now: item.now,
              tomorrow: item.tomorrow
            }
          }
        }
      },
      created: function () {
        var calendarWin;
        var taskWin;
        window.main.$on('KeyC', function () {
          if (calendarWin) {
            calendarWin.focus();
          } else {
            calendarWin = window.open(config.calendar.calendarWebUrl, 'calendar');
          }
        });
        window.main.$on('KeyT', function () {
          if (taskWin) {
            taskWin.focus()
          } else {
            taskWin = window.open(config.calendar.tasksWebUrl, 'tasks');
          }
        });
        window.main.$on('KeyO', function () {
          window.open(config.calendar.eggTimerUrl, 'egg');
        });
        window.main.$on('KeyL', function () {
          rx.from(tasks$)
            .map(task => task.id)
            .do(console.log)
            .filter(config.calendar.laundryTaskid)
            .isEmpty()
            .map(e => e ? config.calendar.nowList : config.calendar.choreList)
            .subscribe(list =>
              rx.ajax({ method: "PUT", url: config.calendar.moveLaundryTask + list }).subscribe());
        });
      }
    }))
    .subscribe(resolve);
})

function date() {
  return new Date();
}
