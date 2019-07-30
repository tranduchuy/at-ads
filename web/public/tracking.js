const googleUrls = [
  "google.com",
  "google.ac",
  "google.ad",
  "google.ae",
  "google.com.af",
  "google.com.ag",
  "google.com.ai",
  "google.al",
  "google.am",
  "google.co.ao",
  "google.com.ar",
  "google.as",
  "google.at",
  "google.com.au",
  "google.az",
  "google.ba",
  "google.com.bd",
  "google.be",
  "google.bf",
  "google.bg",
  "google.com.bh",
  "google.bi",
  "google.bj",
  "google.com.bn",
  "google.com.bo",
  "google.com.br",
  "google.bs",
  "google.bt",
  "google.co.bw",
  "google.by",
  "google.com.bz",
  "google.ca",
  "google.com.kh",
  "google.cc",
  "google.cd",
  "google.cf",
  "google.cat",
  "google.cg",
  "google.ch",
  "google.ci",
  "google.co.ck",
  "google.cl",
  "google.cm",
  "google.cn",
  "g.cn",
  "google.com.co",
  "google.co.cr",
  "google.com.cu",
  "google.cv",
  "google.com.cy",
  "google.cz",
  "google.de",
  "google.dj",
  "google.dk",
  "google.dm",
  "google.com.do",
  "google.dz",
  "google.com.ec",
  "google.ee",
  "google.com.eg",
  "google.es",
  "google.com.et",
  "google.fi",
  "google.com.fj",
  "google.fm",
  "google.fr",
  "google.ga",
  "google.ge",
  "google.gf",
  "google.gg",
  "google.com.gh",
  "google.com.gi",
  "google.gl",
  "google.gm",
  "google.gp",
  "google.gr",
  "google.com.gt",
  "google.gy",
  "google.com.hk",
  "google.hn",
  "google.hr",
  "google.ht",
  "google.hu",
  "google.co.id",
  "google.iq",
  "google.ie",
  "google.co.il",
  "google.im",
  "google.co.in",
  "google.io",
  "google.is",
  "google.it",
  "google.je",
  "google.com.jm",
  "google.jo",
  "google.co.jp",
  "google.co.ke",
  "google.ki",
  "google.kg",
  "google.co.kr",
  "google.com.kw",
  "google.kz",
  "google.la",
  "google.com.lb",
  "google.com.lc",
  "google.li",
  "google.lk",
  "google.co.ls",
  "google.lt",
  "google.lu",
  "google.lv",
  "google.com.ly",
  "google.co.ma",
  "google.md",
  "google.me",
  "google.mg",
  "google.mk",
  "google.ml",
  "google.com.mm",
  "google.mn",
  "google.ms",
  "google.com.mt",
  "google.mu",
  "google.mv",
  "google.mw",
  "google.com.mx",
  "google.com.my",
  "google.co.mz",
  "google.com.na",
  "google.ne",
  "google.com.nf",
  "google.com.ng",
  "google.com.ni",
  "google.nl",
  "google.no",
  "google.com.np",
  "google.nr",
  "google.nu",
  "google.co.nz",
  "google.com.om",
  "google.com.pk",
  "google.com.pa",
  "google.com.pe",
  "google.com.ph",
  "google.pl",
  "google.com.pg",
  "google.pn",
  "google.com.pr",
  "google.ps",
  "google.pt",
  "google.com.py",
  "google.com.qa",
  "google.ro",
  "google.rs",
  "google.ru",
  "google.rw",
  "google.com.sa",
  "google.com.sb",
  "google.sc",
  "google.se",
  "google.com.sg",
  "google.sh",
  "google.si",
  "google.sk",
  "google.com.sl",
  "google.sn",
  "google.sm",
  "google.so",
  "google.st",
  "google.sr",
  "google.com.sv",
  "google.td",
  "google.tg",
  "google.co.th",
  "google.com.tj",
  "google.tk",
  "google.tl",
  "google.tm",
  "google.to",
  "google.tn",
  "google.com.tr",
  "google.tt",
  "google.com.tw",
  "google.co.tz",
  "google.com.ua",
  "google.co.ug",
  "google.co.uk",
  "google.com",
  "google.com.uy",
  "google.co.uz",
  "google.com.vc",
  "google.co.ve",
  "google.vg",
  "google.co.vi",
  "google.com.vn",
  "google.vu",
  "google.ws",
  "google.co.za",
  "google.co.zm",
  "google.co.zw"
];

function loadCDNFile(filename, filetype) {
  if(filetype == "js") {
    var cssNode = document.createElement('script');
    cssNode.setAttribute("type", "text/javascript");
    cssNode.setAttribute("src", filename);
  } else if(filetype == "css") {
    var cssNode = document.createElement("link");
    cssNode.setAttribute("rel", "stylesheet");
    cssNode.setAttribute("type", "text/css");
    cssNode.setAttribute("href", filename);
  }
  if(typeof cssNode != "undefined")
    document.getElementsByTagName("head")[0].appendChild(cssNode);
}

loadCDNFile("https://cdn.jsdelivr.net/npm/js-cookie@2/src/js.cookie.min.js", 'js');

fetch("https://api.ipify.org?format=json", {
  method: 'get'
}).then(res => res.json())
  .then(data => {
    const uuid = Cookies.get('uuid');
    const key = Cookies.get('key');
    const ip = data.ip;
    const referrer = window.document.referrer;
    const userAgent = window.navigator.userAgent;
    const href = window.location.href;
    const info = {
      ip,
      href,
      referrer,
      userAgent,
      uuid,
      accountKey: key
    };
    let json = JSON.stringify(info);
    const referrerUrl = new URL(referrer);
    const domain = referrerUrl.hostname.replace("www.", "");
    if (googleUrls.includes(domain)) {
      fetch("http://localhost:3000/api/user-behaviors/log", {
        method: 'post',
        headers: {
          "Content-type": "application/json"
        },
        body: json
      }).then(res => res.json())
        .then(function (data) {
          console.log(data.message);
        })
        .catch(function (error) {
          console.log(error.message);
        });
    }
  })
  .catch(function (error) {
    console.log(error.message);
  });
