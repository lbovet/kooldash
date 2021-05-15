var rx = Rx.Observable;

var forecastData$ = rx.timer(0, 4 * 60 * 60 * 1000)
  .debounceTime(500)
  .map(_ => new Date().getHours())
  .filter(hour => hour < 23 && hour > 3)
  .flatMap(_ => rx.ajax({
    url: config.weather.authUrl,
    method: 'POST',
    headers: {
      Authorization: "Basic " + config.weather.credentials
    }
  })
    .swallowError()
    .map(data => data.response.access_token))
  .flatMap(token => rx.ajax({
    url: config.weather.forecastUrl,
    headers: {
      Authorization: "Bearer " + token
    }
  })
    .swallowError()
    .do(data => console.log("Weather calls available: "+data.xhr.getResponseHeader("x-ratelimit-available")))
    .map(data => data.response.forecast))
  .share();

var currentCondition$ = forecastData$
  .flatMap(forecast => forecast["60minutes"])
  .filter(entry =>
    entry.local_date_time.startsWith(new Date().toISOString().substring(0, 11) + new Date().getHours()))

var today$ = forecastData$
  .flatMap(forecast => forecast["day"])
  .filter(entry =>
    entry.local_date_time.startsWith(new Date().toISOString().substring(0, 11)))

var currentMeasure$ = rx.timer(0, 2 * 60 * 1000)
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
      ["08", "14", "17"].indexOf(entry.local_date_time.substring(11, 13)) != -1)
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
