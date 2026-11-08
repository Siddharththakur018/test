import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PeerSignalInbox} from '../lib/peer-signaling';
test('ICE before an offer survives peer creation and later ICE waits for remote SDP',async()=>{
  const calls:string[]=[],errors:unknown[]=[];let peer:RTCPeerConnection|null=null;
  const state={remoteDescription:null as RTCSessionDescriptionInit|null};
  const fake={get remoteDescription(){return state.remoteDescription;},
    async setRemoteDescription(sdp:RTCSessionDescriptionInit){calls.push('SDP started');await new Promise(r=>setTimeout(r,10));state.remoteDescription=sdp;calls.push('SDP ready');},
    async addIceCandidate(candidate:RTCIceCandidateInit){assert.ok(state.remoteDescription);calls.push(candidate.candidate!);},
    async createAnswer(){return {type:'answer',sdp:'answer'};},async setLocalDescription(){calls.push('answer ready');},
  } as unknown as RTCPeerConnection;
  const inbox=new PeerSignalInbox(()=>peer,()=>{peer=fake;return fake;},()=>calls.push('answer sent'),e=>errors.push(e));
  await inbox.push({type:'ice',candidate:{candidate:'early ICE'}});
  const offer=inbox.push({type:'offer',sdp:{type:'offer',sdp:'offer'}});
  const late=inbox.push({type:'ice',candidate:{candidate:'late ICE'}});
  await Promise.all([offer,late]);
  assert.deepEqual(calls,['SDP started','SDP ready','early ICE','answer ready','answer sent','late ICE']);assert.deepEqual(errors,[]);
});
test('restarting a session discards queued candidates from the old session',async()=>{
  let peer:RTCPeerConnection|null=null;const candidates:string[]=[];
  const fake={async setRemoteDescription(){},async createAnswer(){return {type:'answer'};},async setLocalDescription(){},async addIceCandidate(c:RTCIceCandidateInit){candidates.push(c.candidate!);}} as unknown as RTCPeerConnection;
  const inbox=new PeerSignalInbox(()=>peer,()=>{peer=fake;return fake;},()=>{},e=>{throw e;});
  await inbox.push({type:'ice',candidate:{candidate:'old'}});inbox.clear();
  await inbox.push({type:'offer',sdp:{type:'offer'}});assert.deepEqual(candidates,[]);
});
