var months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
var days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

var now$ = Rx.Observable.timer(0, 1000).map(x => new Date())

var items$ = () => Rx.Observable.ajax(config.calendar.url)
  .do(data => data.response)

/*
  [
  { text: "Meeting", time: "14:00" },
  { text: "Meeting", time: "19:00" },
  { text: "Aspi", priority: "high" },
  { text: "Lessive" },
  { text: "Réparer Lampe" }
])*/

Vue.component('calendar', function(resolve) {
  Rx.Observable.ajax({ url: "calendar/calendar.html", responseType: "text"})
  .map(data => Object({
    template: data.response,
    subscriptions: {
      time: now$.map(now => now.toString().split(" ")[4].substring(0,5)),
      day: now$.map(now => days[now.getDay()]),
      date: now$.map(now => now.getUTCDate()),
      month: now$.map(now => months[now.getMonth()]),
      items: items$()
    },
    methods: {
      itemClass: function(item) {
        return {
          "list-group-item": true,
          task: !item.time,
          now: item.priority == "high"
        }
      }
    }
  }))
  .subscribe(resolve);
})
