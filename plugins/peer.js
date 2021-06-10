import Peer from 'peerjs';

export default ({ store }, inject) => {
  const p2p = {
    peer: null,
    peers: [],
    init(id = null) {
      return new Promise((resolve) => {
        // Creator and player init
        const peer = new Peer(id, {
          host: '192.168.1.35',
          port: 4000,
          path: '/p2p',
          debug: 2,
        });
        this.peer = peer;
        this.peer.on('connection', (conn) => {
          this.peers.push(conn);
          this.onData(conn);
        });
        setTimeout(() => {
          resolve(peer.id);
        }, 500);
      });
    },
    connect(id, player) {
      const conn = this.peer.connect(id);
      this.peers.push(conn);
      conn.on('open', () => {
        conn.send({
          event: 'newPlayer',
          body: {
            id: player.id,
            name: player.name,
            location: null,
            startLocation: null,
            movement: 0,
            hand: [],
            destinations: [],
            turnPosition: null,
            maxSpeed: 5,
            redLight: false,
            accident: false,
            crevaison: false,
            fuel: false,
          },
        });
      });
      this.onData(conn);
    },
    onData(conn) {
      conn.on('data', (data) => {
        console.log('receve', data.event, data.body);
        if (data.event === 'newPlayer') {
          console.log(data.body);
          // Add player to players
          store.commit('game/ADDPLAYER', data.body);
          this.broadcast({
            event: 'newPeer',
            body: store.getters['game/player'],
          });
          this.sendGame();
        }
        if (data.event === 'newPeer') {
          store.commit('game/ADDPLAYER', data.body);
          const playersId = store.getters['game/players'].map((player) => player.id);
          const peersId = this.peers.map((conn) => conn.peer);
          const missingConnection = playersId.filter((id) => peersId.includes(id));

          if (missingConnection.length >= 1) {
            missingConnection.forEach((id) => {
              const conn = this.peer.connect(id);
              this.peers.push(conn);
              this.onData(conn);
            });
          }
        }
        if (data.event === 'gameUpdate') {
          // Update the game
          store.dispatch('game/patchGame', data.body);
        }
      });
    },
    sendGame() {
      this.broadcast({
        event: 'gameUpdate',
        body: store.getters['game/game'],
      });
    },
    broadcast(data) {
      console.log('broadcast', data);
      this.peers.forEach((conn) => {
        if (conn.peer !== store.getters['game/player'].id) {
          conn.send(data);
        }
      });
    },
  };
  inject('p2p', p2p);
};
