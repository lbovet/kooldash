var rx = Rx.Observable;

var state = null;

var status$ = () =>
  rx.timer(0, 2000)
  .flatMap(_ => rx.ajax(config.player.url+"/media/status")
    .swallowError()
    .map(data => data.response)
    .do(status => state = status.player_state))

Vue.component('player', function(resolve) {
  rx.ajax({ url: "player/player.html", responseType: "text"})
  .map(data => Object({
    template: data.response,
    subscriptions: {
      status: status$()
    },
    created: function() {
      window.main.$on('ArrowUp', function() {
        rx.ajax({ url: config.player.url+"/control/up", method: "POST"}).subscribe();
      });
      window.main.$on('ArrowDown', function() {
        rx.ajax({ url: config.player.url+"/control/down", method: "POST"}).subscribe();
      })
      window.main.$on('Digit1', function() {
        rx.ajax({ url: config.player.url+"/control/1", method: "POST"}).subscribe();
      })
      window.main.$on('Digit3', function() {
        rx.ajax({ url: config.player.url+"/control/3", method: "POST"}).subscribe();
      })
      window.main.$on('Space', function() {
        if(state == "PLAYING") {
          rx.ajax({ url: config.player.url+"/control/pause", method: "POST"}).subscribe();
        } else {
          rx.ajax({ url: config.player.url+"/control/play", method: "POST"}).subscribe();
        }
      })
    }
  }))
  .subscribe(resolve);
})
