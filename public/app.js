mdc.ripple.MDCRipple.attachTo(document.querySelector('.mdc-button'));

// DEfault configuration - Change these if you have a different STUN or TURN server.
const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};
const offerOptions = {
  offerToReceiveVideo: 1,
  offerToReceiveAudio: 1,
};
const localName = 'callerCandidates';
const remoteName = 'calleeCandidates';
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomDialog = null;
let roomId = null;
const join = document.getElementById('joinBtn');

function handleConnection(event) {
  const pc = event.target;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);

    pc.addIceCandidate(newIceCandidate);
  }
}

function init() {
  document.querySelector('#cameraBtn').addEventListener('click', openUserMedia);
  document.querySelector('#hangupBtn').addEventListener('click', hangUp);
  document.querySelector('#createBtn').addEventListener('click', createRoom);
  document.querySelector('#joinBtn').addEventListener('click', joinRoom);
  roomDialog = new mdc.dialog.MDCDialog(document.querySelector('#room-dialog'));
}
console.log('Create PeerConnection with configuration: ', configuration);
async function createRoom() {

  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = true;
  const db = firebase.firestore();
  const roomRef = await db.collection('rooms').doc();
  console.log('Create PeerConnection with configuration: ', configuration);
  peerConnection = new RTCPeerConnection(configuration);
  
  
  registerPeerConnectionListeners();
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Add code for creating a room here
  const offer = await peerConnection.createOffer(offerOptions);
  await peerConnection.setLocalDescription(offer);
  peerConnection.addEventListener('icecandidate', event => {
    const candidatesCollection = roomRef.collection(localName);

        if (event.candidate) {

            const json = event.candidate.toJSON();
            candidatesCollection.add(json);
        }

    roomRef.collection(localName).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => { 
            if (change.type === "added") {
                const candidate = new RTCIceCandidate(change.doc.data());
                peerConnection.addIceCandidate(candidate);
            }
        });
    });    
  })
  roomRef.collection(remoteName).onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => { 
                if (change.type === "added") {
                  const candidate = new RTCIceCandidate(change.doc.data());
                  peerConnection.addIceCandidate(candidate);
                }
            });
        });  

  console.log('Created offer:', offer);
  const roomWithOffer = {
      'offer': {
          type: offer.type,
          sdp: offer.sdp
      }
  }
  await roomRef.set(roomWithOffer);
  roomId = roomRef.id;
  console.log(`New room created with SDP offer. Room ID: ${roomRef.id} `);
  console.log(roomId);
  document.querySelector('#currentRoom').innerText = `Current room is ${roomId} - You are the caller!`

  // Code for creating room above
  
  
  // Code for creating a room below
  // const off = roomSnapshot.data().offer;
  // await peerConnection.setRemoteDescription(off);
  // const answer = await peerConnection.createAnswer();
  // await peerConnection.setLocalDescription(answer);

  // const roomWithAnswer = {
  //     answer: {
  //         type: answer.type,
  //         sdp: answer.sdp
  //     }
  // }
  // await roomRef.update(roomWithAnswer);

  // Code for creating a room above

  // Code for collecting ICE candidates below
  // await collectIceCandidates(roomRef, peerConnection, callerCandidatesString, calleeCandidatesString);

// async function collectIceCandidates(roomRef, peerConnection,
//                                     localName, remoteName) {
//     alert("asd");
//     const candidatesCollection = roomRef.collection(localName);

//     peerConnection.addEventListener('icecandidate', event => {
//       alert('bogo');
//         if (event.candidate) {
//             const json = event.candidate.toJSON();
//             candidatesCollection.add(json);
//         }
//     });

//     roomRef.collection(remoteName).onSnapshot(snapshot => {
//         snapshot.docChanges().forEach(change => { 
//             if (change.type === "added") {
//                 const candidate = new RTCIceCandidate(change.doc.data());
//                 peerConnection.addIceCandidate(candidate);
//                 console.log('added');
//             }
//         });
//     })

// }
  // Code for collecting ICE candidates above

  peerConnection.addEventListener('track', event => {
    console.log('Got remote track:', event.streams[0]);
    event.streams[0].getTracks().forEach(track => {
      console.log('Add a track to the remoteStream:', track);
      remoteStream.addTrack(track);
    });
  });

  // Listening for remote session description below
      roomRef.onSnapshot(async snapshot => {
      const data = snapshot.data();
      if (!peerConnection.currentRemoteDescription && data && data.answer) {
        console.log('Got remote description: ', data.answer);
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(rtcSessionDescription);
      }
      });
  // Listening for remote session description above

  // Listen for remote ICE candidates below

  // Listen for remote ICE candidates above
}
function joinRoom() {
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = true;

  document.querySelector('#confirmJoinBtn').
      addEventListener('click', async () => {
        roomId = document.querySelector('#room-id').value;
        console.log('Join room: ', roomId);
        document.querySelector(
            '#currentRoom').innerText = `Current room is ${roomId} - You are the callee!`;
        await joinRoomById(roomId);
      }, {once: true});
  roomDialog.open();
}

