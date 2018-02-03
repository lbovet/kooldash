window.main = new Vue({ el: "#main",
  created: function() {
      var vm = this;
      window.addEventListener('keyup', function(event) {
        switch(event.keyCode) {
          case 38: vm.$emit('up'); break;
          case 40: vm.$emit('down'); break;
          case 32: vm.$emit('space'); break;
        }
        if(event.keyCode >= 48 && event.keyCode <= 57) {
          vm.$emit(''+(event.keyCode-48));
        }
        if(event.keyCode > 32) {
          vm.$emit(String.fromCharCode(event.keyCode).toLowerCase());
        }
      });
    }
  })

Rx.Observable.prototype.cacheRepeat = function(period) {
  return this.combineLatest(Rx.Observable.timer(0,period)).map(_ => _[0])
}
