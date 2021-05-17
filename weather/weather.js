var rx = Rx.Observable;

var forecastData$ =
  rx.merge(rx.fromEvent(window, 'online'), rx.timer(0, 60 * 1000))
  .debounceTime(500)
  .flatMap(_ => rx.ajax(config.weather.forecastUrl)
    .map(data => data.response.forecasts.forecast))
  .catch(e => { console.log(e.message); return rx.of(null) })
  .do(forecast => forecast && localStorage.setItem('weather.forecast', JSON.stringify(forecast)))
  .map(forecast => forecast || JSON.parse(localStorage.getItem('weather.forecast')))
  .share();

var currentCondition$ = forecastData$
  .flatMap(forecast => forecast["60minutes"])
  .filter(entry =>
    entry.local_date_time.startsWith(new Date().toISOString().substring(0, 11) +(""+new Date().getHours()).padStart(2, "0")))

var today$ = forecastData$
  .flatMap(forecast => forecast["day"])
  .filter(entry =>
    entry.local_date_time.startsWith(new Date().toISOString().substring(0, 11)))

var currentMeasure$ =
  rx.merge(rx.fromEvent(window, 'online'), rx.timer(0, 2 * 60 * 1000))
  .debounceTime(500)
  .flatMap(_ => rx.ajax(config.weather.currentUrl)
    .swallowError()
    .map(data => data.response))
  .flatMap(report => report.features)
  .filter(feature => feature.id == "NEU")
  .share();

var current$ = () =>
  rx.combineLatest(currentMeasure$, currentCondition$, today$,
    (measure, current, today) =>
      Object({
        icon: current.SYMBOL_CODE,
        temp: measure.properties.value,
        tempMax: today.TX_C,
        tempMin: today.TN_C
      }));

var forecasts$ = () => forecastData$
  .flatMap(forecast => rx.from(forecast["hour"])
    .filter(entry =>
      ["11", "14", "17"].indexOf(entry.local_date_time.substring(11, 13)) != -1)
      .do(console.log)
    .take(6)
    .map(forecast => Object({
      icon: forecast.SYMBOL_CODE,
      temp: forecast.TTT_C
    }))
    .toArray())

Vue.component('weather', function (resolve) {
  rx.ajax({ url: "weather/weather.html", responseType: "text" })
    .map(data => Object({
      template: data.response,
      subscriptions: {
        current: current$(),
        forecasts: forecasts$()
      }
    }))
    .subscribe(resolve);
})