async function joinRoomById(roomId) {
  const db = firebase.firestore();
  const roomRef = db.collection('rooms').doc(`${roomId}`);
  const roomSnapshot = await roomRef.get();
  console.log('Got room:', roomSnapshot.exists);
  const cand = roomRef.collection(`${localName}`);
  const test = await cand.doc().get();
    console.log('Call:', test.data());
  
  if (roomSnapshot.exists) {
    console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners();
    console.log(localStream);
    localStream.getTracks().forEach(track => {
      let a = peerConnection.addTrack(track, localStream);
      // console.log(track);
      // console.log(localStream);
      // console.log(a);
      peerConnection.addEventListener('track', event => {

        console.log('Got remote track:', event.streams[0]);
        event.streams[0].getTracks().forEach(track => {
          console.log('Add a track to the remoteStream:', track);
          remoteStream.addTrack(track);
        });
      });

    });

    // Code for collecting ICE candidates below
    peerConnection.addEventListener('icecandidate', event => {
        const candidatesCollection = roomRef.collection(remoteName);

            if (event.candidate) {

                const json = event.candidate.toJSON();
                candidatesCollection.add(json);
            }

        roomRef.collection(remoteName).onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => { 
                if (change.type === "added") {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    peerConnection.addIceCandidate(candidate);
                    console.log('sasageyo');
                    console.log(change.doc. data());
                }
            });
        });    
      })

    roomRef.collection(localName).onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => { 
                if (change.type === "added") {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    peerConnection.addIceCandidate(candidate);
                 
                }
            });
        });    


    // Code for collecting ICE candidates above

    
    // Code for creating SDP answer below
    const offer = roomSnapshot.data().offer;
    console.log('Got offer:', offer);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    console.log('Created answer:', answer);
    await peerConnection.setLocalDescription(answer);

    const roomWithAnswer = {
  answer: {
    type: answer.type,
    sdp: answer.sdp,
  },
};
await roomRef.update(roomWithAnswer);

    // Code for creating SDP answer above

    // Listening for remote ICE candidates below

    // Listening for remote ICE candidates above
  }
}

async function openUserMedia(e) {
  const stream = await navigator.mediaDevices.getUserMedia(
      {video: true, audio: true})
            .then(stream => {
            // Code for success
            document.querySelector('#localVideo').srcObject = stream;
             localStream = stream;
            remoteStream = new MediaStream();

            document.querySelector('#remoteVideo').srcObject = remoteStream;
            console.log('Stream:', document.querySelector('#localVideo').srcObject);
            document.querySelector('#cameraBtn').disabled = true;
            document.querySelector('#joinBtn').disabled = false;
            document.querySelector('#createBtn').disabled = false;
            document.querySelector('#hangupBtn').disabled = false;
            }).catch(err => {
                if(err.message.includes("Requested device not found")){
                  alert("Mic not detected")
                  
                } 

                else {
                  alert("Error recording audio")
                  console.log(err.message)
                }
            });
}
async function hangUp(e) {
  const tracks = document.querySelector('#localVideo').srcObject.getTracks();
  tracks.forEach(track => {
    track.stop();
  });

  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
  }

  document.querySelector('#localVideo').srcObject = null;
  document.querySelector('#remoteVideo').srcObject = null;
  document.querySelector('#cameraBtn').disabled = false;
  document.querySelector('#joinBtn').disabled = true;
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#hangupBtn').disabled = true;
  document.querySelector('#currentRoom').innerText = '';

  // Delete room on hangup
  if (roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection('rooms').doc(roomId);
    const calleeCandidates = await roomRef.collection('calleeCandidates').get();
    calleeCandidates.forEach(async candidate => {
      await candidate.delete();
    });
    const callerCandidates = await roomRef.collection('callerCandidates').get();
    callerCandidates.forEach(async candidate => {
      await candidate.delete();
    });
    await roomRef.delete();
  }

  document.location.reload(true);
}


function registerPeerConnectionListeners() {
  peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log(
        `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
  });

  peerConnection.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener('iceconnectionstatechange ', () => {
    console.log(
        `ICE connection state change: ${peerConnection.iceConnectionState}`);
  });
}


init();
