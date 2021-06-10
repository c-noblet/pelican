import { patch, shuffle } from '../plugins/utils';
import cards from './db/cardsDb';
import routes from './db/transportsDb';

export const state = () => ({
  id: null,
  gameState: null,
  deck: [],
  history: [],
  turn: 0,
  round: 0,
  players: [],
  winner: null,
});

export const getters = {
  game(state) {
    return state;
  },
  player(state, getters, rootState, rootGetters) {
    return state.players.filter((player) => player.id === rootGetters['auth/user'].id)[0];
  },
  players(state) {
    return state.players;
  },
};

export const mutations = {
  GAME(state, payload) {
    patch(state, payload);
    console.log('state', state);
  },
  PLAYER(state, payload) {
    state.players.forEach((player) => {
      if (player.id === payload.id) {
        patch(player, payload.player);
      }
    });
  },
  GAMESTATE(state, payload) {
    state.gameState = payload;
  },
  DECK(state, payload) {
    state.deck = payload;
  },
  ADDPLAYER(state, payload) {
    state.players.push(payload);
  },
  SETPLAYERSMETA(state) {
    // Set random locations
    let availableCities = [];
    routes.forEach((route) => {
      if (!availableCities.includes(route.origin)) {
        availableCities.push(route.origin);
      }
      if (!availableCities.includes(route.destination)) {
        availableCities.push(route.destination);
      }
    });
    state.players.forEach((player) => {
      for (let i = 0; i < 5; i++) {
        const card = state.deck.shift();
        player.hand.push(card);
      }
      while (player.destinations.length <= 5) {
        const r = Math.floor(Math.random() * availableCities.length);
        if (player.location === null) {
          player.location = availableCities[r];
          player.startLocation = availableCities[r];
        } else if (availableCities[r] !== player.location
          && !player.destinations.includes(availableCities[r])
        ) {
          player.destinations.push(availableCities[r]);
        }
        availableCities = availableCities.filter((city) => availableCities[r] !== city);
      }
    });
  },
  SETTURNPOSITION(state) {
    for (let i = 0; i < state.players.length; i++) {
      state.players[i].turnPosition = i;
    }
  },
  ENDTURN(state) {
    if (state.turn === state.players.length - 1) {
      state.turn = 0;
      state.round++;
    } else {
      state.turn++;
    }
  },
  DRAW(state, id) {
    const card = state.deck.shift();
    state.players.forEach((player) => {
      if (player.id === id) {
        player.hand.push(card);
      }
    });
  },
  PLAYCARD(state, payload) {
    state.players.forEach((player) => {
      if (player.id === payload.playerId) {
        const removeIndex = player.hand.map((x) => x.id).indexOf(payload.cardId);
        player.hand.splice(removeIndex, 1);
      }
    });
  },
  MOVEMENT(state, id) {
    state.players.forEach((player) => {
      if (player.id === id) {
        player.movement -= 1;
      }
    });
  },
  ONDESTINATION(state, payload) {
    state.players.forEach((player) => {
      if (player.id === payload.playerId) {
        player.destinations = player.destinations.filter((e) => e !== payload.location);
      }
    });
  },
};

export const actions = {
  createGame({ commit, dispatch, rootGetters }) {
    commit('GAME', {
      gameState: 'created',
      id: rootGetters['auth/user'].id,
    });
    dispatch('setDeck');
  },
  createPlayer({ commit, rootGetters }) {
    commit('ADDPLAYER', {
      id: rootGetters['auth/user'].id,
      name: rootGetters['auth/user'].name,
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
    });
  },
  setDeck({ commit }) {
    const deck = [];
    cards.forEach((card) => {
      if (card.ratio >= 2) {
        for (let i = 0; i < card.ratio; i++) {
          deck.push(card);
        }
      } else {
        deck.push(card);
      }
    });
    commit('DECK', shuffle(deck));
  },
  async startGame({ commit, getters }) {
    await commit('GAMESTATE', 'started');

    commit('SETPLAYERSMETA');
    // Shuffle the players
    commit('GAME', {
      players: shuffle(getters.players),
    });
    commit('SETTURNPOSITION');
    this.$p2p.sendGame();
  },
  patchGame({ commit, getters }, game) {
    commit('GAME', game);
    if (getters.winner) {
      alert(`Winner: ${getters.winner.name}`).then(() => {
        this.$router.push({
          path: '/',
        });
      });
    }
  },
  patchPlayer({ commit, rootGetters }, playerData) {
    commit('PLAYER', {
      id: rootGetters['auth/user'].id,
      player: playerData,
    });
  },
  draw({ commit, getters }) {
    commit('DRAW', getters.player.id);
  },
  playCard({
    state, getters, commit, dispatch,
  }, card) {
    // Stop oponent
    if (card.action.stop) {
      const pickedPlayer = prompt('Pick player');
      const opponent = getters.players.find((player) => player.id === pickedPlayer);

      switch (card.action.stop) {
        case 'fuel':
          commit('PLAYER', {
            id: opponent.id,
            player: { fuel: true },
          });
          break;
        case 'redLight':
          commit('PLAYER', {
            id: opponent.id,
            player: { redLight: true },
          });
          break;
        case 'accident':
          commit('PLAYER', {
            id: opponent.id,
            player: { accident: true },
          });
          break;
        case 'crevaison':
          commit('PLAYER', {
            id: opponent.id,
            player: { crevaison: true },
          });
          break;
        default:
          break;
      }
    }

    // Slowdown opponent
    if (card.action.slow <= 4) {
      const pickedPlayer = prompt('Pick player');
      let opponent = getters.players.find((player) => player.id === pickedPlayer);
      commit('PLAYER', {
        id: opponent.id,
        player: { maxSpeed: card.action.slow },
      });
      opponent = getters.players.find((player) => player.id === pickedPlayer);
      if (opponent.movement > card.action.slow || state.movement > card.action.slow) {
        opponent.movement = card.action.slow;
        commit('PLAYER', {
          id: opponent.id,
          player: { movement: card.action.slow },
        });
      }
    }

    // Unset slowdown
    if (card.action.slow >= 5) {
      dispatch('patchPlayer', { maxSpeed: 5 });
    }

    // Unset stop
    if (card.action.restart) {
      switch (card.action.restart) {
        case 'fuel':
          dispatch('patchPlayer', { fuel: false });
          break;
        case 'redLight':
          dispatch('patchPlayer', { redLight: false });
          break;
        case 'accident':
          dispatch('patchPlayer', { accident: false });
          break;
        case 'crevaison':
          dispatch('patchPlayer', { crevaison: false });
          break;
        default:
          break;
      }
    }

    if (card.action.move) {
      if (card.action.move > state.maxSpeed) {
        dispatch('patchPlayer', { movement: state.maxSpeed });
      } else {
        console.log(card.action.move);
        dispatch('patchPlayer', { movement: card.action.move });
      }
    }

    // remove played card
    commit('PLAYCARD', {
      playerId: getters.player.id,
      cardId: card.id,
    });
  },
  travel({ commit, rootGetters }, playerData) {
    commit('PLAYER', {
      id: rootGetters['auth/user'].id,
      player: playerData,
    });
    commit('MOVEMENT', rootGetters['auth/user'].id);
    commit('ONDESTINATION', {
      playerId: rootGetters['auth/user'].id,
      location: playerData.location,
    });
  },
};
