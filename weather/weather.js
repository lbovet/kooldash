var report$ = rx.timer(0, 300000)
  .flatMap(_ => rx.ajax(config.weather.url)
    .map(data => data.response))
    .share();

var current$ = () => report$
  .map(report => Object({
    icon: report.current_condition.condition_key,
    temp: report.current_condition.tmp,
    tempMax: report.fcst_day_0.tmax,
    tempMin: report.fcst_day_0.tmin
  }));

var forecasts$ = () => report$
  .flatMap(report => rx.from([ report.fcst_day_0, report.fcst_day_1 ])
    .flatMap(day => rx.pairs(day.hourly_data)
      .map(pair => [ pair[0].length == 5 ? pair[0]: "0"+pair[0], pair[1]])
      .toArray()
      .flatMap(arr => arr.sort((l,r) => l[0].localeCompare(r[0])))
    )
    .filter(pair => pair[0] == "10H00" || pair[0] == "14H00" || pair[0] == "18H00")
    .map(pair => Object({
      time: pair[0].replace("H", ":"),
      icon: pair[1].CONDITION_KEY,
      temp: Math.round(pair[1].TMP2m)
    }))
    .toArray())

Vue.component('weather', function(resolve) {
  rx.ajax({ url: "weather/weather.html", responseType: "text"})
  .map(data => Object({
    template: data.response,
    subscriptions: {
      current: current$(),
      forecasts: forecasts$()
    },
    methods: {
      iconClass: function(icon, size) {
        var result = {
          wu: true,
          "wu-white": true,
          "wu-night": (icon.indexOf("nuit") != -1)
        }
        result["wu-"+size] = true;
        result["wu-"+icons[icon]] = true;
        return result;
      }
    }
  }))
  .subscribe(resolve);
})

var icons = {
  "ensoleille": "clear",
  "nuit-claire": "clear",
  "ciel-voile": "partlycloudy",
  "nuit-legerement-voilee": "partlycloudy",
  "faibles-passages-nuageux": "partlycloudy",
  "nuit-bien-degagee": "partlycloudy",
  "brouillard": "fog",
  "stratus": "fog",
  "stratus-se-dissipant": "partlycloudy",
  "nuit-claire-et-stratus": "partlycloudy",
  "eclaircies": "partlysunny",
  "nuit-nuageuse": "cloudy",
  "faiblement-nuageux": "partlycloudy",
  "fortement-nuageux": "cloudy",
  "averses-de-pluie-faible": "chancerain",
  "nuit-avec-averses": "rain",
  "averses-de-pluie-moderee": "rain",
  "averses-de-pluie-forte": "rain",
  "couvert-avec-averses": "chancerain",
  "pluie-faible": "chancerain",
  "pluie-forte": "rain",
  "pluie-moderee": "rain",
  "developpement-nuageux": "mostlycloudy",
  "nuit-avec-developpement-nuageux": "mostlycloudy",
  "faiblement-orageux": "chancetstorms",
  "nuit-faiblement-orageuse": "chancetstorms",
  "orage-modere": "tstorms",
  "fortement-orageux": "tstorms",
  "averses-de-neige-faible": "chancerain",
  "nuit-avec-averses-de-neige-faible": "chancesnow",
  "neige-faible": "chancesnow",
  "neige-moderee": "snow",
  "neige-forte": "snow",
  "pluie-et-neige-melee-faible": "chanceflurries",
  "pluie-et-neige-melee-moderee": "chanceflurries"
}
