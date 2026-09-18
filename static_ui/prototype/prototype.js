(function () {
  "use strict";

  var status = document.getElementById("script-status");

  if (status) {
    status.textContent = "JavaScript is available. The deterministic initial state is unchanged and nothing is persisted or transmitted.";
  }
}());