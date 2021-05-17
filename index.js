var rx = Rx.Observable;

window.main = new Vue({ el: "#main",
  created: function() {
      var vm = this;
      window.addEventListener('keyup', function(event) {
        if(event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        vm.$emit(event.code.replace("Numpad", "Digit"));
      });
    }
  })

Rx.Observable.prototype.cacheRepeat = function(period) {
  return this.combineLatest(rx.timer(0,period)).map(_ => _[0])
}

Rx.Observable.prototype.swallowError = function() {
  return this.catch(e => rx.empty())
}
