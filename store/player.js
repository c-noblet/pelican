import { patch } from '../plugins/utils';

export const state = () => ({
  id: null,
  name: null,
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

export const getters = {
  game(state, getters, rootState, rootGetters) {
    return rootGetters['game/game'];
  },
  player(state) {
    return state;
  },
  auth(state, getters, rootState, rootGetters) {
    return rootGetters['auth/user'];
  },
};

export const mutations = {
  PLAYER(state, payload) {
    patch(state, payload);
  },
  LOCATION(state, payload) {
    state.movement--;
    state.location = payload;
  },
  MOVEMENT(state, payload) {
    state.movement = payload;
  },
  DRAW(state, payload) {
    const card = payload.shift();
    state.hand.push(card);
  },
  REMOVECARD(state, payload) {
    const removeIndex = state.hand.map((card) => card.id).indexOf(payload);
    state.hand.splice(removeIndex, 1);
  },
};

export const actions = {
  createPlayer({ commit, getters }) {
    commit('PLAYER', getters.auth);
  },
  playCard({ state, getters, commit }, card) {
    // Stop oponent
    if (card.action.stop) {
      const pickedPlayer = prompt('Pick player');
      const player = getters.game.players.find((player) => player.id === pickedPlayer);

      switch (card.action.stop) {
        case 'fuel':
          player.fuel = true;
          break;
        case 'redLight':
          player.redLight = true;
          break;
        case 'accident':
          player.accident = true;
          break;
        case 'crevaison':
          player.crevaison = true;
          break;
        default:
          break;
      }
    }

    // Slowdown oponent
    if (card.action.slow <= 4) {
      const pickedPlayer = prompt('Pick player');
      const player = getters.game.players.find((player) => player.id === pickedPlayer);
      player.maxSpeed = card.action.slow;
      commit('PLAYER', { maxSpeed: card.action.slow });

      if (player.movement > card.action.slow || state.movement > card.action.slow) {
        player.movement = card.action.slow;
        commit('PLAYER', { movement: card.action.slow });
      }
    }

    // Unset slowdown
    if (card.action.slow >= 5) {
      commit('PLAYER', { maxSpeed: 5 });
    }

    // Unset stop
    if (card.action.restart) {
      switch (card.action.restart) {
        case 'fuel':
          commit('PLAYER', { fuel: false });
          break;
        case 'redLight':
          commit('PLAYER', { redLight: false });
          break;
        case 'accident':
          commit('PLAYER', { accident: false });
          break;
        case 'crevaison':
          commit('PLAYER', { crevaison: false });
          break;
        default:
          break;
      }
    }

    if (card.action.move) {
      if (card.action.move > state.maxSpeed) {
        commit('PLAYER', { movement: state.maxSpeed });
      } else {
        commit('PLAYER', { movement: card.action.move });
      }
    }

    // remove played card
    commit('REMOVECARD', card.id);
  },
  patch({ commit }, player) {
    commit('PLAYER', player);

    commit('game/PLAYER', player, { root: true });
  },
};
