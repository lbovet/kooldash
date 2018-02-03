window.main = new Vue({ el: "#main",
  created: function() {
    console.log("r")
      var vm = this;
      window.addEventListener('keyup', function(event) {
        switch(event.keyCode) {
          case 38: vm.$emit('up'); break;
          case 40: vm.$emit('down'); break;
          case 32: vm.$emit('space'); break;
          case 49: vm.$emit('1'); break;
          case 50: vm.$emit('2'); break;
          case 51: vm.$emit('3'); break;
        }
      });
    }
  })

Rx.Observable.prototype.cacheRepeat = function(period) {
  return this.combineLatest(Rx.Observable.timer(0,period)).map(_ => _[0])
}
