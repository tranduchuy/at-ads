(() => {
  const CONFIG = {
    hostApi       : '<%= hostApi %>',
    uuid          : '<%= uuid %>',
    key           : '<%= key %>',
    scriptTracking: '<%= scriptTracking %>'
  };
  
  async function chrome76Detection(){if("storage"in navigator&&"estimate"in navigator.storage){const{usage:e,quota:n}=await navigator.storage.estimate();return n<12e7}return!1}function isNewChrome(){var e=navigator.userAgent.match(/Chrom(?:e|ium)\/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/);if(null!=e&&5==e.length)return major=e.map(e=>parseInt(e,10))[1],major>=76}var PrivateWindow=new Promise(function(e,n){try{if(navigator.vendor&&navigator.vendor.indexOf("Apple")>-1&&navigator.userAgent&&-1==navigator.userAgent.indexOf("CriOS")&&-1==navigator.userAgent.indexOf("FxiOS")){if(window.safariIncognito)!0;else try{window.openDatabase(null,null,null,null),window.localStorage.setItem("test",1),e(!1)}catch(n){!0,e(!0)}}else if(navigator.userAgent.includes("Firefox")){var t=indexedDB.open("test");t.onerror=function(){e(!0)},t.onsuccess=function(){e(!1)}}else if(navigator.userAgent.includes("Edge")||navigator.userAgent.includes("Trident")||navigator.userAgent.includes("msie"))window.indexedDB||!window.PointerEvent&&!window.MSPointerEvent||e(!0),e(!1);else{isNewChrome()&&e(chrome76Detection());const n=window.RequestFileSystem||window.webkitRequestFileSystem;n?n(window.TEMPORARY,100,function(n){e(!1)},function(n){e(!0)}):e(null)}}catch(n){console.log(n),e(null)}});function isPrivateWindow(e){PrivateWindow.then(function(n){e(n)})}
  let countScriptTracking = document.querySelectorAll(`script[src*='${ CONFIG.scriptTracking }']`).length;
  let isValidToTracking = countScriptTracking === 1 ? true : false;
  
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
    await isPrivateWindow((is_private) => {
      isPrivateBrowsing = is_private ? true : false;
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
      let uuid = CONFIG.uuid;
  
      if (typeof(Storage) !== "undefined") {
        if(!localStorage.getItem("uuid"))
        {
          localStorage.setItem("uuid", uuid);
        }
        else
        {
          uuid = localStorage.getItem("uuid");
        }
      }
  
      const info = {
        ip,
        key: CONFIG.key,
        uuid,
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
  
  if(isValidToTracking) {
    init();
  }
})();