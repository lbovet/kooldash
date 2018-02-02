var status$ = () =>
  rx.timer(0, 2000)
  .flatMap(_ => rx.ajax({url: config.player.url+"/media/status"})
    .map(data => data.response))

Vue.component('player', function(resolve) {
  rx.ajax({ url: "player/player.html", responseType: "text"})
  .map(data => Object({
    template: data.response,
    subscriptions: {
      status: status$()
    }
  }))
  .subscribe(resolve);
})
