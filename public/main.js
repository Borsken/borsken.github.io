'use strict';
const mediaStreamConstraints = {
  video: true,
};

const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
};

const offerOptions = {
	offerToReceiveVideo: 1,
};

let localStream;
let remoteStream;
let i = 0;
let local = new RTCPeerConnection();
let remote = new RTCPeerConnection();
let roomId = null;



const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

function startAction() {
	navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
		.then(mediaStream => {
			localStream = mediaStream;
			localVideo.srcObject = localStream;
			const videoTracks = localStream.getVideoTracks();
			if (videoTracks.length > 0) {
	  			console.log(`Using video device: ${videoTracks[0].label}.`);
			}
		}).catch();
}

function callAction() {
	local = new RTCPeerConnection();
	remote = new RTCPeerConnection();
	

	local.addStream(localStream);
	remote.addEventListener('addstream', gotRemoteMediaStream);
	local.createOffer()
		.then(createdOffer).catch();

	local.addEventListener('icecandidate', handleConnection);

	remote.addEventListener('icecandidate', handleConnection);
	remote.addEventListener('addstream', gotRemoteMediaStream);		
}	

function gotLocalMediaStream(mediaStream) {
	localStream = mediaStream;	
	const videoTracks = localStream.getVideoTracks();
	if (videoTracks.length > 0) {
	  console.log(`Using video device: ${videoTracks[0].label}.`);
  }
}

function gotRemoteMediaStream(event) {
	
	const mediaStream = event.stream;
	remoteStream = mediaStream;
	remoteVideo.srcObject = remoteStream;
}

async function createdOffer(description) {
	const db = firebase.firestore();
  const roomRef = await db.collection('rooms').doc();
	console.log(`Offer from local:\n${description.sdp}.`);
	local.setLocalDescription(description)
		.then(() =>{
			}).catch();
		
	const offer = await local.createOffer();
	await local.setLocalDescription(offer);
	console.log('Created offer:', offer);
	const roomWithOffer = {
    'offer': {
        type: offer.type,
        sdp: offer.sdp
    }
}
await roomRef.set(roomWithOffer);
roomId = roomRef.id;
console.log('New room created with SDP offer. Room ID: ${roomRef.id}');
console.log(roomId);
console.log( `Current room is ${roomId} - You are the caller!`);
	
	// roomRef = db.collection('rooms').add(roomWithOffer);
	// const roomId = roomRef.id;
	// console.log(`Current room is ${roomId} - You are the caller!`);

	remote.setRemoteDescription(description)
		.then(() => {
		}).catch();

	remote.createAnswer()
		.then(createdAnswer)
		.catch();
}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description) {
	console.log(`Answer from remote:\n${description.sdp}.`);
	remote.setLocalDescription(description)
		.then(() => {
		}).catch();

	local.setRemoteDescription(description)
		.then(() => {
		}).catch();
}

function handleConnection(event) {
	i++;
	console.log(i);
	const peerConnection = event.target;
	const iceCandidate = event.candidate;
	console.log(iceCandidate);

	if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    const otherPeer = getOtherPeer(peerConnection);

    otherPeer.addIceCandidate(newIceCandidate)
      .then(() => {
      }).catch((error) => {
      });

  }

}

function getOtherPeer(peerConnection) {
  return (peerConnection === local) ?
      remote : local;
}