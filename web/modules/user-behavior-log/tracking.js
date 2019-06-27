fetch("https://api.ipify.org?format=json", {
  method: 'get'
}).then(res => res.json())
  .then(data => {
    const ip = data.ip;
    const referrer = window.document.referrer;
    const userAgent = window.navigator.userAgent;
    const href = window.location.href;
    const info = {
      ip,
      href,
      referrer,
      userAgent
    };
    console.log(info);
    let json = JSON.stringify(info);
    fetch("http://localhost:3000/api/user-behaviors/log", {
      method: 'post',
      headers: {
        "Content-type": "application/json"
      },
      body: json
    }).then(res => res.json())
      .then(function (data) {
        if(data.status === "200"){
          alert("success");
        } else {
          alert(data.message);
        }
      })
      .catch(function (error) {
        alert(error.message);
      });
  })
  .catch(function (error) {
    alert(error.message);
  });