export type PeerSignal = {type:'offer'|'answer';sdp:RTCSessionDescriptionInit} | {type:'ice';candidate:RTCIceCandidateInit};
/** SDP changes must finish before applying ICE; ICE can arrive before the offer. */
export class PeerSignalInbox {
  private pending:RTCIceCandidateInit[]=[];
  private queue:Promise<void>=Promise.resolve();
  private generation=0;
  constructor(private getPeer:()=>RTCPeerConnection|null,private createPeer:()=>RTCPeerConnection,private answer:(peer:RTCPeerConnection)=>void,private error:(error:unknown)=>void){}
  clear(){this.generation++;this.pending=[];}
  push(signal:PeerSignal){
    const generation=this.generation;
    this.queue=this.queue.then(async()=>{
      if(generation!==this.generation)return;
      if(signal.type==='ice'){
        const peer=this.getPeer();
        if(peer?.remoteDescription)await peer.addIceCandidate(signal.candidate);
        else if(this.pending.length<128)this.pending.push(signal.candidate);
        return;
      }
      const peer=signal.type==='offer'?this.createPeer():this.getPeer();
      if(!peer)throw new Error('No camera connection is available.');
      await peer.setRemoteDescription(signal.sdp);
      if(generation!==this.generation || this.getPeer()!==peer)return;
      for(const candidate of this.pending.splice(0))await peer.addIceCandidate(candidate);
      if(signal.type==='offer'){
        await peer.setLocalDescription(await peer.createAnswer());
        if(generation===this.generation && this.getPeer()===peer)this.answer(peer);
      }
    }).catch(error=>{if(generation===this.generation)this.error(error);});
    return this.queue;
  }
}
