function loadCDNFile(filename, filetype) {
  if (filetype == "js") {
    var cssNode = document.createElement('script');
    cssNode.setAttribute("type", "text/javascript");
    cssNode.setAttribute("src", filename);
  } else if (filetype == "css") {
    var cssNode = document.createElement("link");
    cssNode.setAttribute("rel", "stylesheet");
    cssNode.setAttribute("type", "text/css");
    cssNode.setAttribute("href", filename);
  }
  if (typeof cssNode != "undefined")
    document.getElementsByTagName("head")[0].appendChild(cssNode);
}

// Load js cookie
loadCDNFile("https://cdn.jsdelivr.net/npm/js-cookie@2/src/js.cookie.min.js", 'js');

function detectPrivateMode(callback) {
  var db,
    on = callback.bind(null, true),
    off = callback.bind(null, false);

  function tryLocalStorage() {
    try {
      localStorage.length ? off() : (localStorage.x = 1, localStorage.removeItem("x"), off());
    } catch (e) {
      // Safari only enables cookie in private mode
      // if cookie is disabled then all client side storage is disabled
      // if all client side storage is disabled, then there is no point
      // in using private mode
      navigator.cookieEnabled ? on() : off();
    }
  }

  // Blink (chrome & opera)
  window.webkitRequestFileSystem ? webkitRequestFileSystem(0, 0, off, on)
    // FF
    : "MozAppearance" in document.documentElement.style ? (db = indexedDB.open("test"), db.onerror = on, db.onsuccess = off)
    // Safari
    : /constructor/i.test(window.HTMLElement) || window.safari ? tryLocalStorage()
      // IE10+ & edge
      : !window.indexedDB && (window.PointerEvent || window.MSPointerEvent) ? on()
        // Rest
        : off()
}

let oldHref = '';

const log = () =>{
  console.log(oldHref);
  // Check isPrivateMode
  detectPrivateMode((isPrivateMode) => {
    // Get IP
    fetch("https://api.ipify.org?format=json", {
      method: 'get'
    }).then(res => res.json())
      .then(data => {
        const ip = data.ip;
        let referrer = window.document.referrer;
        if(oldHref !== window.location.href){
          referrer = oldHref;
        }
        oldHref = window.location.href;
        const userAgent = window.navigator.userAgent;
        const href = window.location.href;
        const isPrivateBrowsing = isPrivateMode;
        const info = {
          ip,
          href,
          referrer,
          userAgent,
          isPrivateBrowsing
        };
        let json = JSON.stringify(info);
        let url = "http://localhost:3000/api/user-behaviors/log";
        fetch(url, {
          method: 'post',
          credentials: 'include',
          headers: {
            "Content-type": "application/json"
          },
          body: json
        }).then(res => res.json())
          .then(function (json) {

            console.log(json.messages.join('\n'));
          })
          .catch(function (error) {
            console.log(error);
          });
      })
      .catch(function (error) {
        console.log(error.message);
      });
  });
};

setInterval(() => {
  if(oldHref !== window.location.href){
    log();
  }
}, 500);

log();

