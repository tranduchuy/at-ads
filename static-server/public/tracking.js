const CONFIG = {
  hostApi: '<%= hostApi %>'
};

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

let ip = '';
let isPrivateBrowsing = false;
let oldUrl = window.document.referrer;
const logAPI = CONFIG.hostApi + "/api/user-behaviors/log";
let userAgent = '';
let userLocation = null;
const intervalTime = 500; // ms

let browserResolution = {
  width: window.outerWidth,
  height: window.outerHeight
};

let screenResolution = {
  width: screen.width,
  height: screen.height
};

getGeoIp = async () => {
  const res = await fetch("https://geoip-db.com/json/");
  const data = await res.json();
  ip = data.IPv4;
  userLocation = data;
  delete userLocation.IPv4;
};

checkPrivate = async () => {
  await detectPrivateMode((isPrivate)=>{
    isPrivateBrowsing = isPrivate;
  });
};

log = async() => {
  try{
    if (window.location.href == oldUrl) {
      return;
    }
    // set referrer
    let referrer = oldUrl;

    // assign current url to oldUrl
    oldUrl = window.location.href;
    const userAgent = window.navigator.userAgent;
    const href = window.location.href;

    browserResolution.width = window.outerWidth;
    browserResolution.height = window.outerHeight;

    const info = {
      ip,
      href,
      location: userLocation,
      referrer,
      userAgent,
      isPrivateBrowsing,
      browserResolution,
      screenResolution
    };

    let json = JSON.stringify(info);

    const res = await fetch(logAPI, {
      method: 'post',
      credentials: 'include',
      headers: {
        "Content-type": "application/json"
      },
      body: json
    });
    const data = await res.json();
    console.log(data.messages.join('\n'));
  } catch (e) {
    console.log(e);
  }
};

init = async () => {
  // get ip.
  await getGeoIp();
  // get is Private Browsing.
  await checkPrivate();
  //get userAgent.
  userAgent = window.navigator.userAgent;

  setInterval(log, intervalTime);
};

init();
