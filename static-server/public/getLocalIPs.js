let localConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;

var ip_regex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/;
var ip_dups = [];

function createConnection() {
  const servers = null;
  window.localConnection = localConnection = new RTCPeerConnection(servers);/*
    console.log('Created local peer connection object localConnection');*/

  sendChannel = localConnection.createDataChannel('sendDataChannel');/*
    console.log('Created send data channel');*/

  localConnection.onicecandidate = e => {
    onIceCandidate(localConnection, e);
  };
  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;

  window.remoteConnection = remoteConnection = new RTCPeerConnection(servers);/*
    console.log('Created remote peer connection object remoteConnection');*/

  remoteConnection.onicecandidate = e => {
    onIceCandidate(remoteConnection, e);
    handleCandidate(e);
  };
  remoteConnection.ondatachannel = receiveChannelCallback;

  localConnection.createOffer().then(
    gotDescription1,
    onCreateSessionDescriptionError
  );


  function onIceCandidate(pc, event) {
    getOtherPc(pc)
      .addIceCandidate(event.candidate)
      .then(
        () => onAddIceCandidateSuccess(pc),
        err => onAddIceCandidateError(pc, err)
      );/*
      console.log(`${getName(pc)} ICE candidate: ${event.candidate ? event.candidate.candidate : '(null)'}`);*/
  }


  function receiveChannelCallback(event) {
    console.log('Receive Channel Callback');
    receiveChannel = event.channel;
    receiveChannel.onmessage = onReceiveMessageCallback;
    receiveChannel.onopen = onReceiveChannelStateChange;
    receiveChannel.onclose = onReceiveChannelStateChange;
  }


  function onAddIceCandidateSuccess() {
    console.log('AddIceCandidate success.');
  }

  function onAddIceCandidateError(error) {
    console.log(`Failed to add Ice Candidate: ${error.toString()}`);
  }


  function getOtherPc(pc) {
    return (pc === localConnection) ? remoteConnection : localConnection;
  }

  function getName(pc) {
    return (pc === localConnection) ? 'localPeerConnection' : 'remotePeerConnection';
  }


  function onReceiveMessageCallback(event) {/*
      console.log('Received Message');*/
    dataChannelReceive.value = event.data;
  }

  function onReceiveChannelStateChange() {
    const readyState = receiveChannel.readyState;/*
      console.log(`Receive channel state is: ${readyState}`);*/
  }

  function gotDescription1(desc) {
    localConnection.setLocalDescription(desc);/*
      console.log(`Offer from localConnection\n${desc.sdp}`);*/
    remoteConnection.setRemoteDescription(desc);
    remoteConnection.createAnswer().then(
      gotDescription2,
      onCreateSessionDescriptionError
    );
  }


  function gotDescription2(desc) {
    remoteConnection.setLocalDescription(desc);/*
      console.log(`Answer from remoteConnection\n${desc.sdp}`);*/
    localConnection.setRemoteDescription(desc);
  }


  function onCreateSessionDescriptionError(error) {/*
      console.log('Failed to create session description: ' + error.toString());*/
  }

  function onSendChannelStateChange() {
    const readyState = sendChannel.readyState;/*
      console.log('Send channel state is: ' + readyState);*/
  }

  function handleCandidate(e) {
    if (e.candidate) {
      const candidate = e.candidate;
      //match just the IP address
      if (ip_regex.exec(candidate.candidate)) {
        var ip_addr = ip_regex.exec(candidate.candidate)[1];
        ip_dups.push(ip_addr);
      } else if (candidate.address) {
        ip_dups.push(candidate.address);
      }
    }
  }
}

getIPs = () => {
  createConnection();
};

getIPs();

setTimeout((() => {
  console.log(ip_dups);
}), 500);
