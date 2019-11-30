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
    methods: {
      wheel: function(e) {
          if (!this.transitioning) {
              if (e.deltaY > 0) {
                window.main.$emit('ArrowDown');
              } else {
                  window.main.$emit('ArrowUp');
              }
          }
          if (this._isPageChanged()) e.preventDefault();
      }
    },
    created: function() {
      window.main.$on('ArrowUp', function() {
        rx.ajax({ url: config.player.url+"/control/up", method: "POST"}).subscribe();
      });
      window.main.$on('ArrowDown', function() {
        rx.ajax({ url: config.player.url+"/control/down", method: "POST"}).subscribe();
      })
      for(i=0;i<10;i++) {        
        window.main.$on('Digit'+i, function(i) {
          return function() {
            rx.ajax({ url: config.player.url+"/control/"+i, method: "POST"}).subscribe();
          }
        }(i));    
      }
      window.main.$on('Space', function() {
        if(state == "PLAYING") {
          rx.ajax({ url: config.player.url+"/control/pause", method: "POST"}).subscribe();
        } else {
          rx.ajax({ url: config.player.url+"/control/play", method: "POST"}).subscribe();
        }
      })
      window.main.$on('KeyR', function () {
        rx.ajax({ url: config.player.url + "/control/ent", method: "POST" }).subscribe();
      })
    }
  }))
  .subscribe(resolve);
})
